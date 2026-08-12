"""
app/routes/sourcing.py
"""
from flask import Blueprint, jsonify, request
from app.services import DatabaseService, SourcingService

sourcing_bp = Blueprint("sourcing", __name__, url_prefix="/sourcing")
db          = DatabaseService()

@sourcing_bp.route("/api/scores")
def api_scores():
    user_id = request.args.get("user_id")
    source_site = request.args.get("source_site")
    
    # Sourcing pagination
    classement_page = int(request.args.get("classement_page", 1))
    futur_page = int(request.args.get("futur_page", 1))
    limit_classement = int(request.args.get("limit_classement", 10))
    limit_futur = int(request.args.get("limit_futur", 8))

    produits = db.get_tous_produits(db.filtre_utilisateur_produit(user_id))
    if source_site:
        src = source_site.strip().lower()
        produits = [p for p in produits if getattr(p, "marketplace", "").lower() == src]
    
    svc = SourcingService(produits)
    data = svc.tout()
    
    # Pagination côté serveur pour réduire le payload JSON
    total_profils = len(data["profils"])
    total_futur = len(data["potentiel_futur"])
    
    skip_c = (classement_page - 1) * limit_classement
    skip_f = (futur_page - 1) * limit_futur
    
    data["total_profils"] = total_profils
    data["total_potentiel_futur"] = total_futur
    
    data["profils"] = data["profils"][skip_c : skip_c + limit_classement]
    data["potentiel_futur"] = data["potentiel_futur"][skip_f : skip_f + limit_futur]
    
    # Le graphe renvoie déjà les 20 meilleurs (si nécessaire), ou on peut laisser le frontend s'en charger.
    # On garde opportunites complet car c'est utilisé pour des badges ou le graphe, mais s'il y en a trop on pourrait limiter.
    
    return jsonify(data)
