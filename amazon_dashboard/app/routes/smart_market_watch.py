"""
Routes SmartMarketWatch.
"""

from flask import Blueprint, jsonify, request

from app.services import DatabaseService, SmartMarketWatchService

smart_market_watch_bp = Blueprint("smart_market_watch", __name__, url_prefix="/smart-market-watch")
db = DatabaseService()


def _safe_int(value, default=10):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


@smart_market_watch_bp.route("/api/overview")
def api_overview():
    user_id = request.args.get("user_id")
    source_site = request.args.get("source_site")
    top_n = max(1, min(_safe_int(request.args.get("top_n"), 10), 50))

    produits = db.get_tous_produits(db.filtre_utilisateur_produit(user_id))
    if source_site:
        src = source_site.strip().lower()
        produits = [p for p in produits if getattr(p, "marketplace", "").lower() == src]

    svc = SmartMarketWatchService(produits)
    return jsonify(svc.tableau_bord(top_n=top_n))
