import asyncio
from html import escape
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings


def _send_smtp(message: EmailMessage, host: str, port: int, username: str, password: str, use_tls: bool) -> None:
    with smtplib.SMTP(host, port, timeout=20) as server:
        if use_tls:
            server.starttls()
        if username:
            server.login(username, password)
        server.send_message(message)


async def send_email(
    recipient: str,
    subject: str,
    body: str,
    *,
    action_url: str = "",
    action_text: str = "",
) -> None:
    settings = get_settings()
    if not settings.SMTP_HOST or not settings.SMTP_FROM_EMAIL:
        raise RuntimeError("SMTP email is not configured")

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM_EMAIL
    message["To"] = recipient
    message["Subject"] = subject
    message.set_content(body)
    if action_url:
        safe_url = escape(action_url, quote=True)
        safe_text = escape(action_text or "Continue", quote=True)
        message.add_alternative(
            "<html><body>"
            f"<pre style=\"font-family: Arial, sans-serif; white-space: pre-wrap;\">{escape(body)}</pre>"
            f'<p><a href="{safe_url}">{safe_text}</a></p>'
            "</body></html>",
            subtype="html",
        )

    try:
        await asyncio.to_thread(
            _send_smtp,
            message,
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            settings.SMTP_USERNAME,
            settings.SMTP_PASSWORD,
            settings.SMTP_USE_TLS,
        )
    except (OSError, smtplib.SMTPException) as error:
        raise RuntimeError(f"SMTP email delivery failed: {error}") from error
