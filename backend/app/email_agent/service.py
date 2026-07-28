"""Email intelligence service.

Owns all business logic for the email agent:
- ingest a received email (dedupe by external id),
- run the LangGraph pipeline to summarize, extract, and draft,
- persist results and automatically attach the email to a case,
- draft and send replies through the provider abstraction.

Routes stay thin and delegate here. The service owns the transaction boundary.
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.ai.base import LLMClient
from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.email_agent.enums import EmailProvider, EmailStatus, EmailUrgency
from app.email_agent.graph import build_email_graph
from app.email_agent.model import Email
from app.email_agent.providers.clients import get_provider
from app.email_agent.repository import EmailRepository
from app.email_agent.schemas import IncomingEmail, ReplyResponse
from app.email_agent.state import EmailAgentState
from app.models.enums import ActivityType
from app.repositories.case_repository import CaseRepository
from app.repositories.client_repository import ClientRepository
from app.services.activity_logger import log_activity

logger = get_logger(__name__)


class EmailService:
    def __init__(self, db: Session, llm: LLMClient) -> None:
        self.db = db
        self.llm = llm
        self.repo = EmailRepository(db)
        self.clients = ClientRepository(db)
        self.cases = CaseRepository(db)

    # ---- ingestion -------------------------------------------------------

    def ingest(self, incoming: IncomingEmail) -> Email:
        """Receive an email, run the agent, persist, and attach to a case."""
        # Dedupe on provider external id when present.
        if incoming.external_id:
            existing = self.repo.get_by_external_id(incoming.external_id)
            if existing is not None:
                return existing

        email = Email(
            provider=incoming.provider,
            sender=incoming.sender,
            receiver=incoming.receiver,
            subject=incoming.subject,
            body=incoming.body,
            external_id=incoming.external_id,
            received_at=incoming.received_at or datetime.now(UTC),
            status=EmailStatus.RECEIVED,
        )
        self.repo.add(email)
        self.db.commit()
        self.db.refresh(email)

        # Deterministic sender->client match first (exact email wins over LLM).
        sender_client = self.clients.get_by_email(incoming.sender)

        try:
            self._run_agent(email, sender_client_id=sender_client.id if sender_client else None)
        except Exception as exc:  # noqa: BLE001 - record and surface failure
            logger.exception("Email agent failed for email=%s", email.id)
            email.status = EmailStatus.FAILED
            email.processing_error = str(exc)
            self.db.commit()
            self.db.refresh(email)

        return email

    def _run_agent(self, email: Email, *, sender_client_id: int | None) -> None:
        known_clients = [
            {"id": c.id, "name": c.full_name}
            for c in self.clients.list(skip=0, limit=500)
        ]
        known_cases = [
            {"id": c.id, "title": c.title}
            for c in self.cases.list_with_relations(skip=0, limit=500)
        ]

        graph = build_email_graph(self.llm)
        initial: EmailAgentState = {
            "email_id": email.id,
            "sender": email.sender,
            "subject": email.subject,
            "body": email.body,
            "known_clients": known_clients,
            "known_cases": known_cases,
        }
        result: EmailAgentState = graph.invoke(initial)

        # Persist agent outputs (the "Update Database" step).
        email.summary = result.get("summary")
        email.tasks = result.get("tasks", [])
        email.deadlines = result.get("deadlines", [])
        email.urgency = result.get("urgency")
        email.draft_reply = result.get("draft_reply")

        # Client: prefer the deterministic sender match; fall back to the agent.
        email.client_id = sender_client_id or result.get("client_id")

        # Automatically attach to a case when the agent matched one.
        matched_case_id = result.get("case_id")
        if matched_case_id is not None:
            email.case_id = matched_case_id
            log_activity(
                self.db,
                activity_type=ActivityType.CASE_UPDATED,
                description=f"Email from {email.sender} attached to case",
                case_id=matched_case_id,
                client_id=email.client_id,
            )

        email.status = EmailStatus.PROCESSED
        self.db.commit()
        self.db.refresh(email)
        logger.info(
            "Processed email=%s case=%s client=%s urgency=%s",
            email.id, email.case_id, email.client_id,
            email.urgency.value if email.urgency else None,
        )

        # Extract court deadlines from the email (Sprint 7). Best-effort: a
        # failure here must not fail email processing.
        try:
            from app.deadlines.enums import DeadlineSource
            from app.deadlines.service import DeadlineService

            source_text = f"Subject: {email.subject}\n\n{email.body}"
            DeadlineService(self.db, self.llm).extract_from_source(
                source_text=source_text,
                case_id=email.case_id,
                source=DeadlineSource.EMAIL,
                source_reference=f"email:{email.id}",
            )
        except Exception:  # noqa: BLE001 - deadline extraction is best-effort
            logger.exception("Deadline extraction failed for email=%s", email.id)

    # ---- reads -----------------------------------------------------------

    def get(self, email_id: int) -> Email:
        email = self.repo.get_with_relations(email_id)
        if email is None:
            raise NotFoundError("Email not found")
        return email

    def list(self, **filters) -> list[Email]:
        return self.repo.list(**filters)

    # ---- replies ---------------------------------------------------------

    def send_reply(
        self, email_id: int, body: str, subject: str | None, access_token: str | None = None
    ) -> ReplyResponse:
        email = self.get(email_id)
        if not body.strip():
            raise ValidationError("Reply body cannot be empty")

        reply_subject = subject or self._default_reply_subject(email.subject)
        provider = get_provider(email.provider, access_token)

        sent = False
        channel = "draft"
        # Attempt real send only when a provider token is available.
        if access_token:
            provider.send_reply(
                to=email.sender,
                subject=reply_subject,
                body=body,
                in_reply_to=email.external_id,
            )
            sent = True
            channel = email.provider.value

        email.status = EmailStatus.REPLIED
        self.db.commit()

        logger.info("Reply for email=%s sent=%s channel=%s", email_id, sent, channel)
        return ReplyResponse(
            email_id=email_id,
            sent=sent,
            channel=channel,
            subject=reply_subject,
            body=body,
        )

    @staticmethod
    def _default_reply_subject(subject: str) -> str:
        s = subject or ""
        return s if s.lower().startswith("re:") else f"Re: {s}".strip()

    # ---- provider sync ---------------------------------------------------

    def sync_from_provider(
        self, provider: EmailProvider, access_token: str | None, *, limit: int = 25
    ) -> list[Email]:
        """Fetch unread emails from a provider and ingest each."""
        client = get_provider(provider, access_token)
        fetched = client.fetch_unread(limit=limit)
        return [self.ingest(msg) for msg in fetched]
