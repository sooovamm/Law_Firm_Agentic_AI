"""ORM models for lawyer profiles and AI match recommendations."""
from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.lawyers.enums import CaseComplexity, ClientType, LawyerPracticeArea

if TYPE_CHECKING:
    from app.models.user import User


class LawyerProfile(Base, TimestampMixin):
    __tablename__ = "lawyer_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )

    # -- Basic information --
    years_of_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    biography: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Newline-joined lists (see app.documents.model for the same convention);
    # avoids Postgres-only ARRAY/JSONB types so tests can run against SQLite.
    languages_spoken: Mapped[str | None] = mapped_column(Text, nullable=True)

    # -- Professional information --
    primary_practice_area: Mapped[LawyerPracticeArea | None] = mapped_column(
        Enum(
            LawyerPracticeArea,
            name="lawyer_practice_area",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=True,
        index=True,
    )
    jurisdictions: Mapped[str | None] = mapped_column(Text, nullable=True)
    bar_registration_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    law_firm_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    highest_qualification: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_position: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # -- Professional statistics --
    total_cases_handled: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_cases_won: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_cases_lost: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    active_cases: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    settlement_cases: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    appeal_cases: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    average_case_duration_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    largest_case_value: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    notable_achievements: Mapped[str | None] = mapped_column(Text, nullable=True)

    # -- Case preferences --
    minimum_case_value: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    maximum_case_value: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    preferred_case_complexity: Mapped[CaseComplexity | None] = mapped_column(
        Enum(
            CaseComplexity,
            name="case_complexity",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=True,
    )
    preferred_client_type: Mapped[ClientType | None] = mapped_column(
        Enum(ClientType, name="client_type", values_callable=lambda e: [m.value for m in e]),
        nullable=True,
    )

    # -- Availability --
    weekly_capacity: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    current_workload: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    preferred_consultation_days: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_consultation_hours_start: Mapped[str | None] = mapped_column(String(5), nullable=True)
    preferred_consultation_hours_end: Mapped[str | None] = mapped_column(String(5), nullable=True)
    accepts_new_clients: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # -- AI metadata --
    expertise_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Reserved for future semantic-search use; not populated by this feature.
    profile_embedding: Mapped[str | None] = mapped_column(Text, nullable=True)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped[User] = relationship()
    secondary_practice_areas: Mapped[list[LawyerSecondaryPracticeArea]] = relationship(
        back_populates="lawyer_profile",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<LawyerProfile id={self.id} user_id={self.user_id}>"


class LawyerSecondaryPracticeArea(Base):
    """Normalized join table for a lawyer's secondary practice areas."""

    __tablename__ = "lawyer_secondary_practice_areas"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    lawyer_profile_id: Mapped[int] = mapped_column(
        ForeignKey("lawyer_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    practice_area: Mapped[LawyerPracticeArea] = mapped_column(
        Enum(
            LawyerPracticeArea,
            name="lawyer_practice_area",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )

    lawyer_profile: Mapped[LawyerProfile] = relationship(
        back_populates="secondary_practice_areas"
    )


class LawyerMatchRecommendation(Base, TimestampMixin):
    """Records one AI lawyer-matching event for a conversation, for audit/history."""

    __tablename__ = "lawyer_match_recommendations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    case_id: Mapped[int | None] = mapped_column(
        ForeignKey("cases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    recommended_lawyer_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    match_score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    alternative_lawyer_ids: Mapped[str | None] = mapped_column(Text, nullable=True)

    was_overridden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    overridden_lawyer_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    overridden_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    overridden_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    def __repr__(self) -> str:
        return f"<LawyerMatchRecommendation id={self.id} recommended={self.recommended_lawyer_id}>"
