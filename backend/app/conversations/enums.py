"""Enums for the intake conversation domain."""
from __future__ import annotations

from enum import Enum

from app.models.enums import PracticeArea


class ConversationStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class IntakeStage(str, Enum):
    """Stages of the LangGraph intake workflow."""

    GREETING = "greeting"
    PRACTICE_AREA_DETECTION = "practice_area_detection"
    INFORMATION_COLLECTION = "information_collection"
    LEAD_QUALIFICATION = "lead_qualification"
    GENERATE_SUMMARY = "generate_summary"
    CREATE_CASE = "create_case"
    FINISHED = "finished"


class Urgency(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IntakePracticeArea(str, Enum):
    """Practice areas supported by the intake agent (Sprint 2 list)."""

    DIVORCE = "divorce"
    CRIMINAL = "criminal"
    EMPLOYMENT = "employment"
    IMMIGRATION = "immigration"
    PROPERTY = "property"
    PERSONAL_INJURY = "personal_injury"
    CONTRACT_DISPUTES = "contract_disputes"
    OTHER = "other"


# Map intake practice areas onto the existing Case practice areas so a created
# case uses the canonical Sprint 1 taxonomy.
INTAKE_TO_CASE_AREA: dict[IntakePracticeArea, PracticeArea] = {
    IntakePracticeArea.DIVORCE: PracticeArea.FAMILY,
    IntakePracticeArea.CRIMINAL: PracticeArea.CRIMINAL,
    IntakePracticeArea.EMPLOYMENT: PracticeArea.LABOR,
    IntakePracticeArea.IMMIGRATION: PracticeArea.IMMIGRATION,
    IntakePracticeArea.PROPERTY: PracticeArea.REAL_ESTATE,
    IntakePracticeArea.PERSONAL_INJURY: PracticeArea.LITIGATION,
    IntakePracticeArea.CONTRACT_DISPUTES: PracticeArea.CORPORATE,
    IntakePracticeArea.OTHER: PracticeArea.OTHER,
}


def to_case_practice_area(area: IntakePracticeArea) -> PracticeArea:
    return INTAKE_TO_CASE_AREA.get(area, PracticeArea.OTHER)
