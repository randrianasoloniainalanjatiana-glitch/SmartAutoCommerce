"""
app/services/sourcing.py
Service de scoring et recommandation pour le sourcing produit.
"""

from dataclasses import dataclass, field
from app.models.produit import Produit
from config.settings import Config


@dataclass
class ProfilSourcing:
    """Résultat d'analyse de sourcing pour un produit."""
    asin:            str
    produit:         str
    categorie:       str
    prix:            float
    note:            float
    nb_avis:         int
    achats_mensuels: int
    rapport_qp:      float
    score_global:    float
    recommande:      bool
    raisons:         list = field(default_factory=list)
    lien:            str  = ""
    image_url:       str  = ""
    source_site:     str  = "amazon"

    def to_dict(self) -> dict:
        return self.__dict__.copy()


class SourcingService:
    """
    Calcule le score de potentiel commercial de chaque produit
    et identifie les meilleures opportunités de sourcing.
    """

    def __init__(self, produits: list[Produit]):
        self.produits = produits
        self.poids    = Config.POIDS_SCORE
        # Pré-calcul des listes pour la normalisation (une seule fois, pas N fois)
        self._notes  = [p.note               for p in produits]
        self._avis   = [p.avis_int           for p in produits]
        self._achats = [p.achats_mensuels    for p in produits]
        self._qp     = [p.rapport_qualite_prix for p in produits]

    def _norm(self, val: float, lst: list[float]) -> float:
        mn, mx = min(lst, default=0), max(lst, default=1)
        return (val - mn) / (mx - mn) if mx != mn else 0.5

    def _calculer_score(self, produit: Produit) -> float:
        """Score pondéré normalisé sur l'ensemble du catalogue (échelle 0-1)."""
        score = (
            self.poids["note"]        * self._norm(produit.note,                 self._notes)  +
            self.poids["volume_avis"] * self._norm(produit.avis_int,             self._avis)   +
            self.poids["achats"]      * self._norm(produit.achats_mensuels,      self._achats) +
            self.poids["rapport_qp"]  * self._norm(produit.rapport_qualite_prix, self._qp)
        )
        return round(score, 4)

    def _construire_raisons(self, produit: Produit, score: float) -> list[str]:
        raisons = []
        if produit.note >= 4.5:
            raisons.append(f"Excellente note ({produit.note}/5)")
        if produit.avis_int >= 10_000:
            raisons.append(f"Très fort volume d'avis ({produit.avis_int:,})".replace(",", " "))
        if produit.achats_mensuels >= 500:
            raisons.append(f"Forte demande ({produit.achats_mensuels}+ achats/mois)")
        if produit.rapport_qualite_prix >= 0.2:
            raisons.append(f"Bon rapport qualité/prix ({produit.rapport_qualite_prix:.2f})")
        if score < Config.SEUIL_RECOMMANDE:
            raisons.append("Score insuffisant pour recommandation directe")
        return raisons

    def analyser(self) -> list[ProfilSourcing]:
        """Analyse tous les produits et retourne les profils triés."""
        profils = []
        for p in self.produits:
            score = self._calculer_score(p)
            recommande = (
                score >= Config.SEUIL_RECOMMANDE
                and p.note >= Config.SEUIL_NOTE_MIN
                and p.avis_int >= Config.SEUIL_AVIS_MIN
            )
            profils.append(ProfilSourcing(
                asin=p.asin,
                produit=p.produit,
                categorie=p.categorie,
                prix=p.prix_float,
                note=p.note,
                nb_avis=p.avis_int,
                achats_mensuels=p.achats_mensuels,
                rapport_qp=p.rapport_qualite_prix,
                score_global=round(score * 100, 2),
                recommande=recommande,
                raisons=self._construire_raisons(p, score),
                lien=p.lien,
                image_url=p.image_url,
                source_site=getattr(p, "marketplace", "amazon"),
            ))
        return sorted(profils, key=lambda x: x.score_global, reverse=True)

    def opportunites(self) -> list[dict]:
        """Retourne uniquement les produits recommandés."""
        return [p.to_dict() for p in self.analyser() if p.recommande]

    def chart_scores(self) -> dict:
        """Données pour le graphique de scores (Chart.js), limité aux 30 meilleurs pour la perf."""
        profils = self.analyser()[:30]
        return {
            "labels":     [p.produit[:30] + "…" for p in profils],
            "scores":     [p.score_global for p in profils],
            "recommandes": [p.recommande for p in profils],
            "categories": [p.categorie for p in profils],
        }

    def tout(self) -> dict:
        from app.services.potentiel_futur import PotentielFuturService

        profils  = self.analyser()
        futur_list = PotentielFuturService(
            self.produits, profils_sourcing=profils
        ).analyser()
        return {
            "profils":      [p.to_dict() for p in profils],
            "opportunites": [p.to_dict() for p in profils if p.recommande],
            "chart_scores": self.chart_scores(),
            "nb_recommandes": sum(1 for p in profils if p.recommande),
            "score_max":    max((p.score_global for p in profils), default=0),
            "potentiel_futur": [p.to_dict() for p in futur_list],
            "nb_potentiel_futur": len(futur_list),
            "score_potentiel_futur_max": max(
                (p.score_potentiel_futur for p in futur_list), default=0,
            ),
        }
