"""
Service Engagement — Stats d'engagement par concurrent, catégorie et corrélation prix/engagement.
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


class EngagementService:

    @staticmethod
    def get_stats_par_concurrent(user_id=None):
        """
        Par concurrent : nb_posts, likes_moyen, comments_moyen,
        score_engagement_moyen, nb_ultra, nb_high, nb_normal.
        """
        collection = get_collection()
        docs = list(collection.find(build_user_filter(user_id), {
            "concurrent": 1, "likes": 1, "comments": 1,
            "score_engagement": 1, "priority_status": 1, "priority_score": 1
        }))

        groups = defaultdict(list)
        for doc in docs:
            conc = doc.get("concurrent", "inconnu")
            groups[conc].append(doc)

        result = []
        for concurrent, items in sorted(groups.items()):
            likes = [_safe_int(d.get("likes")) for d in items]
            comments = [_safe_int(d.get("comments")) for d in items]
            scores = [_engagement_score(d) for d in items]
            n = len(items)

            result.append({
                "concurrent": concurrent,
                "nb_posts": n,
                "likes_moyen": round(sum(likes) / n, 1) if n else 0,
                "comments_moyen": round(sum(comments) / n, 1) if n else 0,
                "score_engagement_moyen": round(sum(scores) / n, 1) if n else 0,
                "nb_ultra": sum(1 for d in items if _priority_status(d) == "ULTRA-PRIORITY"),
                "nb_high": sum(1 for d in items if _priority_status(d) == "HIGH"),
                "nb_normal": sum(1 for d in items if _priority_status(d) == "NORMAL"),
            })

        return result

    @staticmethod
    def get_stats_par_categorie(user_id=None):
        """
        Par catégorie : score_engagement_moyen, nb_posts,
        prix_moyen, concurrent_dominant.
        """
        collection = get_collection()
        docs = list(collection.find(build_user_filter(user_id), {
            "categorie": 1, "concurrent": 1, "prix": 1,
            "score_engagement": 1, "likes": 1, "comments": 1
        }))

        groups = defaultdict(list)
        for doc in docs:
            cat = doc.get("categorie", "Autre")
            groups[cat].append(doc)

        result = []
        for categorie, items in sorted(groups.items()):
            scores = [_engagement_score(d) for d in items]
            prix_list = [_safe_int(d.get("prix")) for d in items if _safe_int(d.get("prix")) > 0]
            n = len(items)

            # Concurrent dominant = celui qui poste le plus
            conc_count = defaultdict(int)
            for d in items:
                conc_count[d.get("concurrent", "inconnu")] += 1
            concurrent_dominant = max(conc_count, key=conc_count.get) if conc_count else "—"

            result.append({
                "categorie": categorie,
                "score_engagement_moyen": round(sum(scores) / n, 1) if n else 0,
                "nb_posts": n,
                "prix_moyen": round(sum(prix_list) / len(prix_list)) if prix_list else 0,
                "concurrent_dominant": concurrent_dominant,
            })

        return result

    @staticmethod
    def get_correlation_prix_engagement(user_id=None):
        """
        Segmente en 4 tranches de prix :
        0-10000Ar, 10000-50000Ar, 50000-200000Ar, 200000+Ar
        → engagement_moyen, nb_posts par tranche.
        """
        collection = get_collection()
        docs = list(collection.find({"prix": {"$gt": 0}, **build_user_filter(user_id)}, {
            "prix": 1, "score_engagement": 1, "likes": 1, "comments": 1
        }))

        tranches = [
            {"label": "0 - 10 000 Ar", "min": 0, "max": 10000, "scores": []},
            {"label": "10 000 - 50 000 Ar", "min": 10000, "max": 50000, "scores": []},
            {"label": "50 000 - 200 000 Ar", "min": 50000, "max": 200000, "scores": []},
            {"label": "200 000+ Ar", "min": 200000, "max": float("inf"), "scores": []},
        ]

        for doc in docs:
            prix = _safe_int(doc.get("prix"))
            score = _engagement_score(doc)
            for t in tranches:
                if t["min"] <= prix < t["max"]:
                    t["scores"].append(score)
                    break

        result = []
        for t in tranches:
            n = len(t["scores"])
            result.append({
                "tranche": t["label"],
                "engagement_moyen": round(sum(t["scores"]) / n, 1) if n else 0,
                "nb_posts": n,
            })

        return result
