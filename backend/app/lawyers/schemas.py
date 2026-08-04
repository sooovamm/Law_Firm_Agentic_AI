"""API schemas for lawyer profiles."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.lawyers.enums import CaseComplexity, ClientType, LawyerPracticeArea
from app.schemas.user import UserRead

MAX_YEARS_OF_EXPERIENCE = 70


class LawyerProfileUpdate(BaseModel):
    """Partial payload used for both autosave drafts and final submission.

    All fields are optional so the wizard can save whatever step the lawyer just
    filled in; `LawyerProfileService.complete_onboarding` enforces the hard
    requirements (bar number, languages, primary practice area, etc.) separately.
    """

    years_of_experience: int | None = Field(default=None, ge=0, le=MAX_YEARS_OF_EXPERIENCE)
    biography: str | None = None
    languages_spoken: list[str] | None = None

    primary_practice_area: LawyerPracticeArea | None = None
    secondary_practice_areas: list[LawyerPracticeArea] | None = None
    jurisdictions: list[str] | None = None
    bar_registration_number: str | None = None
    law_firm_name: str | None = None
    highest_qualification: str | None = None
    current_position: str | None = None

    total_cases_handled: int | None = Field(default=None, ge=0)
    total_cases_won: int | None = Field(default=None, ge=0)
    total_cases_lost: int | None = Field(default=None, ge=0)
    active_cases: int | None = Field(default=None, ge=0)
    settlement_cases: int | None = Field(default=None, ge=0)
    appeal_cases: int | None = Field(default=None, ge=0)
    average_case_duration_days: int | None = Field(default=None, ge=0)
    largest_case_value: float | None = Field(default=None, ge=0)
    notable_achievements: str | None = None

    minimum_case_value: float | None = Field(default=None, ge=0)
    maximum_case_value: float | None = Field(default=None, ge=0)
    preferred_case_complexity: CaseComplexity | None = None
    preferred_client_type: ClientType | None = None

    weekly_capacity: int | None = Field(default=None, ge=1, le=200)
    preferred_consultation_days: list[str] | None = None
    preferred_consultation_hours_start: str | None = None
    preferred_consultation_hours_end: str | None = None
    accepts_new_clients: bool | None = None

    @model_validator(mode="after")
    def _validate_cross_fields(self) -> LawyerProfileUpdate:
        if (
            self.total_cases_won is not None
            and self.total_cases_handled is not None
            and self.total_cases_won > self.total_cases_handled
        ):
            raise ValueError("Cases won cannot exceed total cases handled")
        if (
            self.total_cases_lost is not None
            and self.total_cases_handled is not None
            and self.total_cases_lost > self.total_cases_handled
        ):
            raise ValueError("Cases lost cannot exceed total cases handled")
        if (
            self.minimum_case_value is not None
            and self.maximum_case_value is not None
            and self.minimum_case_value > self.maximum_case_value
        ):
            raise ValueError("Minimum case value cannot exceed maximum case value")
        return self


class LawyerProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int

    years_of_experience: int | None
    biography: str | None
    languages_spoken: list[str] = Field(default_factory=list)

    primary_practice_area: LawyerPracticeArea | None
    secondary_practice_areas: list[LawyerPracticeArea] = Field(default_factory=list)
    jurisdictions: list[str] = Field(default_factory=list)
    bar_registration_number: str | None
    law_firm_name: str | None
    highest_qualification: str | None
    current_position: str | None

    total_cases_handled: int
    total_cases_won: int
    total_cases_lost: int
    active_cases: int
    settlement_cases: int
    appeal_cases: int
    average_case_duration_days: int | None
    largest_case_value: float | None
    notable_achievements: str | None

    minimum_case_value: float | None
    maximum_case_value: float | None
    preferred_case_complexity: CaseComplexity | None
    preferred_client_type: ClientType | None

    weekly_capacity: int
    current_workload: int
    preferred_consultation_days: list[str] = Field(default_factory=list)
    preferred_consultation_hours_start: str | None
    preferred_consultation_hours_end: str | None
    accepts_new_clients: bool

    expertise_score: float | None
    confidence_score: float | None
    onboarding_completed: bool

    created_at: datetime
    updated_at: datetime


class LawyerProfileAdminRead(LawyerProfileRead):
    user: UserRead


class LawyerOnboardingStatus(BaseModel):
    has_profile: bool
    onboarding_completed: bool


class LawyerMatchRead(BaseModel):
    """Mirrors the AI matching JSON contract exactly."""

    recommended_lawyer_id: int | None
    match_score: int
    reasoning: list[str] = Field(default_factory=list)
    alternative_lawyer_ids: list[int] = Field(default_factory=list)


class LawyerMatchHistoryItem(LawyerMatchRead):
    model_config = ConfigDict(from_attributes=False)

    id: int
    conversation_id: int
    case_id: int | None
    was_overridden: bool
    overridden_lawyer_id: int | None
    created_at: datetime


class OverrideMatchRequest(BaseModel):
    lawyer_id: int


class AcceptingClientsUpdate(BaseModel):
    accepts_new_clients: bool
