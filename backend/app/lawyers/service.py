"""Business logic for lawyer profiles and AI match overrides."""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, PermissionDeniedError, ValidationError
from app.core.logging import get_logger
from app.lawyers.enums import LawyerPracticeArea
from app.lawyers.model import LawyerMatchRecommendation, LawyerProfile
from app.lawyers.repository import LawyerMatchRepository, LawyerProfileRepository
from app.lawyers.schemas import LawyerOnboardingStatus, LawyerProfileUpdate
from app.lawyers.serializers import join_list
from app.models.enums import UserRole
from app.models.user import User

logger = get_logger(__name__)

_DRAFT_FIELDS = {
    "years_of_experience",
    "biography",
    "primary_practice_area",
    "bar_registration_number",
    "law_firm_name",
    "highest_qualification",
    "current_position",
    "total_cases_handled",
    "total_cases_won",
    "total_cases_lost",
    "active_cases",
    "settlement_cases",
    "appeal_cases",
    "average_case_duration_days",
    "largest_case_value",
    "notable_achievements",
    "minimum_case_value",
    "maximum_case_value",
    "preferred_case_complexity",
    "preferred_client_type",
    "weekly_capacity",
    "preferred_consultation_hours_start",
    "preferred_consultation_hours_end",
    "accepts_new_clients",
}
_LIST_TEXT_FIELDS = {"languages_spoken", "jurisdictions", "preferred_consultation_days"}


class LawyerProfileService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = LawyerProfileRepository(db)

    def get_status(self, user_id: int) -> LawyerOnboardingStatus:
        profile = self.repo.get_by_user_id(user_id)
        return LawyerOnboardingStatus(
            has_profile=profile is not None,
            onboarding_completed=bool(profile and profile.onboarding_completed),
        )

    def get_own(self, user_id: int) -> LawyerProfile:
        profile = self.repo.get_by_user_id(user_id)
        if profile is None:
            raise NotFoundError("Lawyer profile not found")
        return profile

    def get_by_user_id(self, user_id: int) -> LawyerProfile:
        return self.get_own(user_id)

    def list_filtered(self, **filters) -> list[LawyerProfile]:
        return self.repo.list_filtered(**filters)

    def save_draft(self, user_id: int, data: LawyerProfileUpdate) -> LawyerProfile:
        profile = self.repo.get_by_user_id(user_id)
        if profile is None:
            profile = LawyerProfile(user_id=user_id)
            self.db.add(profile)
            self.db.flush()

        self._apply(profile, data)
        self.db.commit()
        self.db.refresh(profile)
        logger.info("Saved lawyer profile draft user_id=%s", user_id)
        return self.repo.get_by_user_id(user_id)

    def complete_onboarding(self, user_id: int, data: LawyerProfileUpdate) -> LawyerProfile:
        profile = self.repo.get_by_user_id(user_id)
        if profile is None:
            profile = LawyerProfile(user_id=user_id)
            self.db.add(profile)
            self.db.flush()

        self._apply(profile, data)
        self._validate_complete(profile)

        profile.expertise_score, profile.confidence_score = self._compute_scores(profile)
        profile.onboarding_completed = True

        self.db.commit()
        self.db.refresh(profile)
        logger.info("Completed lawyer onboarding user_id=%s", user_id)
        return self.repo.get_by_user_id(user_id)

    def set_accepting_clients(self, user_id: int, value: bool) -> LawyerProfile:
        profile = self.get_own(user_id)
        profile.accepts_new_clients = value
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def recompute_workload(self, user_id: int) -> None:
        """Recount a lawyer's active assigned cases. No-op if they have no profile."""
        profile = self.repo.get_by_user_id(user_id)
        if profile is None:
            return
        profile.current_workload = self.repo.count_active_cases(user_id)
        self.db.commit()

    # ---- internals -------------------------------------------------------

    def _apply(self, profile: LawyerProfile, data: LawyerProfileUpdate) -> None:
        payload = data.model_dump(exclude_unset=True)

        secondary_areas = payload.pop("secondary_practice_areas", None)
        for field in _LIST_TEXT_FIELDS:
            if field in payload:
                payload[field] = join_list(payload[field])

        for field, value in payload.items():
            if field in _DRAFT_FIELDS or field in _LIST_TEXT_FIELDS:
                setattr(profile, field, value)

        self.db.flush()

        if secondary_areas is not None:
            areas = [LawyerPracticeArea(a) for a in secondary_areas]
            self.repo.replace_secondary_areas(profile, areas)

    def _validate_complete(self, profile: LawyerProfile) -> None:
        errors: list[str] = []
        if not profile.bar_registration_number:
            errors.append("Bar registration number is required")
        if not profile.languages_spoken:
            errors.append("At least one language is required")
        if profile.primary_practice_area is None:
            errors.append("Primary practice area is required")
        if profile.years_of_experience is None:
            errors.append("Years of experience is required")
        if profile.total_cases_won > profile.total_cases_handled:
            errors.append("Cases won cannot exceed total cases")
        if profile.total_cases_lost > profile.total_cases_handled:
            errors.append("Cases lost cannot exceed total cases")
        if errors:
            raise ValidationError("; ".join(errors))

    def _compute_scores(self, profile: LawyerProfile) -> tuple[float, float]:
        """Deterministic heuristic — not an LLM call, so profile saves stay cheap."""
        experience_component = min(profile.years_of_experience or 0, 20) / 20 * 40
        total_decided = profile.total_cases_won + profile.total_cases_lost
        success_rate = (profile.total_cases_won / total_decided) if total_decided else 0.5
        success_component = success_rate * 40
        volume_component = min(profile.total_cases_handled, 50) / 50 * 20
        expertise_score = round(experience_component + success_component + volume_component, 1)

        filled = sum(
            1
            for v in [
                profile.biography,
                profile.law_firm_name,
                profile.highest_qualification,
                profile.current_position,
                profile.notable_achievements,
            ]
            if v
        )
        confidence_score = round(min(0.5 + 0.1 * filled, 1.0), 2)
        return expertise_score, confidence_score


class LawyerMatchService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.matches = LawyerMatchRepository(db)

    def history_for_lawyer(self, lawyer_id: int) -> list[LawyerMatchRecommendation]:
        return self.matches.list_for_lawyer(lawyer_id)

    def override(self, match_id: int, new_lawyer_id: int, actor: User) -> LawyerMatchRecommendation:
        from app.schemas.case import CaseUpdate
        from app.services.case_service import CaseService

        match = self.matches.get_by_id(match_id)
        if match is None:
            raise NotFoundError("Match recommendation not found")
        if match.case_id is None:
            raise ValidationError("This recommendation has no associated case yet")

        case_service = CaseService(self.db)
        case = case_service.get(match.case_id)

        is_admin = actor.role == UserRole.ADMIN
        is_current_lawyer = case.assigned_lawyer_id == actor.id
        if not (is_admin or is_current_lawyer):
            raise PermissionDeniedError(
                "Only an admin or the case's current lawyer may override this assignment"
            )

        case_service.update(match.case_id, CaseUpdate(assigned_lawyer_id=new_lawyer_id))

        match.was_overridden = True
        match.overridden_lawyer_id = new_lawyer_id
        match.overridden_by_id = actor.id
        match.overridden_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(match)

        LawyerProfileService(self.db).recompute_workload(new_lawyer_id)
        logger.info(
            "Overrode lawyer match id=%s case_id=%s new_lawyer=%s actor=%s",
            match_id,
            match.case_id,
            new_lawyer_id,
            actor.id,
        )
        return match
