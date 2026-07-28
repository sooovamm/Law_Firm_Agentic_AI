"""initial schema: users, clients, cases

Revision ID: 0001_initial
Revises:
Create Date: 2026-07-27 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


user_role = postgresql.ENUM("admin", "lawyer", "paralegal", name="user_role", create_type=False)
case_status = postgresql.ENUM("open", "in_progress", "on_hold", "closed", name="case_status", create_type=False)
practice_area = postgresql.ENUM(
    "corporate",
    "criminal",
    "family",
    "immigration",
    "intellectual_property",
    "labor",
    "real_estate",
    "tax",
    "litigation",
    "other",
    name="practice_area", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    user_role.create(bind, checkfirst=True)
    case_status.create(bind, checkfirst=True)
    practice_area.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="paralegal"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_id", "users", ["id"])
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("company", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_clients_id", "clients", ["id"])
    op.create_index("ix_clients_full_name", "clients", ["full_name"])
    op.create_index("ix_clients_email", "clients", ["email"], unique=True)

    op.create_table(
        "cases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("practice_area", practice_area, nullable=False),
        sa.Column("status", case_status, nullable=False, server_default="open"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("assigned_lawyer_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assigned_lawyer_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_cases_id", "cases", ["id"])
    op.create_index("ix_cases_title", "cases", ["title"])
    op.create_index("ix_cases_status", "cases", ["status"])
    op.create_index("ix_cases_client_id", "cases", ["client_id"])
    op.create_index("ix_cases_assigned_lawyer_id", "cases", ["assigned_lawyer_id"])


def downgrade() -> None:
    op.drop_table("cases")
    op.drop_table("clients")
    op.drop_table("users")

    bind = op.get_bind()
    practice_area.drop(bind, checkfirst=True)
    case_status.drop(bind, checkfirst=True)
    user_role.drop(bind, checkfirst=True)
