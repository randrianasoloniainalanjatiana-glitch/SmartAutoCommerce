"""
SmartMarketWatch: vue consolidée multi-marketplace.
"""

from collections import defaultdict
from dataclasses import dataclass

from app.models.produit import Produit


@dataclass
class SmartMarketWatchService:
    produits: list[Produit]

    def _stats_globales(self) -> dict:
        prix = [p.prix_float for p in self.produits if p.prix_float > 0]
        notes = [p.note for p in self.produits if p.note > 0]
        return {
            "nb_produits": len(self.produits),
            "nb_marketplaces": len({p.marketplace for p in self.produits}),
            "prix_moyen": round(sum(prix) / len(prix), 2) if prix else 0.0,
            "note_moyenne": round(sum(notes) / len(notes), 2) if notes else 0.0,
        }

    def _stats_par_marketplace(self) -> list[dict]:
        grouped: dict[str, list[Produit]] = defaultdict(list)
        for p in self.produits:
            grouped[p.marketplace].append(p)

        out = []
        for market, produits in grouped.items():
            prix = [p.prix_float for p in produits if p.prix_float > 0]
            notes = [p.note for p in produits if p.note > 0]
            avis = [p.avis_int for p in produits]
            out.append(
                {
                    "source_site": market,
                    "nb_produits": len(produits),
                    "prix_moyen": round(sum(prix) / len(prix), 2) if prix else 0.0,
                    "note_moyenne": round(sum(notes) / len(notes), 2) if notes else 0.0,
                    "avis_moyens": round(sum(avis) / len(avis), 1) if avis else 0.0,
                }
            )
        return sorted(out, key=lambda x: x["nb_produits"], reverse=True)

    def _top_cross_market(self, top_n: int) -> list[dict]:
        ranked = sorted(
            self.produits,
            key=lambda p: (p.note, p.avis_int, p.achats_mensuels),
            reverse=True,
        )
        return [p.to_dict() for p in ranked[:top_n]]

    def _opportunites_prix(self, top_n: int) -> list[dict]:
        by_cat: dict[str, list[Produit]] = defaultdict(list)
        for p in self.produits:
            if p.prix_float > 0:
                by_cat[p.categorie or "Autres"].append(p)

        out = []
        for categorie, produits in by_cat.items():
            markets = {p.marketplace for p in produits}
            if len(markets) < 2:
                continue
            p_min = min(produits, key=lambda p: p.prix_float)
            p_max = max(produits, key=lambda p: p.prix_float)
            gap = round(p_max.prix_float - p_min.prix_float, 2)
            if gap <= 0:
                continue
            out.append(
                {
                    "categorie": categorie,
                    "prix_min": p_min.prix_float,
                    "market_min": p_min.marketplace,
                    "asin_min": p_min.asin,
                    "prix_max": p_max.prix_float,
                    "market_max": p_max.marketplace,
                    "asin_max": p_max.asin,
                    "ecart_prix": gap,
                }
            )
        out.sort(key=lambda x: x["ecart_prix"], reverse=True)
        return out[:top_n]

    def tableau_bord(self, top_n: int = 10) -> dict:
        return {
            "kpis": self._stats_globales(),
            "marketplaces": self._stats_par_marketplace(),
            "top_produits_cross_market": self._top_cross_market(top_n=top_n),
            "opportunites_prix": self._opportunites_prix(top_n=top_n),
        }
