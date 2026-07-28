"""Data access for deadlines, including dashboard bucket queries."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.deadlines.enums import DeadlinePriority, DeadlineType
from app.deadlines.model import Deadline


class DeadlineRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, deadline: Deadline) -> Deadline:
        self.db.add(deadline)
        self.db.flush()
        self.db.refresh(deadline)
        return deadline

    def get(self, deadline_id: int) -> Deadline | None:
        return self.db.get(Deadline, deadline_id)

    def get_with_case(self, deadline_id: int) -> Deadline | None:
        stmt = (
            select(Deadline)
            .where(Deadline.id == deadline_id)
            .options(joinedload(Deadline.case))
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def get_by_dedup(self, case_id: int | None, dedup_key: str) -> Deadline | None:
        stmt = select(Deadline).where(
            Deadline.case_id.is_(case_id) if case_id is None else Deadline.case_id == case_id,
            Deadline.dedup_key == dedup_key,
        )
        return self.db.execute(stmt).scalars().first()

    def delete(self, deadline: Deadline) -> None:
        self.db.delete(deadline)
        self.db.flush()

    def list(
        self,
        *,
        case_id: int | None = None,
        completed: bool | None = None,
        priority: DeadlinePriority | None = None,
        deadline_type: DeadlineType | None = None,
        due_before: datetime | None = None,
        due_after: datetime | None = None,
        skip: int = 0,
        limit: int = 200,
    ) -> list[Deadline]:
        stmt = select(Deadline).options(joinedload(Deadline.case))
        if case_id is not None:
            stmt = stmt.where(Deadline.case_id == case_id)
        if completed is not None:
            stmt = stmt.where(Deadline.completed.is_(completed))
        if priority is not None:
            stmt = stmt.where(Deadline.priority == priority)
        if deadline_type is not None:
            stmt = stmt.where(Deadline.deadline_type == deadline_type)
        if due_before is not None:
            stmt = stmt.where(Deadline.due_date < due_before)
        if due_after is not None:
            stmt = stmt.where(Deadline.due_date >= due_after)
        stmt = stmt.order_by(Deadline.due_date).offset(skip).limit(limit)
        return list(self.db.execute(stmt).unique().scalars().all())

    def overdue(self, *, now: datetime, limit: int = 50) -> list[Deadline]:
        stmt = (
            select(Deadline)
            .options(joinedload(Deadline.case))
            .where(Deadline.completed.is_(False), Deadline.due_date < now)
            .order_by(Deadline.due_date)
            .limit(limit)
        )
        return list(self.db.execute(stmt).unique().scalars().all())

    def between(
        self, *, start: datetime, end: datetime, include_completed: bool = False, limit: int = 200
    ) -> list[Deadline]:
        stmt = (
            select(Deadline)
            .options(joinedload(Deadline.case))
            .where(Deadline.due_date >= start, Deadline.due_date < end)
        )
        if not include_completed:
            stmt = stmt.where(Deadline.completed.is_(False))
        stmt = stmt.order_by(Deadline.due_date).limit(limit)
        return list(self.db.execute(stmt).unique().scalars().all())

    def due_for_reminder(self, *, now: datetime, horizon: datetime) -> list[Deadline]:
        """Active, unsent deadlines due within the reminder horizon."""
        stmt = (
            select(Deadline)
            .options(joinedload(Deadline.case))
            .where(
                Deadline.completed.is_(False),
                Deadline.reminder_sent.is_(False),
                Deadline.due_date >= now,
                Deadline.due_date < horizon,
            )
            .order_by(Deadline.due_date)
        )
        return list(self.db.execute(stmt).unique().scalars().all())
