"""
app/routes/catalogue.py
"""
from flask import Blueprint, request, Response, jsonify
from app.services import DatabaseService, CatalogueService

catalogue_bp = Blueprint("catalogue", __name__, url_prefix="/catalogue")
db           = DatabaseService()

def _safe_float(value, default=None):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

@catalogue_bp.route("/")
def catalogue_page():
    """Route API JSON pour le catalogue frontend."""
    try:
        user_id = request.args.get("user_id")
        categorie = request.args.get("categorie")
        recherche = request.args.get("q")
        note_min = _safe_float(request.args.get("note_min"), 0.0)
        prix_max = _safe_float(request.args.get("prix_max"))
        tri = request.args.get("tri", "note")
        source_site = request.args.get("source_site")

        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 20))

        # Filtrer par utilisateur
        filtre = db.filtre_utilisateur_produit(user_id) or {}

        if source_site:
            filtre["source_site"] = {"$regex": f"^{source_site.strip()}$", "$options": "i"}
        if categorie:
            filtre["categorie"] = {"$regex": f"^{categorie.strip()}$", "$options": "i"}
        if note_min > 0:
            filtre["note"] = {"$gte": note_min}
        # NOTE: prix_max is NOT added to the MongoDB filter because `prix` is stored
        # as a string (e.g. "19,99 €", "$19.99"). Comparing a float with $lte against
        # a string never matches. Instead, we filter in Python using Produit.prix_float.
        if recherche:
            filtre["$or"] = [
                {"produit": {"$regex": recherche.strip(), "$options": "i"}},
                {"categorie": {"$regex": recherche.strip(), "$options": "i"}}
            ]

        tri_map = {
            "note": [("note", -1)],
            "prix": [("prix", 1)],
            "avis": [("avis_int", -1)],
            "nom": [("produit", 1)],
        }
        mongo_tri = tri_map.get(tri, [("note", -1)])

        # When prix_max is set, we can't filter in MongoDB (prix is a string).
        # So we fetch ALL matching products, filter in Python, then paginate manually.
        if prix_max is not None:
            all_produits = db.get_tous_produits(filtre)
            # Sort in Python
            tri_key_map = {
                "note": lambda p: (p.note or 0),
                "prix": lambda p: p.prix_float,
                "avis": lambda p: p.avis_int,
                "nom": lambda p: (p.produit or "").lower(),
            }
            sort_key = tri_key_map.get(tri, tri_key_map["note"])
            reverse = tri not in ("prix", "nom")  # descending for note/avis, ascending for prix/nom
            all_produits.sort(key=sort_key, reverse=reverse)

            # Apply prix_max filter in Python
            all_produits = [p for p in all_produits if p.prix_float <= prix_max]

            total = len(all_produits)
            skip = (page - 1) * limit
            produits_page = all_produits[skip:skip + limit]
        else:
            # No prix_max filter — use efficient MongoDB pagination
            skip = (page - 1) * limit
            produits_page, total = db.get_produits_pagines(filtre, tri=mongo_tri, skip=skip, limit=limit)

        # Options de filtre (basées uniquement sur user_id, pas sur la recherche en cours)
        options = db.get_filtres_options(db.filtre_utilisateur_produit(user_id) or {})

        import datetime
        data = {
            "produits": [p.to_dict() for p in produits_page],
            "nb_resultats": total,
            "page": page,
            "limit": limit,
            "total_pages": max(1, (total + limit - 1) // limit),
            "categories": options["categories"],
            "marketplaces": options["marketplaces"],
            "prix_min": options["prix_min"],
            "prix_max": options["prix_max"],
            "date_gen": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "filtres_actifs": {
                "categorie": categorie,
                "source_site": source_site,
                "recherche": recherche,
                "note_min": note_min,
                "prix_max": prix_max,
                "tri": tri,
            },
        }
        return jsonify(data)
    except Exception as e:
        import traceback
        print(f"[ERROR] Erreur dans catalogue_page: {e}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@catalogue_bp.route("/export/json")
def export_json():
    user_id = request.args.get("user_id")
    source_site = request.args.get("source_site")
    produits = db.get_tous_produits(db.filtre_utilisateur_produit(user_id))
    if source_site:
        src = source_site.strip().lower()
        produits = [p for p in produits if getattr(p, "marketplace", "").lower() == src]
    svc      = CatalogueService(produits)
    return Response(
        svc.exporter_json(),
        mimetype="application/json",
        headers={"Content-Disposition": "attachment; filename=catalogue.json"},
    )


@catalogue_bp.route("/export/csv")
def export_csv():
    user_id = request.args.get("user_id")
    source_site = request.args.get("source_site")
    produits = db.get_tous_produits(db.filtre_utilisateur_produit(user_id))
    if source_site:
        src = source_site.strip().lower()
        produits = [p for p in produits if getattr(p, "marketplace", "").lower() == src]
    svc      = CatalogueService(produits)
    return Response(
        svc.exporter_csv(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=catalogue.csv"},
    )
