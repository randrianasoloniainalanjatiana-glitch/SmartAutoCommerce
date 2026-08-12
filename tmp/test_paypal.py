import requests
from requests.auth import HTTPBasicAuth

PAYPAL_CLIENT_ID = "AUK5ipurA2O7VoUFTM99bS7bkoT5HztegpkcD__An-3HsRNUukYXT5to-7kXSRGH6ttLyB3GAgVjwEgK"
PAYPAL_SECRET = "ELNiqVwKwom3DrewjllO2zUgtIVaB_nEZldHe3JRY_C7UlPRoOl-6Lg0g5KcnYzJ9FSVcjBXEn2kN15o"
PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"

def test_paypal():
    try:
        url = f"{PAYPAL_API_BASE}/v1/oauth2/token"
        auth = HTTPBasicAuth(PAYPAL_CLIENT_ID, PAYPAL_SECRET)
        headers = {"Accept": "application/json", "Accept-Language": "en_US"}
        data = {"grant_type": "client_credentials"}
        response = requests.post(url, headers=headers, data=data, auth=auth)
        response.raise_for_status()
        access_token = response.json()["access_token"]
        print("Token OK")
        
        url_order = f"{PAYPAL_API_BASE}/v2/checkout/orders"
        headers_order = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "amount": {
                        "currency_code": "EUR",
                        "value": "19.99"
                    }
                }
            ]
        }
        res_order = requests.post(url_order, headers=headers_order, json=payload)
        res_order.raise_for_status()
        print("Order OK:", res_order.json()["id"])
    except Exception as e:
        print("FAILED:", e)
        if hasattr(e, 'response') and e.response is not None:
            print(e.response.text)

test_paypal()
