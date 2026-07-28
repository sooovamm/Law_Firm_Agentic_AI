"""court deadlines: deadlines table

Revision ID: 0007_deadlines
Revises: 0006_emails
Create Date: 2026-07-27 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0007_deadlines"
down_revision: str | None = "0006_emails"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


deadline_type = postgresql.ENUM(
    "hearing", "filing", "appeal", "evidence", "other", name="deadline_type", create_type=False)
deadline_priority = postgresql.ENUM("low", "medium", "high", "critical", name="deadline_priority", create_type=False)
deadline_source = postgresql.ENUM("document", "email", "manual", name="deadline_source", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    deadline_type.create(bind, checkfirst=True)
    deadline_priority.create(bind, checkfirst=True)
    deadline_source.create(bind, checkfirst=True)

    op.create_table(
        "deadlines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("case_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("priority", deadline_priority, nullable=False, server_default="medium"),
        sa.Column("deadline_type", deadline_type, nullable=False, server_default="other"),
        sa.Column("source", deadline_source, nullable=False, server_default="manual"),
        sa.Column("source_reference", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("dedup_key", sa.String(length=64), nullable=False),
        sa.Column("reminder_sent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("case_id", "dedup_key", name="uq_deadline_case_dedup"),
    )
    op.create_index("ix_deadlines_id", "deadlines", ["id"])
    op.create_index("ix_deadlines_case_id", "deadlines", ["case_id"])
    op.create_index("ix_deadlines_due_date", "deadlines", ["due_date"])
    op.create_index("ix_deadlines_completed", "deadlines", ["completed"])
    op.create_index("ix_deadlines_priority", "deadlines", ["priority"])
    op.create_index("ix_deadlines_dedup_key", "deadlines", ["dedup_key"])


def downgrade() -> None:
    op.drop_table("deadlines")
    bind = op.get_bind()
    deadline_source.drop(bind, checkfirst=True)
    deadline_priority.drop(bind, checkfirst=True)
    deadline_type.drop(bind, checkfirst=True)
