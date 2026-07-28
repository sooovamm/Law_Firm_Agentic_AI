"""dashboard: case urgency, notes, events, activity logs

Revision ID: 0004_dashboard
Revises: 0003_documents
Create Date: 2026-07-27 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004_dashboard"
down_revision: str | None = "0003_documents"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


case_urgency = postgresql.ENUM("low", "medium", "high", "critical", name="case_urgency", create_type=False)
case_event_type = postgresql.ENUM(
    "consultation", "hearing", "filing", "deadline", "meeting", "other",
    name="case_event_type", create_type=False)
activity_type = postgresql.ENUM(
    "case_created",
    "case_updated",
    "client_created",
    "document_uploaded",
    "note_added",
    "event_scheduled",
    "intake_completed",
    name="activity_type", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    case_urgency.create(bind, checkfirst=True)
    case_event_type.create(bind, checkfirst=True)
    activity_type.create(bind, checkfirst=True)

    op.add_column(
        "cases",
        sa.Column("urgency", case_urgency, nullable=False, server_default="medium"),
    )
    op.create_index("ix_cases_urgency", "cases", ["urgency"])

    op.create_table(
        "case_notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), nullable=False),
        sa.Column("author_id", sa.Integer(), nullable=True),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_case_notes_id", "case_notes", ["id"])
    op.create_index("ix_case_notes_case_id", "case_notes", ["case_id"])

    op.create_table(
        "case_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), nullable=False),
        sa.Column("event_type", case_event_type, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_case_events_id", "case_events", ["id"])
    op.create_index("ix_case_events_case_id", "case_events", ["case_id"])
    op.create_index("ix_case_events_event_type", "case_events", ["event_type"])
    op.create_index("ix_case_events_scheduled_at", "case_events", ["scheduled_at"])

    op.create_table(
        "activity_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("activity_type", activity_type, nullable=False),
        sa.Column("description", sa.String(length=512), nullable=False),
        sa.Column("case_id", sa.Integer(), nullable=True),
        sa.Column("client_id", sa.Integer(), nullable=True),
        sa.Column("document_id", sa.Integer(), nullable=True),
        sa.Column("actor_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_activity_logs_id", "activity_logs", ["id"])
    op.create_index("ix_activity_logs_activity_type", "activity_logs", ["activity_type"])
    op.create_index("ix_activity_logs_case_id", "activity_logs", ["case_id"])


def downgrade() -> None:
    op.drop_table("activity_logs")
    op.drop_table("case_events")
    op.drop_table("case_notes")
    op.drop_index("ix_cases_urgency", table_name="cases")
    op.drop_column("cases", "urgency")

    bind = op.get_bind()
    activity_type.drop(bind, checkfirst=True)
    case_event_type.drop(bind, checkfirst=True)
    case_urgency.drop(bind, checkfirst=True)
