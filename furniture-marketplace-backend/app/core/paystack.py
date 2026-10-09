import hashlib
import hmac
from typing import Any
from urllib.parse import quote

import httpx

from app.core.config import Settings

PAYSTACK_API_URL = "https://api.paystack.co"


def verify_webhook_signature(raw_body: bytes, signature: str, secret_key: str) -> bool:
    expected = hmac.new(
        secret_key.encode("utf-8"), raw_body, hashlib.sha512
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def initialize_transaction(
    *,
    settings: Settings,
    reference: str,
    amount_minor: int,
    email: str,
    callback_url: str,
) -> str:
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{PAYSTACK_API_URL}/transaction/initialize",
            headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"},
            json={
                "email": email,
                "amount": amount_minor,
                "currency": "ZAR",
                "reference": reference,
                "callback_url": callback_url,
            },
        )
    response.raise_for_status()
    payload = response.json()
    data = payload.get("data")
    if (
        payload.get("status") is not True
        or not isinstance(data, dict)
        or data.get("reference") != reference
        or not isinstance(data.get("authorization_url"), str)
        or not data["authorization_url"].startswith("https://")
    ):
        raise ValueError("Paystack returned an invalid transaction initialization")
    return data["authorization_url"]


async def verify_transaction(reference: str, settings: Settings) -> dict[str, Any]:
    encoded_reference = quote(reference, safe="")
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{PAYSTACK_API_URL}/transaction/verify/{encoded_reference}",
            headers={"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}"},
        )
    response.raise_for_status()
    payload = response.json()
    data = payload.get("data")
    if payload.get("status") is not True or not isinstance(data, dict):
        raise ValueError("Paystack returned an invalid transaction verification")
    return data
