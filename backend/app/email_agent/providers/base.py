"""Email provider abstraction.

Gmail and Outlook are accessed through this Protocol so the ingestion and reply
logic never depends on a specific SDK. Real providers require OAuth credentials;
when those aren't configured the factory returns a null provider that raises a
clear error on send and yields nothing on fetch, so the rest of the system runs.
"""
from __future__ import annotations

from typing import Protocol

from app.email_agent.schemas import IncomingEmail


class EmailProviderClient(Protocol):
    """Minimal interface the email agent needs from a mail provider."""

    name: str

    def fetch_unread(self, *, limit: int = 25) -> list[IncomingEmail]:
        """Return recently received, unprocessed emails."""
        ...

    def send_reply(
        self, *, to: str, subject: str, body: str, in_reply_to: str | None = None
    ) -> str:
        """Send a reply. Returns a provider message id."""
        ...
