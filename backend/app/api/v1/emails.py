"""Email intelligence endpoints. Thin: delegate to EmailService."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.ai.base import LLMClient
from app.ai.factory import get_llm_client
from app.auth.dependencies import get_current_user, require_roles
from app.database.session import get_db
from app.email_agent.enums import EmailProvider, EmailStatus, EmailUrgency
from app.email_agent.schemas import (
    EmailDetail,
    EmailRead,
    IncomingEmail,
    ReplyRequest,
    ReplyResponse,
)
from app.email_agent.serializers import to_detail, to_read
from app.email_agent.service import EmailService
from app.models.enums import UserRole
from app.models.user import User

router = APIRouter(prefix="/emails", tags=["emails"])


def get_llm() -> LLMClient:
    return get_llm_client()


@router.get("", response_model=list[EmailRead])
def list_emails(
    q: str | None = Query(default=None, description="Search subject, sender, body, summary"),
    email_status: EmailStatus | None = Query(default=None, alias="status"),
    urgency: EmailUrgency | None = Query(default=None),
    case_id: int | None = Query(default=None),
    client_id: int | None = Query(default=None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
    _: User = Depends(get_current_user),
) -> list[EmailRead]:
    emails = EmailService(db, llm).list(
        q=q,
        status=email_status,
        urgency=urgency,
        case_id=case_id,
        client_id=client_id,
        skip=skip,
        limit=limit,
    )
    return [to_read(e) for e in emails]


@router.post("/ingest", response_model=EmailDetail, status_code=status.HTTP_201_CREATED)
def ingest_email(
    payload: IncomingEmail,
    db: Session = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> EmailDetail:
    """Receive an email and run the intelligence pipeline.

    Used by provider webhooks and for manual/testing ingestion. Live mailbox
    sync uses the same service path via `sync_from_provider`.
    """
    email = EmailService(db, llm).ingest(payload)
    return to_detail(EmailService(db, llm).get(email.id))


@router.post("/reply", response_model=ReplyResponse)
def reply_email(
    payload: ReplyRequest,
    db: Session = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.LAWYER, UserRole.PARALEGAL)),
) -> ReplyResponse:
    """Approve/send a reply to an email.

    Without a connected provider token this records the approved reply (channel
    "draft"); with a token wired in it sends through Gmail/Outlook.
    """
    return EmailService(db, llm).send_reply(
        payload.email_id, payload.body, payload.subject
    )


@router.get("/{email_id}", response_model=EmailDetail)
def get_email(
    email_id: int,
    db: Session = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
    _: User = Depends(get_current_user),
) -> EmailDetail:
    return to_detail(EmailService(db, llm).get(email_id))
