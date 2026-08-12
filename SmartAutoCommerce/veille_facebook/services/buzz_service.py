"""
Service Buzz — Produits à fort engagement social.
Accède directement à MongoDB (collection Facebook_data_clean).
"""

import re

from ..mongo_client import get_collection, build_user_filter


def _safe_int(val, default=0):
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _engagement_score(doc):
    """
    Retourne un score d'engagement fiable.
    Si score_engagement est absent/non numérique, calcule un score depuis likes/comments.
    """
    raw_score = doc.get("score_engagement")
    if raw_score not in (None, "", "null"):
        try:
            return float(raw_score)
        except (ValueError, TypeError):
            pass

    likes = _safe_int(doc.get("likes"))
    comments = _safe_int(doc.get("comments"))
    # Les commentaires ont généralement plus de valeur d'engagement.
    return float(likes + (comments * 3))


def _priority_status(doc):
    """
    Retourne un status de priorité non vide.
    Priorité:
    1) Champ priority_status s'il est renseigné
    2) Déduction depuis priority_score
    3) Déduction depuis score_engagement calculé
    """
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


class BuzzService:

    @staticmethod
    def get_top_buzz(limit=20, concurrent=None, categorie=None, status=None, user_id=None):
        """
        Retourne les produits triés par score_engagement décroissant.
        Filtrable par concurrent et priority_status.
        """
        collection = get_collection()
        query = build_user_filter(user_id)

        if concurrent:
            query["concurrent"] = {"$regex": f"^{re.escape(concurrent.strip())}$", "$options": "i"}
        docs = list(collection.find(query))
        if status:
            wanted = str(status).strip().upper()
            docs = [doc for doc in docs if _priority_status(doc) == wanted]
        docs.sort(key=_engagement_score, reverse=True)
        docs = docs[: int(limit)]

        results = []
        for doc in docs:
            results.append({
                "id_unique": doc.get("id_unique"),
                "concurrent": doc.get("concurrent"),
                "produit_nom": doc.get("produit_nom"),
                "prix": _safe_int(doc.get("prix")),
                "categorie": doc.get("categorie", "Autre"),
                "score_engagement": _engagement_score(doc),
                "priority_status": _priority_status(doc),
                "priority_score": _safe_int(doc.get("priority_score")),
                "likes": _safe_int(doc.get("likes")),
                "comments": _safe_int(doc.get("comments")),
                "date_post": str(doc.get("date_post", "")),
                "lien_facebook": doc.get("lien_facebook"),
                "resume_fr": doc.get("resume_fr"),
            })

        return results

    @staticmethod
    def get_stats_globales(user_id=None):
        """
        Retourne les KPIs globaux :
        nb_produits_total, nb_ultra_priority, nb_high,
        score_engagement_max, score_engagement_moyen.
        """
        collection = get_collection()

        base_query = build_user_filter(user_id)
        docs = list(collection.find(base_query, {"score_engagement": 1, "likes": 1, "comments": 1, "priority_score": 1, "priority_status": 1}))
        total = len(docs)
        nb_ultra = sum(1 for doc in docs if _priority_status(doc) == "ULTRA-PRIORITY")
        nb_high = sum(1 for doc in docs if _priority_status(doc) == "HIGH")
        nb_normal = sum(1 for doc in docs if _priority_status(doc) == "NORMAL")
        scores = [_engagement_score(doc) for doc in docs]
        max_score = max(scores) if scores else 0
        avg_score = (sum(scores) / len(scores)) if scores else 0

        return {
            "nb_produits_total": total,
            "nb_ultra_priority": nb_ultra,
            "nb_high": nb_high,
            "nb_normal": nb_normal,
            "score_engagement_max": max_score or 0,
            "score_engagement_moyen": round(avg_score or 0, 1),
        }
