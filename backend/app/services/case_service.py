"""Case management business logic."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.models.case import Case
from app.models.enums import ActivityType, CaseStatus, UserRole
from app.repositories.case_repository import CaseRepository
from app.repositories.client_repository import ClientRepository
from app.repositories.user_repository import UserRepository
from app.schemas.case import CaseCreate, CaseUpdate, DashboardStats
from app.services.activity_logger import log_activity

logger = get_logger(__name__)


class CaseService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.cases = CaseRepository(db)
        self.clients = ClientRepository(db)
        self.users = UserRepository(db)

    def get(self, case_id: int) -> Case:
        case = self.cases.get_with_relations(case_id)
        if case is None:
            raise NotFoundError("Case not found")
        return case

    def list(self, *, skip: int = 0, limit: int = 100) -> list[Case]:
        return self.cases.list_with_relations(skip=skip, limit=limit)

    def list_filtered(self, **filters) -> list[Case]:
        return self.cases.list_filtered(**filters)

    def count(self) -> int:
        return self.cases.count()

    def create(self, data: CaseCreate) -> Case:
        self._validate_client(data.client_id)
        if data.assigned_lawyer_id is not None:
            self._validate_lawyer(data.assigned_lawyer_id)

        case = Case(**data.model_dump())
        self.cases.add(case)
        log_activity(
            self.db,
            activity_type=ActivityType.CASE_CREATED,
            description=f"Case created: {case.title}",
            case_id=case.id,
        )
        self.db.commit()
        logger.info("Created case id=%s status=%s", case.id, case.status.value)
        if case.assigned_lawyer_id is not None:
            self._recompute_workload(case.assigned_lawyer_id)
        return self.get(case.id)

    def update(self, case_id: int, data: CaseUpdate) -> Case:
        case = self.get(case_id)
        payload = data.model_dump(exclude_unset=True)
        previous_lawyer_id = case.assigned_lawyer_id

        if "client_id" in payload and payload["client_id"] is not None:
            self._validate_client(payload["client_id"])
        if "assigned_lawyer_id" in payload and payload["assigned_lawyer_id"] is not None:
            self._validate_lawyer(payload["assigned_lawyer_id"])

        for field, value in payload.items():
            setattr(case, field, value)

        self.db.commit()
        logger.info("Updated case id=%s", case.id)

        new_lawyer_id = case.assigned_lawyer_id
        if new_lawyer_id != previous_lawyer_id or "status" in payload:
            if previous_lawyer_id is not None:
                self._recompute_workload(previous_lawyer_id)
            if new_lawyer_id is not None:
                self._recompute_workload(new_lawyer_id)
        return self.get(case.id)

    def _recompute_workload(self, lawyer_id: int) -> None:
        # Local import: app.lawyers.service depends on this module for match
        # overrides, so importing at module level would create a cycle.
        from app.lawyers.service import LawyerProfileService

        LawyerProfileService(self.db).recompute_workload(lawyer_id)

    def delete(self, case_id: int) -> None:
        case = self.get(case_id)
        self.cases.delete(case)
        self.db.commit()
        logger.info("Deleted case id=%s", case_id)

    def dashboard_stats(self) -> DashboardStats:
        return DashboardStats(
            total_cases=self.cases.count(),
            open_cases=self.cases.count_by_status(CaseStatus.OPEN),
            closed_cases=self.cases.count_by_status(CaseStatus.CLOSED),
        )

    def _validate_client(self, client_id: int) -> None:
        if self.clients.get_by_id(client_id) is None:
            raise ValidationError(f"Client id={client_id} does not exist")

    def _validate_lawyer(self, user_id: int) -> None:
        user = self.users.get_by_id(user_id)
        if user is None:
            raise ValidationError(f"User id={user_id} does not exist")
        if user.role not in (UserRole.LAWYER, UserRole.ADMIN):
            raise ValidationError("Assigned user must be a lawyer or admin")
