"""
Service Catalogue — Opportunités de sourcing, produits stars, produits à éviter.
Basé sur les données d'engagement Facebook (demande locale à Madagascar).
"""

from collections import defaultdict

from ..mongo_client import get_collection, build_user_filter


def _safe_int(val, default=0):
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _engagement_score(doc):
    raw_score = doc.get("score_engagement")
    if raw_score not in (None, "", "null"):
        try:
            return float(raw_score)
        except (ValueError, TypeError):
            pass
    likes = _safe_int(doc.get("likes"))
    comments = _safe_int(doc.get("comments"))
    return float(likes + (comments * 3))


def _priority_status(doc):
    raw = str(doc.get("priority_status") or "").strip().upper()
    if raw:
        return raw
    priority_score = _safe_int(doc.get("priority_score"))
    if priority_score >= 2500:
        return "ULTRA-PRIORITY"
    if priority_score >= 1000:
        return "HIGH"
    score = _engagement_score(doc)
    if score >= 2500:
        return "ULTRA-PRIORITY"
    if score >= 1000:
        return "HIGH"
    return "NORMAL"


def _demand_score(doc):
    """
    Score de demande robuste:
    - utilise priority_score si disponible/valide
    - sinon retombe sur score d'engagement calculé
    """
    priority_score = _safe_int(doc.get("priority_score"))
    if priority_score > 0:
        return priority_score
    return int(round(_engagement_score(doc)))


class CatalogueService:

    @staticmethod
    def get_opportunites_sourcing(user_id=None):
        """
        Identifie les produits avec priority_score > 1000, les groupe par catégorie.
        Pour chaque catégorie :
        - nb_posts_total, score_demande_moyen, prix_local_moyen/min/max,
        - concurrent_dominant, meilleur_produit, recommandation.
        """
        collection = get_collection()
        docs = list(collection.find(
            build_user_filter(user_id),
            {
                "categorie": 1, "concurrent": 1, "produit_nom": 1,
                "prix": 1, "priority_score": 1, "score_engagement": 1,
                "likes": 1, "comments": 1
            }
        ))
        # Filtre robuste en Python (priority_score peut être absent/texte)
        docs = [doc for doc in docs if _demand_score(doc) > 1000]

        groups = defaultdict(list)
        for doc in docs:
            cat = doc.get("categorie", "Autre")
            groups[cat].append(doc)

        result = []
        for categorie, items in sorted(groups.items()):
            n = len(items)

            # Scores de demande (priority_score ou fallback engagement)
            scores = [_demand_score(d) for d in items]
            score_moyen = round(sum(scores) / n) if n else 0

            # Prix (hors 0)
            prix_list = [_safe_int(d.get("prix")) for d in items if _safe_int(d.get("prix")) > 0]
            prix_moyen = round(sum(prix_list) / len(prix_list)) if prix_list else 0
            prix_min = min(prix_list) if prix_list else 0
            prix_max = max(prix_list) if prix_list else 0

            # Concurrent dominant
            conc_count = defaultdict(int)
            for d in items:
                conc_count[d.get("concurrent", "inconnu")] += 1
            concurrent_dominant = max(conc_count, key=conc_count.get) if conc_count else "—"

            # Meilleur produit (score_engagement le plus élevé)
            best = max(items, key=_engagement_score)
            meilleur_produit = {
                "produit_nom": best.get("produit_nom"),
                "score_engagement": _engagement_score(best),
                "concurrent": best.get("concurrent"),
                "prix": _safe_int(best.get("prix")),
            }

            # Recommandation
            if score_moyen > 2000:
                recommandation = "SOURCER EN PRIORITÉ"
            elif score_moyen >= 1000:
                recommandation = "À CONSIDÉRER"
            else:
                recommandation = "SURVEILLER"

            result.append({
                "categorie": categorie,
                "nb_posts_total": n,
                "score_demande_moyen": score_moyen,
                "prix_local_moyen": prix_moyen,
                "prix_local_min": prix_min,
                "prix_local_max": prix_max,
                "concurrent_dominant": concurrent_dominant,
                "meilleur_produit": meilleur_produit,
                "recommandation": recommandation,
            })

        # Trier par score_demande_moyen décroissant
        result.sort(key=lambda x: x["score_demande_moyen"], reverse=True)
        return result

    @staticmethod
    def get_produits_stars(user_id=None):
        """
        Produits avec priority_score > 2500 ET prix entre 3000 et 100000 Ar.
        Ce sont les produits à fort potentiel commercial immédiat.
        """
        collection = get_collection()
        docs = list(collection.find(build_user_filter(user_id)))
        # Filtre robuste en Python:
        # - score élevé (priority_score ou fallback engagement)
        # - prix dans la fourchette locale
        docs = [
            doc for doc in docs
            if _demand_score(doc) > 2500 and 3000 <= _safe_int(doc.get("prix")) <= 100000
        ]
        docs.sort(key=_engagement_score, reverse=True)

        result = []
        for doc in docs:
            result.append({
                "id_unique": doc.get("id_unique"),
                "concurrent": doc.get("concurrent"),
                "produit_nom": doc.get("produit_nom"),
                "prix": _safe_int(doc.get("prix")),
                "categorie": doc.get("categorie", "Autre"),
                "score_engagement": _engagement_score(doc),
                "priority_score": _demand_score(doc),
                "priority_status": _priority_status(doc),
                "likes": _safe_int(doc.get("likes")),
                "comments": _safe_int(doc.get("comments")),
                "date_post": str(doc.get("date_post", "")),
                "lien_facebook": doc.get("lien_facebook"),
                "resume_fr": doc.get("resume_fr"),
            })

        return result

    @staticmethod
    def get_produits_a_eviter(user_id=None):
        """
        Catégories avec score_demande_moyen < 500 ou nb_posts_total < 2,
        c'est-à-dire peu d'intérêt détecté sur le marché.
        """
        collection = get_collection()
        docs = list(collection.find(build_user_filter(user_id), {
            "categorie": 1, "priority_score": 1, "score_engagement": 1, "likes": 1, "comments": 1
        }))

        groups = defaultdict(list)
        for doc in docs:
            cat = doc.get("categorie", "Autre")
            groups[cat].append(_demand_score(doc))

        result = []
        for categorie, scores in sorted(groups.items()):
            n = len(scores)
            score_moyen = round(sum(scores) / n) if n else 0

            if score_moyen < 500 or n < 2:
                result.append({
                    "categorie": categorie,
                    "nb_posts_total": n,
                    "score_demande_moyen": score_moyen,
                    "raison": "Faible demande" if score_moyen < 500 else "Trop peu de données",
                })

        return result
