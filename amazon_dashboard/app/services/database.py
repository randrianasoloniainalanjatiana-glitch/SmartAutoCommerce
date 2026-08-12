"""
app/services/database.py
Service d'accès à MongoDB — Singleton pattern.
"""

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.models.produit import Produit
from config.settings import Config
from typing import Optional


class DatabaseService:
    """
    Service MongoDB utilisant le pattern Singleton.
    Gère la connexion et expose des méthodes d'accès aux produits.
    """

    _instance: Optional["DatabaseService"] = None

    @staticmethod
    def filtre_utilisateur_produit(user_id) -> Optional[dict]:
        """Filtre MongoDB sur id_utilisateur (string, entier, UUID avec/sans tirets, casse)."""
        if user_id is None:
            return None
        s = str(user_id).strip()
        if not s:
            return None
        variants = {s}
        try:
            variants.add(int(s))
        except ValueError:
            pass
        # UUID Supabase / Mongo souvent comparés différemment
        if len(s) >= 32 and "-" in s:
            variants.add(s.lower())
            variants.add(s.upper())
            variants.add(s.replace("-", ""))
        vals = list(variants)
        if len(vals) == 1:
            return {"id_utilisateur": vals[0]}
        return {"id_utilisateur": {"$in": vals}}

    def __new__(cls) -> "DatabaseService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._client     = None
        self._db         = None
        self._collection = None
        self._initialized = True
        self._connect()

    def _connect(self):
        """Établit la connexion à MongoDB Atlas."""
        try:
            self._client = MongoClient(
                Config.CONNECTION_STRING,
                serverSelectionTimeoutMS=5000,
            )
            # Vérifie la connexion
            self._client.admin.command("ping")
            self._db         = self._client[Config.DATABASE_NAME]
            self._collection = self._db[Config.COLLECTION_NAME]
            print(f"[OK] MongoDB connecte -> {Config.DATABASE_NAME}/{Config.COLLECTION_NAME}")
        except (ConnectionFailure, ServerSelectionTimeoutError) as e:
            print(f"[ERROR] Erreur MongoDB: {e}")
            self._collection = None

    @property
    def est_connecte(self) -> bool:
        return self._collection is not None

    # ── Lecture ───────────────────────────────────────────────────────────────

    def get_tous_produits(self, filtre: dict = None) -> list[Produit]:
        """Récupère tous les produits (avec filtre optionnel)."""
        if not self.est_connecte:
            return []
        try:
            query = filtre or {}
            docs  = self._collection.find(query)
            return [Produit.from_mongo(doc) for doc in docs]
        except Exception as e:
            print(f"[ERROR] Erreur lecture: {e}")
            return []

    def get_produits_pagines(self, filtre: dict = None, tri: list = None, skip: int = 0, limit: int = 20) -> tuple[list[Produit], int]:
        """Récupère une page de produits et le nombre total de résultats correspondants."""
        if not self.est_connecte:
            return [], 0
        try:
            query = filtre or {}
            cursor = self._collection.find(query)
            if tri:
                cursor = cursor.sort(tri)
            
            total = self._collection.count_documents(query)
            
            if skip > 0:
                cursor = cursor.skip(skip)
            if limit > 0:
                cursor = cursor.limit(limit)
                
            docs = list(cursor)
            return [Produit.from_mongo(doc) for doc in docs], total
        except Exception as e:
            print(f"[ERROR] Erreur get_produits_pagines: {e}")
            return [], 0

    def get_par_categorie(self, categorie: str) -> list[Produit]:
        """Récupère les produits d'une catégorie."""
        return self.get_tous_produits({"categorie": categorie})

    def get_categories(self, filtre: Optional[dict] = None) -> list[str]:
        """Retourne la liste des catégories distinctes (optionnellement filtrées)."""
        if not self.est_connecte:
            return []
        try:
            return sorted(self._collection.distinct("categorie", filtre or {}))
        except Exception as e:
            print(f"[ERROR] Erreur distinct: {e}")
            return []

    def get_stats_globales(self) -> dict:
        """Agrégation MongoDB pour les statistiques globales."""
        if not self.est_connecte:
            return {}
        try:
            pipeline = [
                {
                    "$group": {
                        "_id":         "$categorie",
                        "nb":          {"$sum": 1},
                        "note_moy":    {"$avg": "$note"},
                        "prix_values": {"$push": "$prix"},
                    }
                },
                {"$sort": {"_id": 1}},
            ]
            return list(self._collection.aggregate(pipeline))
        except Exception as e:
            print(f"[ERROR] Erreur agregation: {e}")
            return []

    def get_filtres_options(self, filtre: dict = None) -> dict:
        """Récupère les listes uniques de catégories, marketplaces, et les bornes de prix."""
        if not self.est_connecte:
            return {"categories": [], "marketplaces": [], "prix_min": 0, "prix_max": 999}
        try:
            pipeline = []
            if filtre:
                pipeline.append({"$match": filtre})
            
            pipeline.append({
                "$group": {
                    "_id": None,
                    "categories": {"$addToSet": "$categorie"},
                    "marketplaces": {"$addToSet": "$source_site"},
                    "prix_min": {"$min": "$prix"},
                    "prix_max": {"$max": "$prix"},
                }
            })
            res = list(self._collection.aggregate(pipeline))
            if res and res[0]:
                r = res[0]
                return {
                    "categories": sorted(c for c in r.get("categories", []) if c),
                    "marketplaces": sorted(m for m in r.get("marketplaces", []) if m),
                    "prix_min": r.get("prix_min", 0),
                    "prix_max": r.get("prix_max", 999),
                }
            return {"categories": [], "marketplaces": [], "prix_min": 0, "prix_max": 999}
        except Exception as e:
            print(f"[ERROR] Erreur get_filtres_options: {e}")
            return {"categories": [], "marketplaces": [], "prix_min": 0, "prix_max": 999}

    def get_min_max_stats(self, filtre: dict = None) -> dict:
        """Calcule très rapidement les min et max globaux de la base pour la normalisation."""
        if not self.est_connecte:
            return {}
        try:
            pipeline = []
            if filtre:
                pipeline.append({"$match": filtre})
            
            pipeline.append({
                "$group": {
                    "_id": None,
                    "min_note": {"$min": "$note"},
                    "max_note": {"$max": "$note"},
                    "min_avis": {"$min": "$avis_int"},
                    "max_avis": {"$max": "$avis_int"},
                    "min_achats": {"$min": "$achats_mensuels"},
                    "max_achats": {"$max": "$achats_mensuels"},
                    "min_qp": {"$min": "$rapport_qualite_prix"},
                    "max_qp": {"$max": "$rapport_qualite_prix"},
                }
            })
            res = list(self._collection.aggregate(pipeline))
            if res:
                return res[0]
            return {}
        except Exception as e:
            print(f"[ERROR] Erreur get_min_max_stats: {e}")
            return {}

    def get_nb_total(self, filtre: Optional[dict] = None) -> int:
        """Nombre de documents (toute la collection ou selon filtre)."""
        if not self.est_connecte:
            return 0
        try:
            return self._collection.count_documents(filtre if filtre is not None else {})
        except Exception:
            return 0

    def get_par_asin(self, asin: str, user_id=None) -> Optional[Produit]:
        """Récupère un produit par son ASIN, optionnellement limité à un utilisateur."""
        if not self.est_connecte:
            return None
        try:
            q: dict = {"asin": asin}
            uf = self.filtre_utilisateur_produit(user_id)
            if uf:
                q.update(uf)
            doc = self._collection.find_one(q)
            return Produit.from_mongo(doc) if doc else None
        except Exception as e:
            print(f"[ERROR] Erreur find_one: {e}")
            return None

    def close(self):
        """Ferme la connexion MongoDB."""
        if self._client:
            self._client.close()
            print("[INFO] Connexion MongoDB fermee.")
