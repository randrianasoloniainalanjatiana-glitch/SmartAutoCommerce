"""
app/services/veille.py
Service de veille concurrentielle — alertes sur prix et notes.
"""

import json
import os
from datetime import datetime
from typing import Optional
from app.models.produit import Produit
from config.settings import Config


class VeilleService:
    """
    Compare les données actuelles à un historique local (JSON)
    et génère des alertes sur les variations significatives.
    """

    def __init__(self, produits: list[Produit], user_id: Optional[str] = None):
        self.produits = produits
        # Historique isolé par utilisateur (un fichier JSON par compte)
        _base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        uid = (user_id or "").strip() or "anonymous"
        safe = "".join(c if c.isalnum() or c in "-_" else "_" for c in str(uid))[:120]
        self._chemin_historique = os.path.join(_base, f"historique_veille_{safe}.json")
        self.historique = self._charger_historique()

    # ── Historique ────────────────────────────────────────────────────────────

    def _charger_historique(self) -> list[dict]:
        if os.path.exists(self._chemin_historique):
            with open(self._chemin_historique, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data:
                    return data
        # Ancien fichier unique (avant historique par compte) — sinon snapshots + alertes + évolution vides
        _base = os.path.dirname(self._chemin_historique)
        legacy = os.path.join(_base, "historique_veille.json")
        if os.path.exists(legacy):
            with open(legacy, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def _sauvegarder_historique(self):
        with open(self._chemin_historique, "w", encoding="utf-8") as f:
            json.dump(self.historique, f, ensure_ascii=False, indent=2)

    def enregistrer_snapshot(self):
        """Sauvegarde le snapshot actuel dans l'historique."""
        snapshot = {
            "date": datetime.now().isoformat(),
            "produits": [
                {
                    "asin":  p.asin,
                    "source_site": getattr(p, "marketplace", "amazon"),
                    "prix":  p.prix_float,
                    "note":  p.note,
                    "avis":  p.avis_int,
                    # Important pour la saisonnalité: on capture la demande "achat/mois" au moment T.
                    # Les anciens snapshots n'auront pas ce champ → fallback à 0 côté analyse.
                    "achats_mensuels": getattr(p, "achats_mensuels", 0) or 0,
                    "categorie": p.categorie,
                    "produit": p.produit[:80],
                }
                for p in self.produits
            ],
        }
        self.historique.append(snapshot)
        # Garde max 90 snapshots
        if len(self.historique) > 90:
            self.historique = self.historique[-90:]
        self._sauvegarder_historique()
        return snapshot

    # ── Alertes ───────────────────────────────────────────────────────────────

    def detecter_alertes(self) -> list[dict]:
        """
        Calcule les alertes uniquement entre les 2 derniers snapshots.

        Important : on ne recalcule pas à partir des valeurs "actuelles" en base.
        Comme ça, si tu automatises `scraping -> capture`, les alertes ne
        changent qu'après la capture suivante.
        """
        if len(self.historique) < 2:
            return []

        avant = self.historique[-2].get("produits", [])
        derni = self.historique[-1].get("produits", [])

        def _key(prod: dict) -> str:
            return f"{prod.get('source_site', 'amazon')}::{prod.get('asin', '')}::{prod.get('categorie', '')}"

        avant_map = {_key(p): p for p in avant if p.get("asin")}
        derni_map = {_key(p): p for p in derni if p.get("asin")}

        alertes: list[dict] = []

        for key, p_last in derni_map.items():
            p_prev = avant_map.get(key)
            asin = p_last.get("asin", "")
            source_site = p_last.get("source_site", "amazon")
            categorie = p_last.get("categorie", "")
            produit_nom = (p_last.get("produit") or "").strip()[:60]

            if not p_prev:
                # On ne génère plus d'alerte pour les nouveaux produits 
                # pour éviter de spammer l'utilisateur après chaque scraping.
                continue

            try:
                prix_prev = float(p_prev.get("prix", 0) or 0)
                prix_last = float(p_last.get("prix", 0) or 0)
            except (TypeError, ValueError):
                prix_prev = 0.0
                prix_last = 0.0

            try:
                note_prev = float(p_prev.get("note", 0) or 0)
                note_last = float(p_last.get("note", 0) or 0)
            except (TypeError, ValueError):
                note_prev = 0.0
                note_last = 0.0

            diff_prix = prix_last - prix_prev
            diff_note = note_last - note_prev

            if diff_prix <= -Config.SEUIL_BAISSE_PRIX:
                alertes.append({
                    "type": "BAISSE_PRIX",
                    "niveau": "success",
                    "asin": asin,
                    "source_site": source_site,
                    "categorie": categorie,
                    "produit": produit_nom,
                    "message": f"Prix : {prix_prev:.2f}€ → {prix_last:.2f}€ ({diff_prix:+.2f}€)",
                })
            elif diff_prix >= Config.SEUIL_HAUSSE_PRIX:
                alertes.append({
                    "type": "HAUSSE_PRIX",
                    "niveau": "danger",
                    "asin": asin,
                    "source_site": source_site,
                    "categorie": categorie,
                    "produit": produit_nom,
                    "message": f"Prix : {prix_prev:.2f}€ → {prix_last:.2f}€ ({diff_prix:+.2f}€)",
                })

            if diff_note <= -Config.SEUIL_BAISSE_NOTE:
                alertes.append({
                    "type": "BAISSE_NOTE",
                    "niveau": "warning",
                    "asin": asin,
                    "source_site": source_site,
                    "categorie": categorie,
                    "produit": produit_nom,
                    "message": f"Note : {note_prev} → {note_last} ({diff_note:+.1f})",
                })

        return alertes

    # ── Évolution ─────────────────────────────────────────────────────────────

    def evolution_prix(self, asin: str, categorie: str = "") -> dict:
        """Retourne l'évolution du prix d'un produit sur l'historique."""
        dates, prix = [], []
        for snap in self.historique:
            for p in snap["produits"]:
                if p["asin"] == asin and (not categorie or p.get("categorie", "") == categorie):
                    dates.append(snap["date"][:10])
                    prix.append(p["prix"])
                    break
        return {"asin": asin, "dates": dates, "prix": prix}

    def evolution_notes(self, asin: str, categorie: str = "") -> dict:
        """Retourne l'évolution de la note d'un produit."""
        dates, notes = [], []
        for snap in self.historique:
            for p in snap["produits"]:
                if p["asin"] == asin and (not categorie or p.get("categorie", "") == categorie):
                    dates.append(snap["date"][:10])
                    notes.append(p["note"])
                    break
        return {"asin": asin, "dates": dates, "notes": notes}

    def saisonnalite_achats(self, asin: str) -> dict:
        """
        Détecte une saisonnalité simple sur `achats_mensuels` à partir des snapshots.

        - Groupe les valeurs par mois (1..12).
        - Calcule moyenne + nb d'observations.
        - Renvoie aussi un score de "force" (0..1) basé sur la dispersion des moyennes mensuelles.
        """
        # month -> list[float]
        buckets: dict[int, list[float]] = {m: [] for m in range(1, 13)}
        for snap in self.historique:
            date_str = (snap.get("date") or "")[:10]  # YYYY-MM-DD
            try:
                month = int(date_str[5:7])
            except Exception:
                continue
            if month < 1 or month > 12:
                continue

            produits = snap.get("produits") or []
            found = False
            for p in produits:
                if (p.get("asin") or "") != asin:
                    continue
                if found:
                    continue  # skip duplicates, keep only first occurrence
                found = True
                try:
                    val = float(p.get("achats_mensuels", 0) or 0)
                except (TypeError, ValueError):
                    val = 0.0
                # On ignore les valeurs négatives (données corrompues)
                if val < 0:
                    val = 0.0
                buckets[month].append(val)
                break

        months = []
        means = []
        for m in range(1, 13):
            vals = buckets[m]
            avg = sum(vals) / len(vals) if vals else 0.0
            months.append({
                "month": m,
                "count": len(vals),
                "avg_achats_mensuels": round(avg, 2),
            })
            means.append(avg)

        # Force saisonnalité: dispersion relative des moyennes mensuelles
        overall = sum(means) / 12.0
        if overall <= 0:
            strength = 0.0
        else:
            var = sum((x - overall) ** 2 for x in means) / 12.0
            stdev = var ** 0.5
            # CV borné grossièrement en 0..1 (au-delà de 100% de CV, on sature).
            strength = min(1.0, stdev / overall) if overall else 0.0

        # Mois de pic
        peak_month = max(range(1, 13), key=lambda m: months[m - 1]["avg_achats_mensuels"])
        trough_month = min(range(1, 13), key=lambda m: months[m - 1]["avg_achats_mensuels"])

        return {
            "asin": asin,
            "metric": "achats_mensuels",
            "months": months,
            "seasonality_strength": round(strength, 3),
            "peak_month": peak_month,
            "trough_month": trough_month,
        }

    def nb_snapshots(self) -> int:
        return len(self.historique)

    def dernier_snapshot(self) -> str:
        if self.historique:
            return self.historique[-1]["date"][:16].replace("T", " ")
        return "Aucun"

    def tout(self) -> dict:
        return {
            "alertes":         self.detecter_alertes(),
            "nb_snapshots":    self.nb_snapshots(),
            "dernier_snapshot": self.dernier_snapshot(),
            "produits":        [p.to_dict() for p in self.produits],
            "asins":           [p.asin for p in self.produits],
        }
