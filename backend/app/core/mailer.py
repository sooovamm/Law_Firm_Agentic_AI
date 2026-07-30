"""Outbound email delivery.

Uses plain SMTP so it works with any provider (Gmail app password, Outlook,
SES, SendGrid's SMTP relay, ...) via the SMTP_* settings. When SMTP_HOST is
left blank (e.g. local development without real credentials), falls back to
logging the message instead of sending it.
"""
from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Protocol

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class Mailer(Protocol):
    def send(self, to: str, subject: str, body: str) -> None: ...


class SmtpMailer:
    def send(self, to: str, subject: str, body: str) -> None:
        message = EmailMessage()
        message["From"] = settings.smtp_from_email or settings.smtp_username
        message["To"] = to
        message["Subject"] = subject
        message.set_content(body)

        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)


class ConsoleMailer:
    """Dev fallback: logs the email instead of sending it."""

    def send(self, to: str, subject: str, body: str) -> None:
        logger.warning("SMTP not configured; logging email instead of sending.\nTo: %s\nSubject: %s\n%s", to, subject, body)


def get_mailer() -> Mailer:
    if settings.smtp_host:
        return SmtpMailer()
    return ConsoleMailer()
