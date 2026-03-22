import stripe
import os
from dotenv import load_dotenv

load_dotenv()

# Clé secrète Stripe (idéalement dans .env)
STRIPE_SECRET_KEY = "sk_test_51TDgHvL60IFtafgnA4LMCfM8cp2A6z69KqBTdAbsTsusgc9Mo10Jd9pkx0xDqkoVgDm25IV4yZDAVePy1hCTOoEQ00ikcFZVuW"
stripe.api_key = STRIPE_SECRET_KEY

def create_payment_intent(amount, currency="eur"):
    """
    Crée une intention de paiement Stripe.
    L'API Stripe attend des centimes, on multiplie donc le montant par 100.
    """
    try:
        intent = stripe.PaymentIntent.create(
            amount=int(float(amount) * 100),
            currency=currency,
            automatic_payment_methods={
                'enabled': True,
            },
        )
        # Retourne uniquement le client_secret qui sera nécessaire côté frontend (React)
        return {"client_secret": intent.client_secret, "id": intent.id}
    except Exception as e:
        raise e

def retrieve_payment_intent(intent_id):
    """
    Récupère une intention de paiement existante pour vérifier son statut
    lorsque l'utilisateur achève le paiement.
    """
    try:
        intent = stripe.PaymentIntent.retrieve(intent_id)
        return intent
    except Exception as e:
        raise e
