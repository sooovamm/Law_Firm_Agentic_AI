"""Case repository."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import joinedload, selectinload

from app.models.case import Case
from app.models.enums import CaseStatus, CaseUrgency, PracticeArea
from app.repositories.base import BaseRepository


class CaseRepository(BaseRepository[Case]):
    model = Case

    def get_with_relations(self, case_id: int) -> Case | None:
        stmt = (
            select(Case)
            .where(Case.id == case_id)
            .options(joinedload(Case.client), joinedload(Case.assigned_lawyer))
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_full(self, case_id: int) -> Case | None:
        """Load a case with all relationships needed for the detail page."""
        stmt = (
            select(Case)
            .where(Case.id == case_id)
            .options(
                joinedload(Case.client),
                joinedload(Case.assigned_lawyer),
                selectinload(Case.documents),
                selectinload(Case.notes),
                selectinload(Case.events),
            )
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def list_filtered(
        self,
        *,
        practice_area: PracticeArea | None = None,
        assigned_lawyer_id: int | None = None,
        status: CaseStatus | None = None,
        urgency: CaseUrgency | None = None,
        created_from: datetime | None = None,
        created_to: datetime | None = None,
        query: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Case]:
        stmt = select(Case).options(
            joinedload(Case.client), joinedload(Case.assigned_lawyer)
        )

        if practice_area is not None:
            stmt = stmt.where(Case.practice_area == practice_area)
        if assigned_lawyer_id is not None:
            stmt = stmt.where(Case.assigned_lawyer_id == assigned_lawyer_id)
        if status is not None:
            stmt = stmt.where(Case.status == status)
        if urgency is not None:
            stmt = stmt.where(Case.urgency == urgency)
        if created_from is not None:
            stmt = stmt.where(Case.created_at >= created_from)
        if created_to is not None:
            stmt = stmt.where(Case.created_at <= created_to)
        if query:
            stmt = stmt.where(Case.title.ilike(f"%{query}%"))

        stmt = stmt.order_by(Case.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().unique().all())

    def list_with_relations(self, *, skip: int = 0, limit: int = 100) -> list[Case]:
        return self.list_filtered(skip=skip, limit=limit)

    def count_by_status(self, status: CaseStatus) -> int:
        stmt = select(func.count()).select_from(Case).where(Case.status == status)
        return self.db.execute(stmt).scalar_one()

    def count_by_practice_area(self) -> list[tuple[str, int]]:
        stmt = select(Case.practice_area, func.count()).group_by(Case.practice_area)
        return [(row[0].value, row[1]) for row in self.db.execute(stmt).all()]

    def count_by_status_grouped(self) -> list[tuple[str, int]]:
        stmt = select(Case.status, func.count()).group_by(Case.status)
        return [(row[0].value, row[1]) for row in self.db.execute(stmt).all()]

    def urgent_cases(self, *, limit: int = 5) -> list[Case]:
        """High/critical urgency, still-open cases, most recently updated first."""
        stmt = (
            select(Case)
            .options(joinedload(Case.client), joinedload(Case.assigned_lawyer))
            .where(
                Case.urgency.in_([CaseUrgency.HIGH, CaseUrgency.CRITICAL]),
                Case.status != CaseStatus.CLOSED,
            )
            .order_by(Case.updated_at.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().unique().all())
