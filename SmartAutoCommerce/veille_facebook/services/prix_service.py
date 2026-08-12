"""
Service Prix — Grille de prix par catégorie/concurrent + fourchette marché.
"""

import math
from collections import defaultdict

from ..mongo_client import get_collection, build_user_filter


def _safe_int(val, default=0):
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _median(values):
    """Calcule la médiane d'une liste de nombres."""
    if not values:
        return 0
    s = sorted(values)
    n = len(s)
    if n % 2 == 1:
        return s[n // 2]
    return (s[n // 2 - 1] + s[n // 2]) / 2


class PrixService:

    @staticmethod
    def get_grille_prix(user_id=None):
        """
        Pour chaque catégorie → par concurrent :
        prix_min, prix_max, prix_median, prix_moyen, nb_produits.
        Exclut les prix=0.
        """
        collection = get_collection()
        docs = list(collection.find({"prix": {"$gt": 0}, **build_user_filter(user_id)}, {
            "categorie": 1, "concurrent": 1, "prix": 1
        }))

        # Structure : { categorie: { concurrent: [prix, ...] } }
        grille = defaultdict(lambda: defaultdict(list))
        for doc in docs:
            cat = doc.get("categorie", "Autre")
            conc = doc.get("concurrent", "inconnu")
            prix = _safe_int(doc.get("prix"))
            if prix > 0:
                grille[cat][conc].append(prix)

        result = []
        for categorie, concurrents in sorted(grille.items()):
            cat_data = {
                "categorie": categorie,
                "concurrents": []
            }
            for concurrent, prix_list in sorted(concurrents.items()):
                cat_data["concurrents"].append({
                    "concurrent": concurrent,
                    "prix_min": min(prix_list),
                    "prix_max": max(prix_list),
                    "prix_median": round(_median(prix_list)),
                    "prix_moyen": round(sum(prix_list) / len(prix_list)),
                    "nb_produits": len(prix_list),
                })
            result.append(cat_data)

        return result

    @staticmethod
    def get_fourchette_marche(categorie, user_id=None):
        """
        Pour une catégorie donnée :
        prix_min_global, prix_max_global, prix_median_global,
        recommandation_prix (= médiane * 0.95, arrondi à 500Ar).
        """
        collection = get_collection()
        docs = list(collection.find(
            {"categorie": categorie, "prix": {"$gt": 0}, **build_user_filter(user_id)},
            {"prix": 1}
        ))

        prix_list = [_safe_int(d.get("prix")) for d in docs if _safe_int(d.get("prix")) > 0]

        if not prix_list:
            return {
                "categorie": categorie,
                "prix_min_global": 0,
                "prix_max_global": 0,
                "prix_median_global": 0,
                "recommandation_prix": 0,
                "nb_produits": 0,
            }

        median_val = _median(prix_list)
        # Arrondi à 500Ar inférieur
        recommandation = math.floor(median_val * 0.95 / 500) * 500

        return {
            "categorie": categorie,
            "prix_min_global": min(prix_list),
            "prix_max_global": max(prix_list),
            "prix_median_global": round(median_val),
            "recommandation_prix": recommandation,
            "nb_produits": len(prix_list),
        }
