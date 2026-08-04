"""Data access for lawyer profiles and AI match recommendations."""
from __future__ import annotations

from sqlalchemy import or_, select
from sqlalchemy.orm import selectinload

from app.lawyers.enums import LawyerPracticeArea
from app.lawyers.model import LawyerMatchRecommendation, LawyerProfile, LawyerSecondaryPracticeArea
from app.repositories.base import BaseRepository


class LawyerProfileRepository(BaseRepository[LawyerProfile]):
    model = LawyerProfile

    def get_by_user_id(self, user_id: int) -> LawyerProfile | None:
        stmt = (
            select(LawyerProfile)
            .where(LawyerProfile.user_id == user_id)
            .options(selectinload(LawyerProfile.secondary_practice_areas))
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def get_with_relations(self, profile_id: int) -> LawyerProfile | None:
        stmt = (
            select(LawyerProfile)
            .where(LawyerProfile.id == profile_id)
            .options(
                selectinload(LawyerProfile.secondary_practice_areas),
                selectinload(LawyerProfile.user),
            )
        )
        return self.db.execute(stmt).unique().scalar_one_or_none()

    def list_filtered(
        self,
        *,
        practice_area: LawyerPracticeArea | None = None,
        min_experience: int | None = None,
        max_experience: int | None = None,
        accepts_new_clients: bool | None = None,
        max_workload: int | None = None,
        query: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[LawyerProfile]:
        stmt = select(LawyerProfile).options(
            selectinload(LawyerProfile.secondary_practice_areas),
            selectinload(LawyerProfile.user),
        )

        if practice_area is not None:
            stmt = stmt.where(
                or_(
                    LawyerProfile.primary_practice_area == practice_area,
                    LawyerProfile.id.in_(
                        select(LawyerSecondaryPracticeArea.lawyer_profile_id).where(
                            LawyerSecondaryPracticeArea.practice_area == practice_area
                        )
                    ),
                )
            )
        if min_experience is not None:
            stmt = stmt.where(LawyerProfile.years_of_experience >= min_experience)
        if max_experience is not None:
            stmt = stmt.where(LawyerProfile.years_of_experience <= max_experience)
        if accepts_new_clients is not None:
            stmt = stmt.where(LawyerProfile.accepts_new_clients == accepts_new_clients)
        if max_workload is not None:
            stmt = stmt.where(LawyerProfile.current_workload <= max_workload)
        if query:
            from app.models.user import User

            like = f"%{query}%"
            stmt = stmt.join(User, User.id == LawyerProfile.user_id).where(
                or_(User.full_name.ilike(like), LawyerProfile.law_firm_name.ilike(like))
            )

        stmt = stmt.order_by(LawyerProfile.id).offset(skip).limit(limit)
        return list(self.db.execute(stmt).scalars().unique().all())

    def find_eligible(self, area: LawyerPracticeArea, *, limit: int = 10) -> list[LawyerProfile]:
        """Hard-filter candidates for AI matching.

        Structural enforcement of "never assign a lawyer who is not accepting new
        clients, has reached capacity, or has an incompatible practice area" — done
        in SQL rather than left to the LLM prompt.
        """
        stmt = (
            select(LawyerProfile)
            .where(
                LawyerProfile.accepts_new_clients.is_(True),
                LawyerProfile.onboarding_completed.is_(True),
                LawyerProfile.current_workload < LawyerProfile.weekly_capacity,
                or_(
                    LawyerProfile.primary_practice_area == area,
                    LawyerProfile.id.in_(
                        select(LawyerSecondaryPracticeArea.lawyer_profile_id).where(
                            LawyerSecondaryPracticeArea.practice_area == area
                        )
                    ),
                ),
            )
            .options(
                selectinload(LawyerProfile.secondary_practice_areas),
                selectinload(LawyerProfile.user),
            )
            .order_by(LawyerProfile.current_workload)
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().unique().all())

    def replace_secondary_areas(
        self, profile: LawyerProfile, areas: list[LawyerPracticeArea]
    ) -> None:
        for row in list(profile.secondary_practice_areas):
            self.db.delete(row)
        self.db.flush()
        for area in areas:
            self.db.add(
                LawyerSecondaryPracticeArea(lawyer_profile_id=profile.id, practice_area=area)
            )
        self.db.flush()
        self.db.refresh(profile)

    def count_active_cases(self, lawyer_id: int) -> int:
        from sqlalchemy import func

        from app.models.case import Case
        from app.models.enums import CaseStatus

        stmt = (
            select(func.count())
            .select_from(Case)
            .where(Case.assigned_lawyer_id == lawyer_id, Case.status != CaseStatus.CLOSED)
        )
        return self.db.execute(stmt).scalar_one()


class LawyerMatchRepository(BaseRepository[LawyerMatchRecommendation]):
    model = LawyerMatchRecommendation

    def list_for_lawyer(
        self, lawyer_id: int, *, limit: int = 50
    ) -> list[LawyerMatchRecommendation]:
        stmt = (
            select(LawyerMatchRecommendation)
            .where(
                or_(
                    LawyerMatchRecommendation.recommended_lawyer_id == lawyer_id,
                    LawyerMatchRecommendation.overridden_lawyer_id == lawyer_id,
                )
            )
            .order_by(LawyerMatchRecommendation.created_at.desc())
            .limit(limit)
        )
        return list(self.db.execute(stmt).scalars().all())
