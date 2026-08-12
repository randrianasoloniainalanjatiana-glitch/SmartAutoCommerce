"""
Service Historique — Comparaisons de prix utilisateur vs concurrent Facebook.
Joint Supabase (Historique_difference_prix + products) et MongoDB (Facebook_data_clean).
"""

from SAC.supabase_client import supabase
from ..mongo_client import get_collection, build_user_filter


def _safe_int(val, default=0):
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _safe_float(val, default=0.0):
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _fetch_historique_entries(user_id):
    """Récupère les entrées d'historique filtrées par utilisateur."""
    uid = str(user_id).strip()
    if not uid:
        return []

    try:
        resp = (
            supabase.table("Historique_difference_prix")
            .select("*")
            .eq("id_utilisateur", uid)
            .order("created_at", desc=True)
            .execute()
        )
        if resp.data:
            return resp.data
    except Exception:
        pass

    prod_resp = (
        supabase.table("products")
        .select("id")
        .eq("id_utilisateur", uid)
        .execute()
    )
    product_ids = [p["id"] for p in (prod_resp.data or [])]
    if not product_ids:
        return []

    resp = (
        supabase.table("Historique_difference_prix")
        .select("*")
        .in_("produit", product_ids)
        .order("created_at", desc=True)
        .execute()
    )
    return resp.data or []


def _format_produit_utilisateur(row):
    if not row:
        return None
    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "description": row.get("description"),
        "price": _safe_float(row.get("price")),
        "image_urls": row.get("image_urls"),
        "category": row.get("category"),
    }


def _format_produit_concurrent(doc):
    if not doc:
        return None
    return {
        "id_unique": doc.get("id_unique"),
        "concurrent": doc.get("concurrent"),
        "produit_nom": doc.get("produit_nom"),
        "prix": _safe_int(doc.get("prix")),
        "resume_fr": doc.get("resume_fr"),
        "lien_facebook": doc.get("lien_facebook"),
        "likes": doc.get("likes"),
        "comments": doc.get("comments"),
        "date_post": str(doc.get("date_post", "")),
    }


class HistoriqueService:

    @staticmethod
    def get_comparaisons(user_id=None):
        """
        Retourne l'historique enrichi avec les détails produit utilisateur (Supabase)
        et produit concurrent (MongoDB via id_unique).
        """
        entries = _fetch_historique_entries(user_id)
        if not entries:
            return []

        collection = get_collection()
        user_filter = build_user_filter(user_id)
        product_cache = {}
        mongo_cache = {}
        results = []

        for entry in entries:
            produit_id = entry.get("produit")
            produit_concurent_id = entry.get("produit_concurent")

            produit_util = None
            if produit_id and produit_id not in product_cache:
                try:
                    pr = (
                        supabase.table("products")
                        .select("id,name,description,price,image_urls,category")
                        .eq("id", produit_id)
                        .limit(1)
                        .execute()
                    )
                    product_cache[produit_id] = pr.data[0] if pr.data else None
                except Exception:
                    product_cache[produit_id] = None
            produit_util = product_cache.get(produit_id)

            produit_conc = None
            if produit_concurent_id:
                if produit_concurent_id not in mongo_cache:
                    query = {**user_filter, "id_unique": produit_concurent_id}
                    mongo_cache[produit_concurent_id] = collection.find_one(query)
                produit_conc = _format_produit_concurrent(mongo_cache[produit_concurent_id])

            prix_util = _safe_float(produit_util.get("price")) if produit_util else 0.0
            prix_conc = produit_conc.get("prix", 0) if produit_conc else 0
            difference = prix_util - prix_conc

            if difference > 0:
                avantage = "concurrent"
            elif difference < 0:
                avantage = "utilisateur"
            else:
                avantage = "egal"

            pct = 0.0
            if prix_conc > 0:
                pct = round((difference / prix_conc) * 100, 1)

            results.append({
                "id": entry.get("id"),
                "created_at": entry.get("created_at"),
                "alert_id": entry.get("alert_id"),
                "produit_utilisateur": _format_produit_utilisateur(produit_util),
                "produit_concurrent": produit_conc,
                "difference_prix": difference,
                "difference_pct": pct,
                "avantage": avantage,
            })

        return results
