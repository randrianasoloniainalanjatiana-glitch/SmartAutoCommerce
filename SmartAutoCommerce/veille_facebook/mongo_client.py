"""
Client MongoDB partagé pour le module veille_facebook.
Connexion à la collection Facebook_data_clean (base Scrapping_produit).
"""

from pymongo import MongoClient

MONGO_URI = "mongodb+srv://Lanjatiana:uY6Y8QhFARvcmdtK@scraping.37diz8i.mongodb.net/?appName=Scraping"
DB_NAME = "Scrapping_produit"
COLLECTION_NAME = "Facebook_data_clean"

_client = None


def get_collection():
    """Retourne la collection MongoDB Facebook_data_clean (singleton)."""
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI)
    return _client[DB_NAME][COLLECTION_NAME]


def build_user_filter(user_id):
    """
    Construit un filtre MongoDB robuste sur id_utilisateur.
    Gère string/int/UUID (avec ou sans tirets, casse différente).
    """
    if user_id is None:
        return {}

    raw = str(user_id).strip()
    if not raw:
        return {}

    variants = {raw}
    try:
        variants.add(int(raw))
    except ValueError:
        pass

    if len(raw) >= 32:
        variants.add(raw.lower())
        variants.add(raw.upper())
        variants.add(raw.replace("-", ""))

    values = list(variants)
    if len(values) == 1:
        return {"id_utilisateur": values[0]}
    return {"id_utilisateur": {"$in": values}}
