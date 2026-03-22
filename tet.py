import requests
from requests.auth import HTTPBasicAuth

# ✅ Tes credentials sandbox
PAYPAL_CLIENT_ID = "AUK5ipurA2O7VoUFTM99bS7bkoT5HztegpkcD__An-3HsRNUukYXT5to-7kXSRGH6ttLyB3GAgVjwEgK"
PAYPAL_SECRET = "ELNiqVwKwom3DrewjllO2zUgtIVaB_nEZldHe3JRY_C7UlPRoOl-6Lg0g5KcnYzJ9FSVcjBXEn2kN15o"  # ← remplace ça
PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"

def get_access_token():
    response = requests.post(
        f"{PAYPAL_API_BASE}/v1/oauth2/token",
        auth=HTTPBasicAuth(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
        headers={"Accept": "application/json"},
        data={"grant_type": "client_credentials"}
    )
    response.raise_for_status()
    return response.json()["access_token"]

def create_order(amount="10.00", currency="USD"):
    token = get_access_token()
    response = requests.post(
        f"{PAYPAL_API_BASE}/v2/checkout/orders",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        },
        json={
            "intent": "CAPTURE",
            "purchase_units": [{
                "amount": {
                    "currency_code": currency,
                    "value": amount
                }
            }],
            "application_context": {
                "return_url": "http://localhost:8000/success",
                "cancel_url": "http://localhost:8000/cancel",
                "user_action": "PAY_NOW"
            }
        }
    )
    response.raise_for_status()
    return response.json()

def capture_order(order_id):
    token = get_access_token()
    response = requests.post(
        f"{PAYPAL_API_BASE}/v2/checkout/orders/{order_id}/capture",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }
    )
    response.raise_for_status()
    return response.json()

# ▶️ LANCER LE TEST
if __name__ == "__main__":
    print("1. Création de l'ordre...")
    order = create_order(amount="10.00")
    
    order_id = order["id"]
    print(f"   Order ID : {order_id}")
    
    # Récupère le lien d'approbation
    approve_url = next(
        link["href"] for link in order["links"] 
        if link["rel"] == "approve"
    )
    print(f"\n2. Ouvre ce lien dans ton navigateur :")
    print(f"   👉 {approve_url}")
    print(f"\n   Connecte-toi avec :")
    print(f"   Email    : tokiniainaeddy@personal.example.com")
    print(f"   Password : (ton mot de passe sandbox personal)")
    
    print(f"\n3. Après approbation, appuie sur ENTRÉE pour capturer...")
    input()
    
    print("   Capture en cours...")
    result = capture_order(order_id)
    print(f"   ✅ Statut : {result['status']}")
    print(f"   Détails  : {result}")