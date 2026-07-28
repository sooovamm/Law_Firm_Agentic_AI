"""email agent: emails table

Revision ID: 0006_emails
Revises: 0005_consultations
Create Date: 2026-07-27 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0006_emails"
down_revision: str | None = "0005_consultations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


email_provider = postgresql.ENUM("gmail", "outlook", name="email_provider", create_type=False)
email_status = postgresql.ENUM("received", "processed", "replied", "failed", name="email_status", create_type=False)
email_urgency = postgresql.ENUM("low", "medium", "high", "critical", name="email_urgency", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    email_provider.create(bind, checkfirst=True)
    email_status.create(bind, checkfirst=True)
    email_urgency.create(bind, checkfirst=True)

    op.create_table(
        "emails",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("sender", sa.String(length=320), nullable=False),
        sa.Column("receiver", sa.String(length=320), nullable=False),
        sa.Column("subject", sa.String(length=998), nullable=False, server_default=""),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("case_id", sa.Integer(), nullable=True),
        sa.Column("provider", email_provider, nullable=False),
        sa.Column("external_id", sa.String(length=255), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", email_status, nullable=False, server_default="received"),
        sa.Column("urgency", email_urgency, nullable=True),
        sa.Column("client_id", sa.Integer(), nullable=True),
        sa.Column("tasks", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("deadlines", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("draft_reply", sa.Text(), nullable=True),
        sa.Column("processing_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_emails_id", "emails", ["id"])
    op.create_index("ix_emails_sender", "emails", ["sender"])
    op.create_index("ix_emails_case_id", "emails", ["case_id"])
    op.create_index("ix_emails_client_id", "emails", ["client_id"])
    op.create_index("ix_emails_external_id", "emails", ["external_id"])
    op.create_index("ix_emails_status", "emails", ["status"])
    op.create_index("ix_emails_urgency", "emails", ["urgency"])


def downgrade() -> None:
    op.drop_table("emails")
    bind = op.get_bind()
    email_urgency.drop(bind, checkfirst=True)
    email_status.drop(bind, checkfirst=True)
    email_provider.drop(bind, checkfirst=True)
