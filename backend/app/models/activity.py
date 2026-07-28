"""Activity log powering the dashboard's recent-activity feed."""
from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin
from app.models.enums import ActivityType

if TYPE_CHECKING:
    from app.models.user import User


class ActivityLog(Base, TimestampMixin):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    activity_type: Mapped[ActivityType] = mapped_column(
        Enum(ActivityType, name="activity_type", values_callable=lambda e: [m.value for m in e]), nullable=False, index=True
    )
    description: Mapped[str] = mapped_column(String(512), nullable=False)

    # Optional references to the subject of the activity.
    case_id: Mapped[int | None] = mapped_column(
        ForeignKey("cases.id", ondelete="SET NULL"), nullable=True, index=True
    )
    client_id: Mapped[int | None] = mapped_column(
        ForeignKey("clients.id", ondelete="SET NULL"), nullable=True
    )
    document_id: Mapped[int | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    actor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    actor: Mapped["User | None"] = relationship()

    def __repr__(self) -> str:
        return f"<ActivityLog id={self.id} type={self.activity_type}>"
