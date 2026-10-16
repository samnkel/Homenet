import httpx

from app.core.config import get_settings

EMAILJS_SEND_URL = "https://api.emailjs.com/api/v1.0/email/send"


async def send_email(
    recipient: str,
    subject: str,
    body: str,
    *,
    action_url: str = "",
    action_text: str = "",
) -> None:
    settings = get_settings()
    if not all(
        (
            settings.EMAILJS_SERVICE_ID,
            settings.EMAILJS_TEMPLATE_ID,
            settings.EMAILJS_PUBLIC_KEY,
            settings.EMAILJS_PRIVATE_KEY,
        )
    ):
        raise RuntimeError("EmailJS is not configured")

    payload = {
        "service_id": settings.EMAILJS_SERVICE_ID,
        "template_id": settings.EMAILJS_TEMPLATE_ID,
        "user_id": settings.EMAILJS_PUBLIC_KEY,
        "accessToken": settings.EMAILJS_PRIVATE_KEY,
        "template_params": {
            "to_email": recipient,
            "subject": subject,
            "message": body,
            "action_url": action_url,
            "action_text": action_text,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(EMAILJS_SEND_URL, json=payload)
            response.raise_for_status()
    except httpx.HTTPStatusError as error:
        response_detail = error.response.text[:500]
        raise RuntimeError(
            f"EmailJS rejected the request ({error.response.status_code}): {response_detail}"
        ) from error
    except httpx.HTTPError as error:
        raise RuntimeError("EmailJS request failed before a response was received") from error