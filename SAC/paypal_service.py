import os
import requests
from requests.auth import HTTPBasicAuth
from dotenv import load_dotenv

load_dotenv()

# We use the live API since these credentials seem real. Change to sandbox if needed.
PAYPAL_CLIENT_ID = "ATJOYBkL9uR-7ITAZYAv-BEa0_RsJZHoSQ6Z5yqEXW00D-7dTwbXzrGxFH1w9TlOisbmfdn34QzcxjN4"
PAYPAL_SECRET = "ECmbd42vr0tR9BgpGXkl2KxMkQHByaHkYGxMkSwUGTvzsyaTmPTNQyyAto7x1blP8oKyFxj-zzyqxNG2"
PAYPAL_API_BASE = "https://api-m.sandbox.paypal.com"

def get_paypal_access_token():
    url = f"{PAYPAL_API_BASE}/v1/oauth2/token"
    auth = HTTPBasicAuth(PAYPAL_CLIENT_ID, PAYPAL_SECRET)
    headers = {"Accept": "application/json", "Accept-Language": "en_US"}
    data = {"grant_type": "client_credentials"}
    response = requests.post(url, headers=headers, data=data, auth=auth)
    response.raise_for_status()
    return response.json()["access_token"]

def create_order(amount, currency="EUR"):
    access_token = get_paypal_access_token()
    url = f"{PAYPAL_API_BASE}/v2/checkout/orders"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "amount": {
                    "currency_code": currency,
                    "value": str(amount)
                }
            }
        ]
    }
    response = requests.post(url, headers=headers, json=payload)
    response.raise_for_status()
    return response.json()

def capture_order(order_id):
    access_token = get_paypal_access_token()
    url = f"{PAYPAL_API_BASE}/v2/checkout/orders/{order_id}/capture"
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
    response = requests.post(url, headers=headers)
    response.raise_for_status()
    return response.json()
