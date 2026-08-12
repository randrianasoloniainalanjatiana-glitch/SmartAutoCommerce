"""
app/services/comparateur.py
Service de comparaison et recommandation de produits.
"""

from app.models.produit import Produit
from config.settings import Config


class ComparateurService:
    """
    Filtre, trie et recommande des produits selon divers critères.
    Utilise un score composite normalisé.
    """

    def __init__(self, produits: list[Produit]):
        self.produits = produits
        # Pré-calcul des listes pour la normalisation (une seule fois)
        self._notes  = [p.note          for p in produits]
        self._avis   = [p.avis_int      for p in produits]
        self._achats = [p.achats_mensuels for p in produits]

    # ── Normalisation ─────────────────────────────────────────────────────────

    def _norm(self, val: float, lst: list[float]) -> float:
        mn, mx = min(lst, default=0), max(lst, default=1)
        return (val - mn) / (mx - mn) if mx != mn else 0.5

    def _score_popularite(self, produit: Produit) -> float:
        """Score composite : note, avis, achats mensuels (échelle 0-1)."""
        n = self._norm(produit.note,          self._notes)
        a = self._norm(produit.avis_int,      self._avis)
        m = self._norm(produit.achats_mensuels, self._achats)
        score = 0.5 * n + 0.3 * a + 0.2 * m
        return round(score, 4)

    # ── Filtres ───────────────────────────────────────────────────────────────

    def filtrer(
        self,
        categorie:   str   = None,
        source_site: str   = None,
        budget_max:  float = None,
        note_min:    float = 0.0,
        recherche:   str   = None,
    ) -> list[Produit]:
        res = self.produits[:]

        if categorie:
            res = [p for p in res if p.categorie.lower() == categorie.lower()]
        if source_site:
            wanted = source_site.strip().lower()
            res = [p for p in res if getattr(p, "marketplace", "").lower() == wanted]
        if budget_max is not None:
            res = [p for p in res if p.prix_float <= budget_max]
        if note_min:
            res = [p for p in res if p.note >= note_min]
        if recherche:
            kw = recherche.lower()
            res = [p for p in res if kw in p.produit.lower() or kw in p.categorie.lower()]

        return res

    # ── Tri ───────────────────────────────────────────────────────────────────

    def trier(
        self,
        produits: list[Produit],
        critere:  str  = "popularite",
        asc:      bool = False,
    ) -> list[Produit]:
        cles = {
            "prix":       lambda p: p.prix_float,
            "note":       lambda p: p.note,
            "avis":       lambda p: p.avis_int,
            "popularite": lambda p: self._score_popularite(p),
            "rapport_qp": lambda p: p.rapport_qualite_prix,
        }
        key = cles.get(critere, cles["popularite"])
        return sorted(produits, key=key, reverse=not asc)

    # ── Recommandation ────────────────────────────────────────────────────────

    def recommander(
        self,
        categorie:  str   = None,
        source_site: str  = None,
        budget_max: float = None,
        note_min:   float = 4.0,
        top_n:      int   = 5,
    ) -> list[dict]:
        """Retourne les top_n produits avec leur score."""
        produits = self.filtrer(
            categorie=categorie,
            source_site=source_site,
            budget_max=budget_max,
            note_min=note_min,
        )
        produits = self.trier(produits, critere="popularite")[:top_n]

        resultats = []
        for p in produits:
            d = p.to_dict()
            d["score_popularite"] = round(self._score_popularite(p) * 100, 2)
            resultats.append(d)
        return resultats

    def meilleur_par_categorie(self) -> dict[str, dict]:
        """Retourne le meilleur produit de chaque catégorie."""
        categories = set(p.categorie for p in self.produits)
        result = {}
        for cat in sorted(categories):
            prods_cat = [p for p in self.produits if p.categorie == cat]
            if prods_cat:
                meilleur = self.trier(prods_cat, critere="popularite")[0]
                d = meilleur.to_dict()
                d["score"] = round(self._score_popularite(meilleur) * 100, 2)
                result[cat] = d
        return result

    def comparer_deux(self, asin1: str, asin2: str) -> dict:
        """Compare deux produits côte à côte."""
        p1 = next((p for p in self.produits if p.asin == asin1), None)
        p2 = next((p for p in self.produits if p.asin == asin2), None)
        if not p1 or not p2:
            return {"erreur": "Produit(s) introuvable(s)"}
        d1, d2 = p1.to_dict(), p2.to_dict()
        d1["score"] = round(self._score_popularite(p1) * 100, 2)
        d2["score"] = round(self._score_popularite(p2) * 100, 2)
        return {"produit1": d1, "produit2": d2, "gagnant": asin1 if d1["score"] >= d2["score"] else asin2}
