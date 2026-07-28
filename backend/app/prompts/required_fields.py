"""Declarative required-information fields per practice area.

This is configuration, not prompt text. It is injected into the information
collection prompt so the model knows what to gather.
"""
from __future__ import annotations

from app.conversations.enums import IntakePracticeArea

# Ordered list of the information a lawyer needs before qualifying each matter.
REQUIRED_FIELDS: dict[IntakePracticeArea, list[str]] = {
    IntakePracticeArea.DIVORCE: [
        "Full name and contact details",
        "Whether children are involved",
        "Length of marriage",
        "Whether a separation agreement exists",
        "Key concerns (custody, assets, support)",
    ],
    IntakePracticeArea.CRIMINAL: [
        "Full name and contact details",
        "Nature of the charge or allegation",
        "Whether an arrest has occurred",
        "Any upcoming court dates",
        "Whether they have spoken to police",
    ],
    IntakePracticeArea.EMPLOYMENT: [
        "Full name and contact details",
        "Employer name and role",
        "Nature of the issue (termination, discrimination, wages)",
        "Relevant dates",
        "Whether documentation exists",
    ],
    IntakePracticeArea.IMMIGRATION: [
        "Full name and contact details",
        "Current immigration status",
        "Country of citizenship",
        "Goal (visa, green card, citizenship, defense)",
        "Any deadlines or hearings",
    ],
    IntakePracticeArea.PROPERTY: [
        "Full name and contact details",
        "Type of property matter (purchase, dispute, landlord/tenant)",
        "Property location",
        "Parties involved",
        "Relevant dates or deadlines",
    ],
    IntakePracticeArea.PERSONAL_INJURY: [
        "Full name and contact details",
        "How and when the injury occurred",
        "Nature and severity of injuries",
        "Whether medical treatment was received",
        "Whether insurance is involved",
    ],
    IntakePracticeArea.CONTRACT_DISPUTES: [
        "Full name and contact details",
        "Nature of the contract",
        "What the dispute is about",
        "Parties involved",
        "Amount in dispute",
    ],
    IntakePracticeArea.OTHER: [
        "Full name and contact details",
        "Description of the legal issue",
        "Parties involved",
        "Any relevant dates or deadlines",
        "Desired outcome",
    ],
}


def required_fields_for(area: IntakePracticeArea) -> list[str]:
    return REQUIRED_FIELDS.get(area, REQUIRED_FIELDS[IntakePracticeArea.OTHER])
