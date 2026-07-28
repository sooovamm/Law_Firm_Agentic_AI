"""Read-side aggregations for the dashboard.

Kept as a dedicated repository because these queries span multiple tables and
don't belong to any single entity repository.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.documents.model import Document
from app.models.activity import ActivityLog
from app.models.case import Case
from app.models.case_activity import CaseEvent
from app.models.client import Client
from app.models.enums import CaseEventType
from app.scheduling.enums import ACTIVE_STATUSES
from app.scheduling.model import Consultation


class DashboardRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def new_clients_count(self, since: datetime) -> int:
        stmt = (
            select(func.count())
            .select_from(Client)
            .where(Client.created_at >= since)
        )
        return self.db.execute(stmt).scalar_one()

    def events_between(
        self, start: datetime, end: datetime, event_type: CaseEventType | None = None
    ) -> list[CaseEvent]:
        stmt = (
            select(CaseEvent)
            .where(CaseEvent.scheduled_at >= start, CaseEvent.scheduled_at < end)
        )
        if event_type is not None:
            stmt = stmt.where(CaseEvent.event_type == event_type)
        stmt = stmt.order_by(CaseEvent.scheduled_at)
        return list(self.db.execute(stmt).scalars().all())

    def todays_consultations_count(self, day_start: datetime, day_end: datetime) -> int:
        """Count active (pending/confirmed) consultations scheduled today."""
        stmt = (
            select(func.count())
            .select_from(Consultation)
            .where(
                Consultation.status.in_(tuple(ACTIVE_STATUSES)),
                Consultation.scheduled_time >= day_start,
                Consultation.scheduled_time < day_end,
            )
        )
        return self.db.execute(stmt).scalar_one()

    def upcoming_consultations(self, *, now: datetime, limit: int = 5) -> list[Consultation]:
        stmt = (
            select(Consultation)
            .options(
                joinedload(Consultation.lawyer),
                joinedload(Consultation.client),
            )
            .where(
                Consultation.status.in_(tuple(ACTIVE_STATUSES)),
                Consultation.scheduled_time >= now,
            )
            .order_by(Consultation.scheduled_time)
            .limit(limit)
        )
        return list(self.db.execute(stmt).unique().scalars().all())

    def upcoming_events(self, *, now: datetime, limit: int = 5) -> list[CaseEvent]:
        stmt = (
            select(CaseEvent)
            .options(joinedload(CaseEvent.case))
            .where(CaseEvent.scheduled_at >= now)
            .order_by(CaseEvent.scheduled_at)
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())

    def recent_documents(self, *, limit: int = 5) -> list[Document]:
        stmt = select(Document).order_by(Document.created_at.desc()).limit(limit)
        return list(self.db.execute(stmt).scalars().all())

    def recent_activity(self, *, limit: int = 10) -> list[ActivityLog]:
        stmt = select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(limit)
        return list(self.db.execute(stmt).scalars().all())
