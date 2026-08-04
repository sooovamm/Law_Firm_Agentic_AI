"""Enumerations for lawyer profiles and AI matching."""
from __future__ import annotations

from enum import Enum

from app.conversations.enums import IntakePracticeArea


class LawyerPracticeArea(str, Enum):
    """Practice area specializations a lawyer can select during onboarding."""

    CRIMINAL = "criminal"
    FAMILY = "family"
    DIVORCE = "divorce"
    CIVIL_LITIGATION = "civil_litigation"
    CORPORATE = "corporate"
    EMPLOYMENT = "employment"
    IMMIGRATION = "immigration"
    PROPERTY = "property"
    TAX = "tax"
    INTELLECTUAL_PROPERTY = "intellectual_property"
    CONSUMER = "consumer"
    CYBER = "cyber"
    CONTRACT = "contract"
    REAL_ESTATE = "real_estate"
    BANKRUPTCY = "bankruptcy"
    ENVIRONMENTAL = "environmental"
    OTHER = "other"


class CaseComplexity(str, Enum):
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    HIGHLY_COMPLEX = "highly_complex"


class ClientType(str, Enum):
    INDIVIDUAL = "individual"
    BUSINESS = "business"
    BOTH = "both"


# Bridges the intake agent's practice-area taxonomy onto the lawyer specialization
# taxonomy so candidate lawyers can be filtered by the case's detected area.
INTAKE_AREA_TO_LAWYER_AREA: dict[IntakePracticeArea, LawyerPracticeArea] = {
    IntakePracticeArea.DIVORCE: LawyerPracticeArea.DIVORCE,
    IntakePracticeArea.CRIMINAL: LawyerPracticeArea.CRIMINAL,
    IntakePracticeArea.EMPLOYMENT: LawyerPracticeArea.EMPLOYMENT,
    IntakePracticeArea.IMMIGRATION: LawyerPracticeArea.IMMIGRATION,
    IntakePracticeArea.PROPERTY: LawyerPracticeArea.PROPERTY,
    IntakePracticeArea.PERSONAL_INJURY: LawyerPracticeArea.CIVIL_LITIGATION,
    IntakePracticeArea.CONTRACT_DISPUTES: LawyerPracticeArea.CONTRACT,
    IntakePracticeArea.OTHER: LawyerPracticeArea.OTHER,
}


def to_lawyer_practice_area(area: IntakePracticeArea) -> LawyerPracticeArea:
    return INTAKE_AREA_TO_LAWYER_AREA.get(area, LawyerPracticeArea.OTHER)
