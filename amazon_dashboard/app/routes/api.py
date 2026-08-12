"""
app/routes/api.py
Routes API racines - endpoints généraux.
"""
from flask import Blueprint, jsonify, request
from app.services import DatabaseService

api_bp = Blueprint("api", __name__, url_prefix="/api")
db     = DatabaseService()

@api_bp.route("/produits", methods=["GET"])
def api_produits():
    """Retourne tous les produits filtrés optionnellement par utilisateur et marketplace."""
    user_id = request.args.get("user_id")
    source_site = request.args.get("source_site")
    
    # Filtrer par utilisateur
    filtre = db.filtre_utilisateur_produit(user_id)
    produits = db.get_tous_produits(filtre)
    
    # Filtrer par marketplace si spécifié
    if source_site:
        src = source_site.strip().lower()
        produits = [p for p in produits if getattr(p, "marketplace", "").lower() == src]
    
    # Retourner les produits sérialisés
    data = [
        {
            "asin": p.asin,
            "produit": p.produit,
            "categorie": p.categorie,
            "prix": p.prix,
            "note": p.note,
            "avis": p.avis,
            "lien": p.lien,
            "image_url": p.image_url,
            "source_site": p.source_site,
        }
        for p in produits
    ]
    return jsonify(data)

@api_bp.route("/", methods=["GET"])
def api_root():
    """Endpoint racine de l'API."""
    return jsonify({
        "message": "Amazon Dashboard API",
        "version": "1.0",
        "endpoints": {
            "produits": "/api/produits",
            "catalogue": "/catalogue",
            "comparateur": "/comparateur",
            "veille": "/veille",
            "sourcing": "/sourcing",
            "smart_market_watch": "/smart-market-watch",
        }
    })
