"""Data access for consultations, including overlap detection."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, joinedload

from app.scheduling.enums import ACTIVE_STATUSES, ConsultationStatus
from app.scheduling.model import Consultation


def _aware(dt: datetime) -> datetime:
    """Coerce a possibly-naive datetime (from SQLite) to UTC-aware."""
    return dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt


class ConsultationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def add(self, consultation: Consultation) -> Consultation:
        self.db.add(consultation)
        self.db.flush()
        self.db.refresh(consultation)
        return consultation

    def get(self, consultation_id: int) -> Consultation | None:
        return self.db.get(Consultation, consultation_id)

    def get_with_relations(self, consultation_id: int) -> Consultation | None:
        stmt = (
            select(Consultation)
            .where(Consultation.id == consultation_id)
            .options(
                joinedload(Consultation.lawyer),
                joinedload(Consultation.client),
                joinedload(Consultation.case),
            )
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def delete(self, consultation: Consultation) -> None:
        self.db.delete(consultation)
        self.db.flush()

    def list(
        self,
        *,
        lawyer_id: int | None = None,
        client_id: int | None = None,
        case_id: int | None = None,
        status: ConsultationStatus | None = None,
        start_from: datetime | None = None,
        start_to: datetime | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Consultation]:
        stmt = select(Consultation).options(
            joinedload(Consultation.lawyer),
            joinedload(Consultation.client),
            joinedload(Consultation.case),
        )
        if lawyer_id is not None:
            stmt = stmt.where(Consultation.lawyer_id == lawyer_id)
        if client_id is not None:
            stmt = stmt.where(Consultation.client_id == client_id)
        if case_id is not None:
            stmt = stmt.where(Consultation.case_id == case_id)
        if status is not None:
            stmt = stmt.where(Consultation.status == status)
        if start_from is not None:
            stmt = stmt.where(Consultation.scheduled_time >= start_from)
        if start_to is not None:
            stmt = stmt.where(Consultation.scheduled_time < start_to)

        stmt = stmt.order_by(Consultation.scheduled_time).offset(skip).limit(limit)
        return list(self.db.execute(stmt).unique().scalars().all())

    def find_overlaps(
        self,
        *,
        lawyer_id: int,
        start: datetime,
        end: datetime,
        exclude_id: int | None = None,
    ) -> list[Consultation]:
        """Return active consultations for a lawyer that overlap [start, end).

        Two intervals overlap when existing.start < new.end AND
        existing.end > new.start. We compute existing.end from its duration.
        """
        # SQLite lacks interval arithmetic in a portable way, so we fetch the
        # lawyer's active consultations in a bounded window and check in Python.
        window_start = start - timedelta(hours=24)
        window_end = end + timedelta(hours=24)

        stmt = select(Consultation).where(
            Consultation.lawyer_id == lawyer_id,
            Consultation.status.in_(tuple(ACTIVE_STATUSES)),
            Consultation.scheduled_time >= window_start,
            Consultation.scheduled_time <= window_end,
        )
        if exclude_id is not None:
            stmt = stmt.where(Consultation.id != exclude_id)

        candidates = self.db.execute(stmt).scalars().all()
        overlaps = []
        for c in candidates:
            c_start = _aware(c.scheduled_time)
            c_end = c_start + timedelta(minutes=c.duration_minutes)
            if c_start < end and c_end > start:
                overlaps.append(c)
        return overlaps

    def active_for_lawyer_on_day(
        self, lawyer_id: int, day_start: datetime, day_end: datetime
    ) -> list[Consultation]:
        stmt = (
            select(Consultation)
            .where(
                Consultation.lawyer_id == lawyer_id,
                Consultation.status.in_(tuple(ACTIVE_STATUSES)),
                Consultation.scheduled_time >= day_start,
                Consultation.scheduled_time < day_end,
            )
            .order_by(Consultation.scheduled_time)
        )
        return list(self.db.execute(stmt).scalars().all())
