"""Dashboard aggregation schemas."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.enums import (
    ActivityType,
    CaseEventType,
    CaseStatus,
    CaseUrgency,
    PracticeArea,
)


class OverviewCards(BaseModel):
    open_cases: int
    closed_cases: int
    new_clients: int  # created in the trailing window
    todays_consultations: int


class ActivityItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_type: ActivityType
    description: str
    case_id: int | None
    created_at: datetime


class UrgentCaseItem(BaseModel):
    id: int
    title: str
    practice_area: PracticeArea
    status: CaseStatus
    urgency: CaseUrgency
    client_name: str | None
    assigned_lawyer_name: str | None
    updated_at: datetime


class UpcomingEventItem(BaseModel):
    id: int
    case_id: int
    case_title: str
    event_type: CaseEventType
    title: str
    scheduled_at: datetime
    location: str | None


class RecentDocumentItem(BaseModel):
    id: int
    filename: str
    document_type: str | None
    case_id: int | None
    created_at: datetime


class UpcomingConsultationItem(BaseModel):
    id: int
    lawyer_name: str | None
    client_name: str | None
    scheduled_time: datetime
    duration_minutes: int
    status: str


class ChartPoint(BaseModel):
    label: str
    value: int


class DashboardCharts(BaseModel):
    cases_by_practice_area: list[ChartPoint]
    cases_by_status: list[ChartPoint]


class DashboardOverview(BaseModel):
    cards: OverviewCards
    charts: DashboardCharts
    recent_activity: list[ActivityItem]
    urgent_cases: list[UrgentCaseItem]
    upcoming_events: list[UpcomingEventItem]
    upcoming_consultations: list[UpcomingConsultationItem]
    recent_documents: list[RecentDocumentItem]
