"""
Service Tendances — Fréquence de publication, lancements récents, produits émergents.
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone

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


def _parse_date(val):
    """Parse une date depuis un string ISO ou un datetime."""
    if isinstance(val, datetime):
        return val
    if not val:
        return None
    try:
        s = str(val).replace("Z", "+00:00")
        return datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return None


class TendancesService:

    @staticmethod
    def get_frequence_publication(user_id=None):
        """
        Par concurrent : nb_posts_par_semaine_moyen, jours_actifs,
        heure_pic, mois_le_plus_actif.
        """
        collection = get_collection()
        docs = list(collection.find(build_user_filter(user_id), {
            "concurrent": 1, "date_post": 1
        }))

        groups = defaultdict(list)
        for doc in docs:
            conc = doc.get("concurrent", "inconnu")
            dt = _parse_date(doc.get("date_post"))
            if dt:
                groups[conc].append(dt)

        result = []
        for concurrent, dates in sorted(groups.items()):
            if not dates:
                continue

            nb_posts = len(dates)

            # Calcul de la plage en semaines
            dates_sorted = sorted(dates)
            delta = (dates_sorted[-1] - dates_sorted[0]).days
            nb_semaines = max(delta / 7, 1)
            posts_par_semaine = round(nb_posts / nb_semaines, 2)

            # Jours actifs (0=lundi ... 6=dimanche)
            jour_count = defaultdict(int)
            heure_count = defaultdict(int)
            mois_count = defaultdict(int)

            for dt in dates:
                jour_count[dt.weekday()] += 1
                heure_count[dt.hour] += 1
                mois_count[dt.month] += 1

            jours_actifs = sorted(jour_count.keys(), key=lambda j: jour_count[j], reverse=True)
            heure_pic = max(heure_count, key=heure_count.get) if heure_count else None
            mois_actif = max(mois_count, key=mois_count.get) if mois_count else None

            result.append({
                "concurrent": concurrent,
                "nb_posts_par_semaine_moyen": posts_par_semaine,
                "nb_posts_total": nb_posts,
                "jours_actifs": jours_actifs,
                "heure_pic": heure_pic,
                "mois_le_plus_actif": mois_actif,
            })

        return result

    @staticmethod
    def get_lancements_recents(jours=30, user_id=None):
        """
        Posts des N derniers jours avec priority_status HIGH ou ULTRA-PRIORITY,
        triés par score_engagement décroissant.
        """
        collection = get_collection()
        cutoff = datetime.now(timezone.utc) - timedelta(days=int(jours))

        docs = list(collection.find(build_user_filter(user_id)))
        filtered_docs = []
        for doc in docs:
            dt = _parse_date(doc.get("date_post"))
            if not dt:
                continue
            dt_utc = dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
            if dt_utc < cutoff:
                continue
            if _priority_status(doc) not in {"HIGH", "ULTRA-PRIORITY"}:
                continue
            filtered_docs.append(doc)
        filtered_docs.sort(key=_engagement_score, reverse=True)
        docs = filtered_docs

        result = []
        for doc in docs:
            result.append({
                "concurrent": doc.get("concurrent"),
                "produit_nom": doc.get("produit_nom"),
                "prix": _safe_int(doc.get("prix")),
                "categorie": doc.get("categorie", "Autre"),
                "score_engagement": _engagement_score(doc),
                "priority_status": _priority_status(doc),
                "date_post": str(doc.get("date_post", "")),
                "lien_facebook": doc.get("lien_facebook"),
            })

        return result

    @staticmethod
    def get_produits_emergents(user_id=None):
        """
        Détecte les produits de la même catégorie postés par le même concurrent
        au moins 2 fois avec moins de 14 jours d'écart.
        """
        collection = get_collection()
        docs = list(collection.find(build_user_filter(user_id), {
            "concurrent": 1, "categorie": 1, "produit_nom": 1,
            "date_post": 1, "score_engagement": 1, "id_unique": 1,
            "likes": 1, "comments": 1
        }))

        # Grouper par (concurrent, categorie)
        groups = defaultdict(list)
        for doc in docs:
            key = (doc.get("concurrent", ""), doc.get("categorie", "Autre"))
            dt = _parse_date(doc.get("date_post"))
            if dt:
                groups[key].append({
                    "doc": doc,
                    "date": dt,
                })

        result = []
        for (concurrent, categorie), items in groups.items():
            if len(items) < 2:
                continue

            items_sorted = sorted(items, key=lambda x: x["date"])

            # Vérifier si au moins 2 posts sont à moins de 14 jours
            cluster = [items_sorted[0]]
            for i in range(1, len(items_sorted)):
                diff = (items_sorted[i]["date"] - items_sorted[i - 1]["date"]).days
                if diff <= 14:
                    cluster.append(items_sorted[i])

            if len(cluster) >= 2:
                total_score = sum(
                    _engagement_score(item["doc"]) for item in cluster
                )
                posts_list = []
                for item in cluster:
                    posts_list.append({
                        "id_unique": item["doc"].get("id_unique"),
                        "produit_nom": item["doc"].get("produit_nom"),
                        "date_post": str(item["date"]),
                        "score_engagement": _engagement_score(item["doc"]),
                    })

                result.append({
                    "concurrent": concurrent,
                    "categorie": categorie,
                    "nb_posts": len(cluster),
                    "score_engagement_total": total_score,
                    "dernier_post": str(cluster[-1]["date"]),
                    "liste_des_posts": posts_list,
                })

        # Trier par score total décroissant
        result.sort(key=lambda x: x["score_engagement_total"], reverse=True)
        return result

    @staticmethod
    def get_velocite_engagement(id_unique_list, user_id=None):
        """
        Pour une liste d'id_unique, calcule si l'engagement augmente,
        diminue ou est stable entre les posts successifs.
        """
        if not id_unique_list:
            return {"tendance": "stable", "variation_pct": 0}

        collection = get_collection()
        docs = list(collection.find(
            {"id_unique": {"$in": id_unique_list}, **build_user_filter(user_id)},
            {"id_unique": 1, "score_engagement": 1, "date_post": 1, "likes": 1, "comments": 1}
        ))

        if len(docs) < 2:
            return {"tendance": "stable", "variation_pct": 0}

        # Trier par date
        sorted_docs = sorted(docs, key=lambda d: str(d.get("date_post", "")))
        scores = [_engagement_score(d) for d in sorted_docs]

        first_half = scores[:len(scores) // 2]
        second_half = scores[len(scores) // 2:]

        avg_first = sum(first_half) / len(first_half) if first_half else 0
        avg_second = sum(second_half) / len(second_half) if second_half else 0

        if avg_first == 0:
            variation = 0
        else:
            variation = round(((avg_second - avg_first) / avg_first) * 100, 1)

        if variation > 10:
            tendance = "hausse"
        elif variation < -10:
            tendance = "baisse"
        else:
            tendance = "stable"

        return {
            "tendance": tendance,
            "variation_pct": variation,
        }
