"""
app/services/catalogue.py
Service de génération de catalogue produit (JSON, CSV).
"""

import json
import csv
import io
from datetime import datetime
from app.models.produit import Produit


class CatalogueService:
    """Gère l'affichage et l'export du catalogue produit."""

    def __init__(self, produits: list[Produit]):
        self.produits = produits
        self.date_gen = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # ── Filtres et tri ────────────────────────────────────────────────────────

    def filtrer(
        self,
        categorie: str  = None,
        source_site: str = None,
        recherche: str  = None,
        note_min:  float = 0.0,
        prix_max:  float = None,
        tri:       str  = "note",
        asc:       bool = False,
    ) -> list[Produit]:
        res = self.produits[:]

        if categorie:
            res = [p for p in res if p.categorie.lower() == categorie.lower()]
        if source_site:
            wanted = source_site.strip().lower()
            res = [p for p in res if getattr(p, "marketplace", "").lower() == wanted]
        if note_min:
            res = [p for p in res if p.note >= note_min]
        if prix_max is not None:
            res = [p for p in res if p.prix_float <= prix_max]
        if recherche:
            kw = recherche.lower()
            res = [p for p in res if kw in p.produit.lower()]

        cles = {
            "note":  lambda p: p.note,
            "prix":  lambda p: p.prix_float,
            "avis":  lambda p: p.avis_int,
            "nom":   lambda p: p.produit.lower(),
        }
        key = cles.get(tri, cles["note"])
        return sorted(res, key=key, reverse=not asc)

    # ── Données page catalogue ────────────────────────────────────────────────

    def page_catalogue(
        self,
        categorie: str  = None,
        source_site: str = None,
        recherche: str  = None,
        note_min:  float = 0.0,
        prix_max:  float = None,
        tri:       str  = "note",
    ) -> dict:
        produits_filtres = self.filtrer(
            categorie=categorie,
            source_site=source_site,
            recherche=recherche,
            note_min=note_min,
            prix_max=prix_max,
            tri=tri,
        )
        categories = sorted(set(p.categorie for p in self.produits))
        marketplaces = sorted(set(getattr(p, "marketplace", "amazon") for p in self.produits))
        prix_list  = [p.prix_float for p in self.produits]

        return {
            "produits":    [p.to_dict() for p in produits_filtres],
            "nb_resultats": len(produits_filtres),
            "categories":  categories,
            "marketplaces": marketplaces,
            "prix_min":    min(prix_list, default=0),
            "prix_max":    max(prix_list, default=999),
            "date_gen":    self.date_gen,
            "filtres_actifs": {
                "categorie": categorie,
                "source_site": source_site,
                "recherche": recherche,
                "note_min":  note_min,
                "prix_max":  prix_max,
                "tri":       tri,
            },
        }

    # ── Exports ───────────────────────────────────────────────────────────────

    def exporter_json(self) -> str:
        """Retourne le catalogue en JSON string."""
        catalogue = {
            "meta": {
                "titre":          "Catalogue Accessoires de Cuisine — Amazon.fr",
                "date_generation": self.date_gen,
                "nb_produits":    len(self.produits),
                "categories":     sorted(set(p.categorie for p in self.produits)),
                "marketplaces":   sorted(set(getattr(p, "marketplace", "amazon") for p in self.produits)),
            },
            "produits": [p.to_dict() for p in self.produits],
        }
        return json.dumps(catalogue, ensure_ascii=False, indent=2)

    def exporter_csv(self) -> str:
        """Retourne le catalogue en CSV string (pour téléchargement)."""
        output = io.StringIO()
        champs = ["asin", "categorie", "produit", "prix", "note", "avis",
                  "achats_mensuels", "rapport_qp", "lien", "image_url",
                  "last_bought", "date_clustering"]
        writer = csv.DictWriter(output, fieldnames=champs, extrasaction="ignore")
        writer.writeheader()
        for p in self.produits:
            writer.writerow(p.to_dict())
        return output.getvalue()
