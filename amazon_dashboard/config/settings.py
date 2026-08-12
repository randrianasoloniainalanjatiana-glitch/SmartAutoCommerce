"""
config/settings.py
Configuration centrale de l'application.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

_BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BASE_DIR / ".env")


class Config:
    # ── MongoDB ──────────────────────────────────────────────────
    DEFAULT_ATLAS_URI = (
        "mongodb+srv://Lanjatiana:uY6Y8QhFARvcmdtK@scraping.37diz8i.mongodb.net/"
        "?appName=Scraping"
    )
    CONNECTION_STRING = os.getenv("MONGODB_URI") or os.getenv("CONNECTION_STRING") or DEFAULT_ATLAS_URI
    DATABASE_NAME = os.getenv("MONGODB_DATABASE", "Scrapping_produit")
    COLLECTION_NAME = os.getenv("MONGODB_COLLECTION", "Clustering_amazon")

    # ── Flask ────────────────────────────────────────────────────
    SECRET_KEY = os.getenv("SECRET_KEY", "amazon-dashboard-secret-2026")
    DEBUG = os.getenv("FLASK_DEBUG", "1") == "1"

    # ── Scoring sourcing ─────────────────────────────────────────
    POIDS_SCORE = {
        "note":        0.25,
        "volume_avis": 0.20,
        "achats":      0.30,
        "rapport_qp":  0.25,
    }
    SEUIL_RECOMMANDE = 0.40
    SEUIL_NOTE_MIN   = 4.0
    SEUIL_AVIS_MIN   = 100

    # ── Potentiel « tendance / futur » (heuristique catalogue) ─
    FUTUR_NOTE_MIN = 3.95
    FUTUR_AVIS_MIN = 40
    FUTUR_ACHATS_NORM_MAX = 0.78
    FUTUR_SCORE_MIN = 0.60
    FUTUR_TOP_MAX = 40
    POIDS_SCORE_FUTUR = {
        "note": 0.26,
        "qp": 0.22,
        "faible_penetration": 0.38,
        "avis_emergents": 0.14,
    }

    # ── Alertes veille ───────────────────────────────────────────
    SEUIL_BAISSE_PRIX  = 1.0
    SEUIL_HAUSSE_PRIX  = 1.0
    SEUIL_BAISSE_NOTE  = 0.2

    # ── OpenAI (comparateur IA) ──────────────────────────────────
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o")


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
