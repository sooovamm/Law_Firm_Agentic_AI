"""Deadline management service.

Owns all business logic:
- CRUD for deadlines,
- extraction orchestration: run the graph over a source text, then create
  deadlines (deduped) and notify the assigned lawyer,
- dashboard bucketing (overdue / today / upcoming),
- reminder dispatch for deadlines nearing their due date.

Routes stay thin and delegate here. The service owns the transaction boundary.
Extraction is safe to call repeatedly: the dedup key plus a unique constraint
guarantee the same deadline is never created twice.
"""
from __future__ import annotations

from datetime import UTC, datetime, time, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.ai.base import LLMClient
from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.deadlines.dedup import compute_dedup_key
from app.deadlines.enums import DeadlinePriority, DeadlineSource, DeadlineType
from app.deadlines.graph import build_deadline_graph
from app.deadlines.model import Deadline
from app.deadlines.notifications import (
    notify_lawyer_new_deadlines,
    send_deadline_reminder,
)
from app.deadlines.repository import DeadlineRepository
from app.deadlines.schemas import DeadlineCreate, DeadlineUpdate
from app.deadlines.state import DeadlineAgentState
from app.models.case import Case
from app.models.enums import ActivityType
from app.services.activity_logger import log_activity

logger = get_logger(__name__)

# How far ahead to look when dispatching reminders.
REMINDER_HORIZON_DAYS = 3


class DeadlineService:
    def __init__(self, db: Session, llm: LLMClient | None = None) -> None:
        self.db = db
        self.llm = llm
        self.repo = DeadlineRepository(db)

    # ---- CRUD ------------------------------------------------------------

    def create(self, data: DeadlineCreate) -> Deadline:
        if data.case_id is not None and self.db.get(Case, data.case_id) is None:
            raise ValidationError(f"Case id={data.case_id} does not exist")

        deadline = self._persist_deadline(
            case_id=data.case_id,
            title=data.title,
            due_date=data.due_date,
            deadline_type=data.deadline_type,
            priority=data.priority,
            source=DeadlineSource.MANUAL,
            notes=data.notes,
        )
        if deadline is None:
            # Duplicate of an existing deadline; return the existing one.
            key = compute_dedup_key(
                case_id=data.case_id,
                deadline_type=data.deadline_type,
                due_date=data.due_date,
                title=data.title,
            )
            existing = self.repo.get_by_dedup(data.case_id, key)
            if existing is not None:
                return existing
            raise ValidationError("Could not create deadline")
        self.db.commit()
        self.db.refresh(deadline)
        return deadline

    def update(self, deadline_id: int, data: DeadlineUpdate) -> Deadline:
        deadline = self._get(deadline_id)
        payload = data.model_dump(exclude_unset=True)

        for field in ("title", "due_date", "completed", "priority", "deadline_type", "notes"):
            if field in payload and payload[field] is not None:
                setattr(deadline, field, payload[field])

        # Keep the dedup key in sync if identifying fields changed.
        if any(k in payload for k in ("title", "due_date", "deadline_type")):
            deadline.dedup_key = compute_dedup_key(
                case_id=deadline.case_id,
                deadline_type=deadline.deadline_type,
                due_date=deadline.due_date,
                title=deadline.title,
            )
        self.db.commit()
        self.db.refresh(deadline)
        return deadline

    def delete(self, deadline_id: int) -> None:
        deadline = self._get(deadline_id)
        self.repo.delete(deadline)
        self.db.commit()

    def get(self, deadline_id: int) -> Deadline:
        deadline = self.repo.get_with_case(deadline_id)
        if deadline is None:
            raise NotFoundError("Deadline not found")
        return deadline

    def list(self, **filters) -> list[Deadline]:
        return self.repo.list(**filters)

    # ---- extraction ------------------------------------------------------

    def extract_from_source(
        self,
        *,
        source_text: str,
        case_id: int | None,
        source: DeadlineSource,
        source_reference: str | None,
    ) -> list[Deadline]:
        """Run the graph over a source and create deduped deadlines.

        Safe to call repeatedly for the same source: duplicates are skipped.
        Returns the deadlines newly created by this call.
        """
        if self.llm is None:
            raise ValidationError("An LLM client is required for extraction")
        if not source_text or not source_text.strip():
            return []

        graph = build_deadline_graph(self.llm)
        initial: DeadlineAgentState = {
            "case_id": case_id,
            "source_text": source_text,
            "source_label": source_reference or source.value,
        }
        result: DeadlineAgentState = graph.invoke(initial)

        created: list[Deadline] = []
        for item in result.get("valid_deadlines", []):
            due = datetime.fromisoformat(item["due_date"])
            deadline = self._persist_deadline(
                case_id=case_id,
                title=item["title"],
                due_date=due,
                deadline_type=DeadlineType(item["deadline_type"]),
                priority=DeadlinePriority(item.get("priority", "medium")),
                source=source,
                source_reference=source_reference,
                notes=None,
                commit=False,
            )
            if deadline is not None:
                created.append(deadline)

        if created:
            log_activity(
                self.db,
                activity_type=ActivityType.EVENT_SCHEDULED,
                description=f"{len(created)} deadline(s) extracted from {source.value}",
                case_id=case_id,
            )
        self.db.commit()

        # Notify Lawyer (post-persist side effect).
        self._notify_new(case_id, len(created))
        for d in created:
            self.db.refresh(d)
        logger.info(
            "Extraction from %s created %d new deadline(s)", source_reference, len(created)
        )
        return created

    # ---- dashboard buckets ----------------------------------------------

    def buckets(self) -> dict[str, list[Deadline]]:
        now = datetime.now(UTC)
        day_start = datetime.combine(now.date(), time.min, tzinfo=UTC)
        day_end = day_start + timedelta(days=1)
        upcoming_end = day_end + timedelta(days=14)

        return {
            "overdue": self.repo.overdue(now=now),
            "today": self.repo.between(start=day_start, end=day_end),
            "upcoming": self.repo.between(start=day_end, end=upcoming_end),
        }

    def calendar(self, *, start: datetime, end: datetime) -> list[Deadline]:
        return self.repo.between(start=start, end=end, include_completed=True, limit=500)

    # ---- reminders -------------------------------------------------------

    def dispatch_reminders(self) -> int:
        """Send reminders for deadlines within the horizon. Returns count sent."""
        now = datetime.now(UTC)
        horizon = now + timedelta(days=REMINDER_HORIZON_DAYS)
        due = self.repo.due_for_reminder(now=now, horizon=horizon)
        sent = 0
        for deadline in due:
            recipient = self._lawyer_email(deadline.case)
            send_deadline_reminder(deadline, recipient)
            deadline.reminder_sent = True
            sent += 1
        if sent:
            self.db.commit()
        return sent

    # ---- internals -------------------------------------------------------

    def _get(self, deadline_id: int) -> Deadline:
        deadline = self.repo.get(deadline_id)
        if deadline is None:
            raise NotFoundError("Deadline not found")
        return deadline

    def _persist_deadline(
        self,
        *,
        case_id: int | None,
        title: str,
        due_date: datetime,
        deadline_type: DeadlineType,
        priority: DeadlinePriority,
        source: DeadlineSource,
        source_reference: str | None = None,
        notes: str | None = None,
        commit: bool = True,
    ) -> Deadline | None:
        """Insert a deadline, skipping duplicates. Returns None if a duplicate.

        Dedup is enforced two ways: a pre-check for a friendly path, and the DB
        unique constraint as the source of truth (handles races).
        """
        key = compute_dedup_key(
            case_id=case_id, deadline_type=deadline_type, due_date=due_date, title=title
        )
        if self.repo.get_by_dedup(case_id, key) is not None:
            return None

        deadline = Deadline(
            case_id=case_id,
            title=title,
            due_date=due_date,
            deadline_type=deadline_type,
            priority=priority,
            source=source,
            source_reference=source_reference,
            notes=notes,
            dedup_key=key,
        )
        self.db.add(deadline)
        try:
            self.db.flush()
        except IntegrityError:
            # Lost a race to another inserter; treat as duplicate.
            self.db.rollback()
            return None
        if commit:
            self.db.commit()
            self.db.refresh(deadline)
        return deadline

    def _notify_new(self, case_id: int | None, count: int) -> None:
        if count <= 0:
            return
        recipient = None
        if case_id is not None:
            case = self.db.get(Case, case_id)
            recipient = self._lawyer_email(case)
        notify_lawyer_new_deadlines(case_id, count, recipient)

    @staticmethod
    def _lawyer_email(case: Case | None) -> str | None:
        if case is not None and case.assigned_lawyer is not None:
            return case.assigned_lawyer.email
        return None
