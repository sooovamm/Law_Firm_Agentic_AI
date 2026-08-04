"""Serialization helpers converting LawyerProfile ORM to schemas.

List-like fields are stored as newline-joined Text (see app.documents.serializers
for the same convention, adopted so tests can run against SQLite without
Postgres-only ARRAY/JSONB types).
"""
from __future__ import annotations

from app.lawyers.model import LawyerMatchRecommendation, LawyerProfile
from app.lawyers.schemas import (
    LawyerMatchHistoryItem,
    LawyerProfileAdminRead,
    LawyerProfileRead,
)
from app.schemas.user import UserRead


def split_list(value: str | None) -> list[str]:
    return [line for line in value.split("\n") if line] if value else []


def join_list(values: list[str] | None) -> str | None:
    return "\n".join(values) if values else None


def split_int_list(value: str | None) -> list[int]:
    return [int(v) for v in value.split(",") if v] if value else []


def join_int_list(values: list[int] | None) -> str | None:
    return ",".join(str(v) for v in values) if values else None


def to_read(profile: LawyerProfile) -> LawyerProfileRead:
    return LawyerProfileRead(
        id=profile.id,
        user_id=profile.user_id,
        years_of_experience=profile.years_of_experience,
        biography=profile.biography,
        languages_spoken=split_list(profile.languages_spoken),
        primary_practice_area=profile.primary_practice_area,
        secondary_practice_areas=[
            row.practice_area for row in profile.secondary_practice_areas
        ],
        jurisdictions=split_list(profile.jurisdictions),
        bar_registration_number=profile.bar_registration_number,
        law_firm_name=profile.law_firm_name,
        highest_qualification=profile.highest_qualification,
        current_position=profile.current_position,
        total_cases_handled=profile.total_cases_handled,
        total_cases_won=profile.total_cases_won,
        total_cases_lost=profile.total_cases_lost,
        active_cases=profile.active_cases,
        settlement_cases=profile.settlement_cases,
        appeal_cases=profile.appeal_cases,
        average_case_duration_days=profile.average_case_duration_days,
        largest_case_value=(
            float(profile.largest_case_value) if profile.largest_case_value is not None else None
        ),
        notable_achievements=profile.notable_achievements,
        minimum_case_value=(
            float(profile.minimum_case_value) if profile.minimum_case_value is not None else None
        ),
        maximum_case_value=(
            float(profile.maximum_case_value) if profile.maximum_case_value is not None else None
        ),
        preferred_case_complexity=profile.preferred_case_complexity,
        preferred_client_type=profile.preferred_client_type,
        weekly_capacity=profile.weekly_capacity,
        current_workload=profile.current_workload,
        preferred_consultation_days=split_list(profile.preferred_consultation_days),
        preferred_consultation_hours_start=profile.preferred_consultation_hours_start,
        preferred_consultation_hours_end=profile.preferred_consultation_hours_end,
        accepts_new_clients=profile.accepts_new_clients,
        expertise_score=profile.expertise_score,
        confidence_score=profile.confidence_score,
        onboarding_completed=profile.onboarding_completed,
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


def to_admin_read(profile: LawyerProfile) -> LawyerProfileAdminRead:
    base = to_read(profile)
    return LawyerProfileAdminRead(
        **base.model_dump(),
        user=UserRead.model_validate(profile.user),
    )


def to_match_history_item(match: LawyerMatchRecommendation) -> LawyerMatchHistoryItem:
    return LawyerMatchHistoryItem(
        id=match.id,
        conversation_id=match.conversation_id,
        case_id=match.case_id,
        recommended_lawyer_id=match.recommended_lawyer_id,
        match_score=match.match_score,
        reasoning=split_list(match.reasoning),
        alternative_lawyer_ids=split_int_list(match.alternative_lawyer_ids),
        was_overridden=match.was_overridden,
        overridden_lawyer_id=match.overridden_lawyer_id,
        created_at=match.created_at,
    )
