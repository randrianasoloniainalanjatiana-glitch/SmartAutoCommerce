"""
Potentiel « tendance / futur » — heuristique sur le catalogue.

Construit une shortlist de produits ayant une forte probabilité de vente
future selon des signaux internes (qualité, traction d'avis, penetration
actuelle). Ce n’est pas une prévision de recherches réelles.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.models.produit import Produit
from config.settings import Config


@dataclass
class ProfilPotentielFutur:
    asin: str
    produit: str
    categorie: str
    prix: float
    note: float
    nb_avis: int
    achats_mensuels: int
    rapport_qp: float
    score_potentiel_futur: float
    score_sourcing_actuel: float
    recommande_classique: bool
    signaux: list[str] = field(default_factory=list)
    lien: str = ""
    image_url: str = ""
    source_site: str = "amazon"

    def to_dict(self) -> dict:
        return self.__dict__.copy()


class PotentielFuturService:
    """
    Score dédié aux profils « peu vendeurs aujourd’hui, qualité / traction
    compatible avec une demande plus forte demain » (signal composite).
    """

    def __init__(
        self,
        produits: list[Produit],
        profils_sourcing: list | None = None,
    ):
        self.produits = produits
        self._profils_sourcing = profils_sourcing
        # Pré-calcul pour éviter O(N²)
        self._notes = [x.note for x in produits]
        self._qp    = [x.rapport_qualite_prix for x in produits]

    def _norm(self, val: float, lst: list[float]) -> float:
        mn, mx = min(lst, default=0), max(lst, default=1)
        return (val - mn) / (mx - mn) if mx != mn else 0.5


    def _courbe_avis_emergents(self, avis: int) -> float:
        """Faveur une fenêtre d’avis « en croissance » sans être saturation (0 avis = score bas mais non nul)."""
        if avis <= 0:
            return 0.04
        if avis < Config.FUTUR_AVIS_MIN:
            return 0.04 + 0.31 * (avis / Config.FUTUR_AVIS_MIN)
        lo, hi = 120, 8000
        sat = 45_000
        if avis <= lo:
            return 0.35 + 0.65 * (avis - Config.FUTUR_AVIS_MIN) / max(1, lo - Config.FUTUR_AVIS_MIN)
        if avis <= hi:
            return 1.0
        if avis >= sat:
            return 0.15
        return 1.0 - 0.85 * (avis - hi) / (sat - hi)

    def _signaux(
        self,
        p: Produit,
        achats_norm: float,
        avis_curve: float,
    ) -> list[str]:
        out: list[str] = []
        if p.note >= 4.35:
            out.append("Très bonne note : enthousiasme des premiers acheteurs")
        elif p.note >= Config.FUTUR_NOTE_MIN:
            out.append("Note solide avant effet de masse sur le volume")
        elif p.note > 0:
            out.append("Note modérée : moins typique du profil « coup de cœur anticipé »")

        if p.avis_int < Config.FUTUR_AVIS_MIN:
            out.append("Peu d’avis : signal de traction encore faible sur cette fiche")
        if achats_norm > Config.FUTUR_ACHATS_NORM_MAX:
            out.append("Achats récents déjà élevés vs ton catalogue : profil plutôt « actuel » que « avant masse »")
        elif achats_norm <= 0.28:
            out.append("Achats récents faibles vs le reste du catalogue : faible pénétration actuelle")
        elif achats_norm <= Config.FUTUR_ACHATS_NORM_MAX:
            out.append("Demande actuelle encore modeste : pas encore un best-seller médiatique")

        if avis_curve >= 0.92:
            out.append("Volume d’avis cohérent avec une phase montante (ni inconnu ni saturé)")
        elif avis_curve >= 0.55:
            out.append("Historique d’avis compatible avec une prise d’ampleur progressive")
        elif p.avis_int >= Config.FUTUR_AVIS_MIN:
            out.append("Volume d’avis : segment analysé pour saturation / marge de notoriété")

        if p.rapport_qualite_prix >= 0.18:
            out.append("Bon rapport qualité / prix : favorable au bouche-à-oreille")

        if len(out) == 0:
            out.append("Profil calculé sur tous les critères ; score à comparer au reste du classement.")
        return out[:6]

    def _score_fut_brut(self, p: Produit, achats_norm: float, avis_curve: float) -> float:
        """Score 0–1 pour classer les candidats « futur »."""
        s_note = self._norm(p.note, self._notes)
        s_qp = self._norm(p.rapport_qualite_prix, self._qp)
        s_penetration = 1.0 - achats_norm

        w = Config.POIDS_SCORE_FUTUR
        score = (
            w["note"] * s_note
            + w["qp"] * s_qp
            + w["faible_penetration"] * s_penetration
            + w["avis_emergents"] * avis_curve
        )
        return round(score, 4)

    def analyser(self) -> list[ProfilPotentielFutur]:
        if not self.produits:
            return []

        if self._profils_sourcing is not None:
            profils = self._profils_sourcing
        else:
            from app.services.sourcing import SourcingService

            profils = SourcingService(self.produits).analyser()
        by_asin = {pr.asin: pr for pr in profils}
        achats = [float(p.achats_mensuels) for p in self.produits]

        result: list[ProfilPotentielFutur] = []
        for p in self.produits:
            pr = by_asin.get(p.asin)
            achats_norm = self._norm(float(p.achats_mensuels), achats)
            avis_curve = self._courbe_avis_emergents(p.avis_int)
            brut = self._score_fut_brut(p, achats_norm, avis_curve)

            # Garde uniquement les profils avec un vrai potentiel futur.
            if (
                p.note < Config.FUTUR_NOTE_MIN
                or p.avis_int < Config.FUTUR_AVIS_MIN
                or achats_norm > Config.FUTUR_ACHATS_NORM_MAX
                or brut < Config.FUTUR_SCORE_MIN
            ):
                continue

            result.append(
                ProfilPotentielFutur(
                    asin=p.asin,
                    produit=p.produit,
                    categorie=p.categorie,
                    prix=p.prix_float,
                    note=p.note,
                    nb_avis=p.avis_int,
                    achats_mensuels=p.achats_mensuels,
                    rapport_qp=p.rapport_qualite_prix,
                    score_potentiel_futur=round(brut * 100, 2),
                    score_sourcing_actuel=round(pr.score_global * 100, 2) if pr else 0.0,
                    recommande_classique=pr.recommande if pr else False,
                    signaux=self._signaux(p, achats_norm, avis_curve),
                    lien=p.lien,
                    image_url=p.image_url,
                    source_site=getattr(p, "marketplace", "amazon"),
                )
            )

        sorted_result = sorted(result, key=lambda x: x.score_potentiel_futur, reverse=True)
        if Config.FUTUR_TOP_MAX > 0:
            return sorted_result[: Config.FUTUR_TOP_MAX]
        return sorted_result
