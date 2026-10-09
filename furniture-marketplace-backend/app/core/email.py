import asyncio
import smtplib
import ssl
from email.message import EmailMessage

from app.core.config import get_settings


def _send_email_sync(recipient: str, subject: str, body: str) -> None:
    settings = get_settings()
    sender = settings.SMTP_FROM or settings.SMTP_USERNAME
    if not settings.SMTP_USERNAME or not settings.SMTP_PASSWORD or not sender:
        raise RuntimeError("Gmail SMTP is not configured")

    message = EmailMessage()
    message["From"] = sender
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)

    context = ssl.create_default_context()
    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
        server.starttls(context=context)
        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(message)


async def send_email(recipient: str, subject: str, body: str) -> None:
    await asyncio.to_thread(_send_email_sync, recipient, subject, body)
