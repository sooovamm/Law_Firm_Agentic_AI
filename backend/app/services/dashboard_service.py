"""Dashboard aggregation service.

Assembles the overview payload (cards, charts, activity, urgent cases, upcoming
events, recent documents) from the repositories. All values come from the
database; nothing is hardcoded.
"""
from __future__ import annotations

from datetime import UTC, datetime, time, timedelta

from sqlalchemy.orm import Session

from app.repositories.case_repository import CaseRepository
from app.repositories.dashboard_repository import DashboardRepository
from app.models.enums import CaseStatus
from app.schemas.dashboard import (
    ActivityItem,
    ChartPoint,
    DashboardCharts,
    DashboardOverview,
    OverviewCards,
    RecentDocumentItem,
    UpcomingConsultationItem,
    UpcomingEventItem,
    UrgentCaseItem,
)

# "New clients" are counted within this trailing window.
NEW_CLIENT_WINDOW_DAYS = 30


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.cases = CaseRepository(db)
        self.dash = DashboardRepository(db)

    def overview(self) -> DashboardOverview:
        now = datetime.now(UTC)
        day_start = datetime.combine(now.date(), time.min, tzinfo=UTC)
        day_end = day_start + timedelta(days=1)
        window_start = now - timedelta(days=NEW_CLIENT_WINDOW_DAYS)

        cards = OverviewCards(
            open_cases=self.cases.count_by_status(CaseStatus.OPEN),
            closed_cases=self.cases.count_by_status(CaseStatus.CLOSED),
            new_clients=self.dash.new_clients_count(window_start),
            todays_consultations=self.dash.todays_consultations_count(day_start, day_end),
        )

        charts = DashboardCharts(
            cases_by_practice_area=[
                ChartPoint(label=label, value=value)
                for label, value in self.cases.count_by_practice_area()
            ],
            cases_by_status=[
                ChartPoint(label=label, value=value)
                for label, value in self.cases.count_by_status_grouped()
            ],
        )

        recent_activity = [
            ActivityItem.model_validate(a) for a in self.dash.recent_activity(limit=10)
        ]

        urgent_cases = [
            UrgentCaseItem(
                id=c.id,
                title=c.title,
                practice_area=c.practice_area,
                status=c.status,
                urgency=c.urgency,
                client_name=c.client.full_name if c.client else None,
                assigned_lawyer_name=c.assigned_lawyer.full_name if c.assigned_lawyer else None,
                updated_at=c.updated_at,
            )
            for c in self.cases.urgent_cases(limit=5)
        ]

        upcoming_events = [
            UpcomingEventItem(
                id=e.id,
                case_id=e.case_id,
                case_title=e.case.title if e.case else "",
                event_type=e.event_type,
                title=e.title,
                scheduled_at=e.scheduled_at,
                location=e.location,
            )
            for e in self.dash.upcoming_events(now=now, limit=5)
        ]

        recent_documents = [
            RecentDocumentItem(
                id=d.id,
                filename=d.filename,
                document_type=d.document_type.value if d.document_type else None,
                case_id=d.case_id,
                created_at=d.created_at,
            )
            for d in self.dash.recent_documents(limit=5)
        ]

        upcoming_consultations = [
            UpcomingConsultationItem(
                id=c.id,
                lawyer_name=c.lawyer.full_name if c.lawyer else None,
                client_name=c.client.full_name if c.client else None,
                scheduled_time=c.scheduled_time,
                duration_minutes=c.duration_minutes,
                status=c.status.value,
            )
            for c in self.dash.upcoming_consultations(now=now, limit=5)
        ]

        return DashboardOverview(
            cards=cards,
            charts=charts,
            recent_activity=recent_activity,
            urgent_cases=urgent_cases,
            upcoming_events=upcoming_events,
            upcoming_consultations=upcoming_consultations,
            recent_documents=recent_documents,
        )
