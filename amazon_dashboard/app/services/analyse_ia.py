"""
app/services/analyse_ia.py
Analyse comparative inter-marketplaces via OpenAI (GPT-4o).
"""

from __future__ import annotations

import json
from typing import Any, Optional

from openai import OpenAI

from app.models.produit import Produit
from config.settings import Config


class AnalyseIAService:
    """Compare deux produits e-commerce avec un modèle OpenAI."""

    def __init__(self):
        self._client: Optional[OpenAI] = None

    @property
    def est_configure(self) -> bool:
        return bool(Config.OPENAI_API_KEY)

    def _client_openai(self) -> OpenAI:
        if not self.est_configure:
            raise ValueError(
                "Clé OpenAI absente. Définissez OPENAI_API_KEY dans amazon_dashboard/.env"
            )
        if self._client is None:
            self._client = OpenAI(api_key=Config.OPENAI_API_KEY)
        return self._client

    @staticmethod
    def _produit_payload(p: Produit) -> dict[str, Any]:
        d = p.to_dict()
        return {
            "asin": d.get("asin"),
            "nom": d.get("produit"),
            "categorie": d.get("categorie"),
            "marketplace": d.get("source_site"),
            "prix": d.get("prix"),
            "prix_numerique": d.get("prix_float"),
            "note": d.get("note"),
            "nb_avis": d.get("avis_int"),
            "achats_mensuels": d.get("achats_mensuels"),
            "rapport_qualite_prix": d.get("rapport_qp"),
            "popularite_dernier_achat": d.get("last_bought"),
            "lien": d.get("lien"),
        }

    def analyser_comparaison(self, p1: Produit, p2: Produit) -> dict[str, Any]:
        """Appelle GPT-4o et retourne une analyse structurée."""
        site1 = (p1.marketplace or "").lower()
        site2 = (p2.marketplace or "").lower()

        payload = {
            "produit_1": self._produit_payload(p1),
            "produit_2": self._produit_payload(p2),
            "consigne": (
                "Comparer pour un vendeur e-commerce qui choisit une référence à sourcer. "
                "Tenir compte du prix, des avis, de la popularité et du rapport qualité/prix. "
                "Mentionner les écarts entre plateformes (devise, confiance acheteur, logistique)."
            ),
        }

        system = (
            "Tu es un expert e-commerce et sourcing produit. "
            "Tu réponds UNIQUEMENT en JSON valide, en français, sans markdown."
        )
        user = (
            "Analyse ces deux produits issus de marketplaces différentes et renvoie ce JSON :\n"
            "{\n"
            '  "resume": "2-3 phrases de synthèse",\n'
            '  "verdict": "produit_1" | "produit_2" | "equilibre",\n'
            '  "verdict_texte": "phrase complète du verdict pour l\'utilisateur (qui gagne et pourquoi)",\n'
            '  "gagnant_label": "nom court du produit recommandé ou Équilibre",\n'
            '  "score_confiance": 0-100,\n'
            '  "points_forts_produit_1": ["...", "..."],\n'
            '  "points_forts_produit_2": ["...", "..."],\n'
            '  "risques": ["..."],\n'
            '  "recommandation": "conseil actionnable pour le vendeur"\n'
            "}\n\n"
            f"Données :\n{json.dumps(payload, ensure_ascii=False, indent=2)}"
        )

        client = self._client_openai()
        completion = client.chat.completions.create(
            model=Config.OPENAI_MODEL,
            temperature=0.4,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )

        raw = (completion.choices[0].message.content or "").strip()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            return {
                "erreur": "Réponse IA invalide",
                "detail": str(exc),
                "brut": raw[:500],
            }

        parsed["modele"] = Config.OPENAI_MODEL
        parsed["produit_1"] = payload["produit_1"]
        parsed["produit_2"] = payload["produit_2"]
        return parsed
