"""scheduling: consultations table

Revision ID: 0005_consultations
Revises: 0004_dashboard
Create Date: 2026-07-27 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0005_consultations"
down_revision: str | None = "0004_dashboard"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


consultation_status = postgresql.ENUM(
    "pending", "confirmed", "completed", "cancelled", name="consultation_status_v2", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    consultation_status.create(bind, checkfirst=True)

    op.create_table(
        "consultations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), nullable=True),
        sa.Column("lawyer_id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=True),
        sa.Column("scheduled_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("status", consultation_status, nullable=False, server_default="pending"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["lawyer_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_consultations_id", "consultations", ["id"])
    op.create_index("ix_consultations_case_id", "consultations", ["case_id"])
    op.create_index("ix_consultations_lawyer_id", "consultations", ["lawyer_id"])
    op.create_index("ix_consultations_client_id", "consultations", ["client_id"])
    op.create_index("ix_consultations_scheduled_time", "consultations", ["scheduled_time"])
    op.create_index("ix_consultations_status", "consultations", ["status"])


def downgrade() -> None:
    op.drop_table("consultations")
    bind = op.get_bind()
    consultation_status.drop(bind, checkfirst=True)
