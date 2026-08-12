"""
app/routes/comparateur.py
Routes du comparateur / moteur de recommandation.
"""

from flask import Blueprint, jsonify, request
from app.services import DatabaseService, ComparateurService, AnalyseIAService

comparateur_bp = Blueprint("comparateur", __name__, url_prefix="/comparateur")
db             = DatabaseService()
analyse_ia     = AnalyseIAService()

def _safe_float(value, default=None):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

def _safe_int(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default

@comparateur_bp.route("/api/recommander")
def api_recommander():
    categorie  = request.args.get("categorie")
    source_site = request.args.get("source_site")
    budget_max = request.args.get("budget")
    note_min   = _safe_float(request.args.get("note_min"), 4.0)
    top_n      = min(_safe_int(request.args.get("top_n"), 5), 20)  # Limiter à 20 max

    user_id    = request.args.get("user_id")

    produits = db.get_tous_produits(db.filtre_utilisateur_produit(user_id))
    svc      = ComparateurService(produits)
    return jsonify(svc.recommander(
        categorie=categorie,
        source_site=source_site,
        budget_max=_safe_float(budget_max),
        note_min=note_min,
        top_n=top_n,
    ))

@comparateur_bp.route("/api/options")
def api_options():
    """Endpoint léger : retourne catégories, marketplaces et meilleur par catégorie sans tout scorer."""
    user_id = request.args.get("user_id")
    filtre = db.filtre_utilisateur_produit(user_id) or {}
    options = db.get_filtres_options(filtre)
    
    # Meilleur par catégorie (rapide : juste un tri par note)
    produits = db.get_tous_produits(filtre)
    svc = ComparateurService(produits)
    meilleur_par_cat = svc.meilleur_par_categorie()
    
    return jsonify({
        "categories": options["categories"],
        "marketplaces": options["marketplaces"],
        "meilleur_par_categorie": meilleur_par_cat,
    })


@comparateur_bp.route("/api/comparer")
def api_comparer():
    asin1 = request.args.get("asin1")
    asin2 = request.args.get("asin2")
    user_id = request.args.get("user_id")
    if not asin1 or not asin2:
        return jsonify({"erreur": "Fournir asin1 et asin2"}), 400
    produits = db.get_tous_produits(db.filtre_utilisateur_produit(user_id))
    svc      = ComparateurService(produits)
    return jsonify(svc.comparer_deux(asin1, asin2))


@comparateur_bp.route("/api/analyse-ia", methods=["POST"])
def api_analyse_ia():
    """
    Analyse comparative inter-plateformes via OpenAI (GPT-4o).
    Corps JSON ou query : asin1, asin2, user_id (optionnel).
    """
    if not analyse_ia.est_configure:
        return jsonify({
            "erreur": "OPENAI_API_KEY manquante. Ajoutez-la dans amazon_dashboard/.env",
        }), 503

    data = request.get_json(silent=True) or {}
    asin1 = data.get("asin1") or request.args.get("asin1")
    asin2 = data.get("asin2") or request.args.get("asin2")
    user_id = data.get("user_id") or request.args.get("user_id")

    if not asin1 or not asin2:
        return jsonify({"erreur": "Fournir asin1 et asin2"}), 400

    p1 = db.get_par_asin(asin1, user_id)
    p2 = db.get_par_asin(asin2, user_id)
    if not p1 or not p2:
        return jsonify({"erreur": "Produit(s) introuvable(s) pour cet utilisateur"}), 404

    try:
        result = analyse_ia.analyser_comparaison(p1, p2)
    except Exception as e:
        return jsonify({"erreur": "Échec de l'analyse IA", "detail": str(e)}), 502

    if result.get("erreur"):
        code = result.get("code")
        status = 400 if code == "meme_marketplace" else 502
        return jsonify(result), status

    return jsonify(result)
