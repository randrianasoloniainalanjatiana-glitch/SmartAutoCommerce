"""
app/routes/veille.py
"""
from flask import Blueprint, jsonify, request
from app.services import DatabaseService, VeilleService

veille_bp = Blueprint("veille", __name__, url_prefix="/veille")
db        = DatabaseService()

@veille_bp.route("/api/data")
def api_data():
    user_id = request.args.get("user_id")
    source_site = request.args.get("source_site")
    produits = db.get_tous_produits(db.filtre_utilisateur_produit(user_id))
    if source_site:
        src = source_site.strip().lower()
        produits = [p for p in produits if getattr(p, "marketplace", "").lower() == src]
    svc      = VeilleService(produits, user_id=user_id)
    data     = svc.tout()
    # Serialize produits for JSON
    serialized_produits = []
    for p in data.get("produits", []):
        sp = {
            "asin": getattr(p, "asin", p.get("asin", "")) if isinstance(p, dict) else p.asin,
            "produit": getattr(p, "produit", p.get("produit", "")) if isinstance(p, dict) else p.produit,
            "categorie": getattr(p, "categorie", p.get("categorie", "")) if isinstance(p, dict) else p.categorie,
            "prix": getattr(p, "prix", p.get("prix", "")) if isinstance(p, dict) else p.prix,
            "note": getattr(p, "note", p.get("note", 0)) if isinstance(p, dict) else p.note,
            "etoiles": getattr(p, "etoiles", p.get("etoiles", "")) if isinstance(p, dict) else getattr(p, "etoiles", ""),
            "avis_int": getattr(p, "avis_int", p.get("avis_int", 0)) if isinstance(p, dict) else getattr(p, "avis_int", 0),
            "achats_mensuels": getattr(p, "achats_mensuels", p.get("achats_mensuels", 0)) if isinstance(p, dict) else getattr(p, "achats_mensuels", 0),
            "source_site": getattr(p, "source_site", p.get("source_site", "")) if isinstance(p, dict) else getattr(p, "source_site", ""),
        }
        serialized_produits.append(sp)
    # Serialize alertes
    serialized_alertes = []
    for a in data.get("alertes", []):
        sa = {
            "type": a.get("type", "") if isinstance(a, dict) else getattr(a, "type", ""),
            "niveau": a.get("niveau", "info") if isinstance(a, dict) else getattr(a, "niveau", "info"),
            "asin": a.get("asin", "") if isinstance(a, dict) else getattr(a, "asin", ""),
            "source_site": a.get("source_site", "") if isinstance(a, dict) else getattr(a, "source_site", ""),
            "categorie": a.get("categorie", "") if isinstance(a, dict) else getattr(a, "categorie", ""),
            "produit": a.get("produit", "") if isinstance(a, dict) else getattr(a, "produit", ""),
            "message": a.get("message", "") if isinstance(a, dict) else getattr(a, "message", ""),
        }
        serialized_alertes.append(sa)
    return jsonify({
        "nb_snapshots": data.get("nb_snapshots", 0),
        "dernier_snapshot": data.get("dernier_snapshot", "—"),
        "alertes": serialized_alertes,
        "produits": serialized_produits,
    })

@veille_bp.route("/api/snapshot", methods=["POST"])
def api_snapshot():
    user_id = request.args.get("user_id")
    source_site = request.args.get("source_site")
    produits = db.get_tous_produits(db.filtre_utilisateur_produit(user_id))
    if source_site:
        src = source_site.strip().lower()
        produits = [p for p in produits if getattr(p, "marketplace", "").lower() == src]
    svc      = VeilleService(produits, user_id=user_id)
    snap     = svc.enregistrer_snapshot()
    return jsonify({"message": "Snapshot enregistré", "date": snap["date"]})

@veille_bp.route("/api/evolution/<asin>")
def api_evolution(asin):
    user_id = request.args.get("user_id")
    categorie = request.args.get("categorie", "")
    # L'évolution doit venir uniquement des snapshots capturés,
    # pour éviter toute dépendance à la DB "actuelle".
    svc = VeilleService([], user_id=user_id)
    return jsonify({
        "prix":  svc.evolution_prix(asin, categorie=categorie),
        "notes": svc.evolution_notes(asin, categorie=categorie),
    })


@veille_bp.route("/api/saisonnalite/<asin>")
def api_saisonnalite(asin):
    """
    Analyse de saisonnalité basée sur l'historique de snapshots.

    Retourne un profil par mois (1..12) sur la métrique `achats_mensuels`
    (ou 0 si la donnée n'est pas encore disponible dans les anciens snapshots).
    """
    user_id = request.args.get("user_id")
    svc = VeilleService([], user_id=user_id)
    return jsonify(svc.saisonnalite_achats(asin))
