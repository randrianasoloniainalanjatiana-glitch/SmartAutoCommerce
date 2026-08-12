"""
run.py
Point d'entrée de l'application Flask.
Lancer avec : python run.py
"""

from pathlib import Path

from dotenv import load_dotenv

# Charger .env avant toute importation de Config / services
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
