"""
app/__init__.py
Factory Flask — crée et configure l'application.
"""

from flask import Flask
from flask_cors import CORS
from config.settings import Config


def create_app(config_class=Config) -> Flask:
    # API-only: le front est dans SmartAutoCommerce/Frontend (React).
    app = Flask(__name__)
    app.config.from_object(config_class)
    CORS(app)

    # ── Route racine ──────────────────────────────────────────────────────────
    @app.route("/")
    def root():
        """Endpoint racine de l'application."""
        from flask import jsonify
        return jsonify({
            "message": "Amazon Dashboard API",
            "version": "1.0",
            "endpoints": {
                "api": "/api/",
                "produits": "/api/produits",
                "catalogue": "/catalogue/",
                "comparateur": "/comparateur/",
                "veille": "/veille/",
                "sourcing": "/sourcing/",
                "smart_market_watch": "/smart-market-watch/",
            }
        })

    # ── Blueprints ────────────────────────────────────────────────────────────
    from app.routes import (
        api_bp, comparateur_bp, veille_bp, sourcing_bp, catalogue_bp, smart_market_watch_bp,
    )
    app.register_blueprint(api_bp)
    app.register_blueprint(comparateur_bp)
    app.register_blueprint(veille_bp)
    app.register_blueprint(sourcing_bp)
    app.register_blueprint(catalogue_bp)
    app.register_blueprint(smart_market_watch_bp)

    return app
