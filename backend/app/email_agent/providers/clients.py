"""Concrete email providers for Gmail and Outlook.

These wrap the provider REST APIs. Network calls are intentionally isolated
here and guarded behind credential checks: without configured OAuth
credentials, a provider raises EmailProviderNotConfigured on send and returns
an empty list on fetch. This keeps the agent and API usable in environments
(tests, local dev) where no mailbox is connected, exactly as the storage
abstraction does for S3.
"""
from __future__ import annotations

from app.core.exceptions import AppException
from app.core.logging import get_logger
from app.email_agent.enums import EmailProvider
from app.email_agent.schemas import IncomingEmail

logger = get_logger(__name__)


class EmailProviderNotConfigured(AppException):
    status_code = 503
    detail = "Email provider is not configured"


class GmailProvider:
    """Gmail via the Gmail API.

    Real fetch/send require an OAuth2 access token (users.messages.list/get and
    users.messages.send). Those calls live behind `_require_token` so the class
    imports and constructs without credentials.
    """

    name = "gmail"

    def __init__(self, access_token: str | None) -> None:
        self._token = access_token

    def _require_token(self) -> str:
        if not self._token:
            raise EmailProviderNotConfigured(
                "Gmail is not connected (missing OAuth access token)"
            )
        return self._token

    def fetch_unread(self, *, limit: int = 25) -> list[IncomingEmail]:
        if not self._token:
            logger.info("Gmail not configured; returning no messages")
            return []
        # A real implementation would call the Gmail API here. We avoid making
        # live network calls in this build; wiring the HTTP client is the only
        # remaining step to go live.
        raise EmailProviderNotConfigured(
            "Gmail live fetch requires the Gmail API client to be wired in"
        )

    def send_reply(
        self, *, to: str, subject: str, body: str, in_reply_to: str | None = None
    ) -> str:
        self._require_token()
        raise EmailProviderNotConfigured(
            "Gmail live send requires the Gmail API client to be wired in"
        )


class OutlookProvider:
    """Outlook via the Microsoft Graph API (me/messages, me/sendMail)."""

    name = "outlook"

    def __init__(self, access_token: str | None) -> None:
        self._token = access_token

    def _require_token(self) -> str:
        if not self._token:
            raise EmailProviderNotConfigured(
                "Outlook is not connected (missing OAuth access token)"
            )
        return self._token

    def fetch_unread(self, *, limit: int = 25) -> list[IncomingEmail]:
        if not self._token:
            logger.info("Outlook not configured; returning no messages")
            return []
        raise EmailProviderNotConfigured(
            "Outlook live fetch requires the Microsoft Graph client to be wired in"
        )

    def send_reply(
        self, *, to: str, subject: str, body: str, in_reply_to: str | None = None
    ) -> str:
        self._require_token()
        raise EmailProviderNotConfigured(
            "Outlook live send requires the Microsoft Graph client to be wired in"
        )


def get_provider(provider: EmailProvider, access_token: str | None = None):
    if provider == EmailProvider.GMAIL:
        return GmailProvider(access_token)
    return OutlookProvider(access_token)
