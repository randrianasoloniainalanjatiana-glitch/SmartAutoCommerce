"""
app/models/produit.py
Modèle de données Produit — classe centrale de l'application.
"""

import re
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Produit:
    """Représente un produit scrappé depuis une marketplace."""

    asin:             str
    produit:          str
    categorie:        str
    prix:             str
    note:             float
    avis:             str
    lien:             str             = ""
    image_url:        str             = ""
    last_bought:      Optional[str]   = None
    produit_rechercher: str           = ""
    date_clustering:  str             = ""
    id_utilisateur:   str             = ""
    source_site:      str             = "amazon"
    _id:              Optional[str]   = field(default=None, repr=False)

    # ── Propriétés calculées ──────────────────────────────────────────────────

    @property
    def prix_float(self) -> float:
        """Convertit différents formats prix ('19,99 €', '$19.99', '1 299,50')."""
        raw = str(self.prix or "").strip()
        if not raw:
            return 0.0

        cleaned = re.sub(r"[^\d,.\-]", "", raw).strip()
        if not cleaned:
            return 0.0

        # Si virgule et point coexistent, on suppose le séparateur décimal le plus à droite.
        if "," in cleaned and "." in cleaned:
            if cleaned.rfind(",") > cleaned.rfind("."):
                normalized = cleaned.replace(".", "").replace(",", ".")
            else:
                normalized = cleaned.replace(",", "")
        elif "," in cleaned:
            normalized = cleaned.replace(",", ".")
        else:
            normalized = cleaned
        try:
            return float(normalized)
        except ValueError:
            return 0.0

    @property
    def avis_int(self) -> int:
        """Convertit '22 300'/'22,300'/'22k' en entier."""
        raw = str(self.avis or "").strip().lower()
        if not raw or raw in {"none", "null", "nan"}:
            return 0
        cleaned = raw.replace(" ", "").replace("\u00a0", "").replace(",", "")
        mult = 1
        if cleaned.endswith("k"):
            mult = 1000
            cleaned = cleaned[:-1]
        try:
            return int(float(cleaned) * mult)
        except ValueError:
            return 0

    @property
    def achats_mensuels(self) -> int:
        """Extrait le nombre d'achats mensuels depuis last_bought."""
        if not self.last_bought:
            return 0
        text = str(self.last_bought)
        match = re.search(r"(\d[\d\s,\.]*)", text)
        if not match:
            return 0
        num = match.group(1).replace(" ", "").replace(",", "").replace(".", "")
        try:
            return int(num)
        except ValueError:
            return 0

    @property
    def rapport_qualite_prix(self) -> float:
        """Note divisée par le prix (valeur perçue)."""
        prix = max(0.01, self.prix_float)
        note = self.note or 0.0
        try:
            return round(note / prix, 4) if prix > 0 else 0.0
        except (TypeError, ValueError):
            return 0.0

    @property
    def etoiles(self) -> str:
        """Retourne une représentation Unicode des étoiles."""
        try:
            n = int(round(self.note)) if self.note else 0
            n = max(0, min(5, n))  # Limiter entre 0 et 5
            return "★" * n + "☆" * (5 - n)
        except (TypeError, ValueError):
            return "☆☆☆☆☆"

    @property
    def marketplace(self) -> str:
        val = (self.source_site or "").strip().lower()
        return val if val else "amazon"

    # ── Méthodes de fabrique ──────────────────────────────────────────────────

    @classmethod
    def from_mongo(cls, doc: dict) -> "Produit":
        """Crée un Produit depuis un document MongoDB."""
        # Gestion robuste des valeurs None et invalides
        
        # Prix
        prix_val = doc.get("prix")
        source_site = doc.get("source_site", "amazon").strip().lower()
        if prix_val in (None, "", "null"):
            prix_str = "0 €"
        else:
            try:
                prix_str = str(prix_val)
                # Convertir USD en EUR (taux approx 0.92) pour eBay et Walmart
                if source_site in ["ebay", "walmart"]:
                    cleaned = re.sub(r"[^\d,.\-]", "", prix_str).strip()
                    if cleaned:
                        if "," in cleaned and "." in cleaned:
                            if cleaned.rfind(",") > cleaned.rfind("."):
                                normalized = cleaned.replace(".", "").replace(",", ".")
                            else:
                                normalized = cleaned.replace(",", "")
                        elif "," in cleaned:
                            normalized = cleaned.replace(",", ".")
                        else:
                            normalized = cleaned
                        val_usd = float(normalized)
                        val_eur = val_usd * 0.92
                        prix_str = f"{val_eur:.2f}".replace(".", ",") + " €"
            except (TypeError, ValueError):
                prix_str = "0 €"
        
        # Note
        note_val = doc.get("note")
        if note_val in (None, "", "null"):
            note_float = 0.0
        else:
            try:
                # Convertir en float en toute sécurité
                note_float = float(note_val)
            except (TypeError, ValueError):
                note_float = 0.0
        
        # Avis
        avis_val = doc.get("avis")
        if avis_val in (None, "", "null"):
            avis_str = "0"
        else:
            try:
                avis_str = str(avis_val)
            except (TypeError, ValueError):
                avis_str = "0"
        
        return cls(
            _id=str(doc.get("_id", "")),
            asin=doc.get("asin", ""),
            produit=doc.get("produit", ""),
            categorie=doc.get("categorie", ""),
            prix=prix_str,
            note=note_float,
            avis=avis_str,
            lien=doc.get("lien", ""),
            image_url=doc.get("image_url", ""),
            last_bought=doc.get("last_bought"),
            produit_rechercher=doc.get("produit_rechercher", ""),
            date_clustering=str(doc.get("date_clustering", "")),
            id_utilisateur=doc.get("id_utilisateur", ""),
            source_site=doc.get("source_site", "amazon"),
        )

    def to_dict(self) -> dict:
        """Sérialise le produit en dictionnaire (pour JSON/template)."""
        return {
            "id":               self._id,
            "asin":             self.asin,
            "produit":          self.produit,
            "categorie":        self.categorie,
            "prix":             self.prix,
            "prix_float":       self.prix_float,
            "note":             self.note,
            "avis":             self.avis,
            "avis_int":         self.avis_int,
            "achats_mensuels":  self.achats_mensuels,
            "rapport_qp":       self.rapport_qualite_prix,
            "etoiles":          self.etoiles,
            "lien":             self.lien,
            "image_url":        self.image_url,
            "last_bought":      self.last_bought,
            "produit_rechercher": self.produit_rechercher,
            "date_clustering":  self.date_clustering,
            "id_utilisateur":   self.id_utilisateur,
            "source_site":      self.marketplace,
        }

    def __repr__(self) -> str:
        return f"<Produit {self.asin} | {self.categorie} | {self.prix}>"
