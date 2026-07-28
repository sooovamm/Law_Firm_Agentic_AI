"""Client confirmation delivery.

No real email/SMS provider is wired in this sprint, so confirmations are
recorded via the logger and returned to the caller. The interface is isolated
here so a real provider (SES, Twilio, etc.) can be dropped in without touching
scheduling logic.
"""
from __future__ import annotations

from app.core.logging import get_logger
from app.scheduling.model import Consultation
from app.scheduling.schemas import ConfirmationMessage

logger = get_logger(__name__)


def send_client_confirmation(
    consultation: Consultation, client_email: str | None, client_name: str | None
) -> ConfirmationMessage:
    when = consultation.scheduled_time.strftime("%Y-%m-%d %H:%M UTC")
    name = client_name or "there"
    body = (
        f"Hello {name}, your consultation is scheduled for {when}. "
        f"Current status: {consultation.status.value}. "
        "You will be notified of any changes."
    )
    logger.info(
        "Consultation confirmation for consultation=%s recipient=%s",
        consultation.id,
        client_email or "(no email on file)",
    )
    return ConfirmationMessage(
        consultation_id=consultation.id,
        channel="log",
        recipient=client_email,
        message=body,
    )
