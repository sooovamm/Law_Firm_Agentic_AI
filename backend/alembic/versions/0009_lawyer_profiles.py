"""lawyer onboarding & AI matching: lawyer_profiles, lawyer_secondary_practice_areas,
lawyer_match_recommendations

Revision ID: 0009_lawyer_profiles
Revises: 0008_email_otp
Create Date: 2026-08-04 00:00:00.000000
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0009_lawyer_profiles"
down_revision: str | None = "0008_email_otp"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


lawyer_practice_area = postgresql.ENUM(
    "criminal",
    "family",
    "divorce",
    "civil_litigation",
    "corporate",
    "employment",
    "immigration",
    "property",
    "tax",
    "intellectual_property",
    "consumer",
    "cyber",
    "contract",
    "real_estate",
    "bankruptcy",
    "environmental",
    "other",
    name="lawyer_practice_area",
    create_type=False,
)
case_complexity = postgresql.ENUM(
    "simple", "moderate", "complex", "highly_complex", name="case_complexity", create_type=False
)
client_type = postgresql.ENUM("individual", "business", "both", name="client_type", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    lawyer_practice_area.create(bind, checkfirst=True)
    case_complexity.create(bind, checkfirst=True)
    client_type.create(bind, checkfirst=True)

    op.create_table(
        "lawyer_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("years_of_experience", sa.Integer(), nullable=True),
        sa.Column("biography", sa.Text(), nullable=True),
        sa.Column("languages_spoken", sa.Text(), nullable=True),
        sa.Column("primary_practice_area", lawyer_practice_area, nullable=True),
        sa.Column("jurisdictions", sa.Text(), nullable=True),
        sa.Column("bar_registration_number", sa.String(length=100), nullable=True),
        sa.Column("law_firm_name", sa.String(length=255), nullable=True),
        sa.Column("highest_qualification", sa.String(length=255), nullable=True),
        sa.Column("current_position", sa.String(length=255), nullable=True),
        sa.Column("total_cases_handled", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_cases_won", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_cases_lost", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active_cases", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("settlement_cases", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("appeal_cases", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("average_case_duration_days", sa.Integer(), nullable=True),
        sa.Column("largest_case_value", sa.Numeric(14, 2), nullable=True),
        sa.Column("notable_achievements", sa.Text(), nullable=True),
        sa.Column("minimum_case_value", sa.Numeric(14, 2), nullable=True),
        sa.Column("maximum_case_value", sa.Numeric(14, 2), nullable=True),
        sa.Column("preferred_case_complexity", case_complexity, nullable=True),
        sa.Column("preferred_client_type", client_type, nullable=True),
        sa.Column("weekly_capacity", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("current_workload", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("preferred_consultation_days", sa.Text(), nullable=True),
        sa.Column("preferred_consultation_hours_start", sa.String(length=5), nullable=True),
        sa.Column("preferred_consultation_hours_end", sa.String(length=5), nullable=True),
        sa.Column("accepts_new_clients", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("expertise_score", sa.Float(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("profile_embedding", sa.Text(), nullable=True),
        sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("user_id", name="uq_lawyer_profiles_user_id"),
    )
    op.create_index("ix_lawyer_profiles_id", "lawyer_profiles", ["id"])
    op.create_index("ix_lawyer_profiles_user_id", "lawyer_profiles", ["user_id"])
    op.create_index(
        "ix_lawyer_profiles_primary_practice_area", "lawyer_profiles", ["primary_practice_area"]
    )

    op.create_table(
        "lawyer_secondary_practice_areas",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lawyer_profile_id", sa.Integer(), nullable=False),
        sa.Column("practice_area", lawyer_practice_area, nullable=False),
        sa.ForeignKeyConstraint(["lawyer_profile_id"], ["lawyer_profiles.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_lawyer_secondary_practice_areas_id", "lawyer_secondary_practice_areas", ["id"])
    op.create_index(
        "ix_lawyer_secondary_practice_areas_lawyer_profile_id",
        "lawyer_secondary_practice_areas",
        ["lawyer_profile_id"],
    )

    op.create_table(
        "lawyer_match_recommendations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), nullable=False),
        sa.Column("case_id", sa.Integer(), nullable=True),
        sa.Column("recommended_lawyer_id", sa.Integer(), nullable=True),
        sa.Column("match_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reasoning", sa.Text(), nullable=True),
        sa.Column("alternative_lawyer_ids", sa.Text(), nullable=True),
        sa.Column("was_overridden", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("overridden_lawyer_id", sa.Integer(), nullable=True),
        sa.Column("overridden_by_id", sa.Integer(), nullable=True),
        sa.Column("overridden_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["case_id"], ["cases.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["recommended_lawyer_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["overridden_lawyer_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["overridden_by_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_lawyer_match_recommendations_id", "lawyer_match_recommendations", ["id"])
    op.create_index(
        "ix_lawyer_match_recommendations_conversation_id",
        "lawyer_match_recommendations",
        ["conversation_id"],
    )
    op.create_index(
        "ix_lawyer_match_recommendations_case_id", "lawyer_match_recommendations", ["case_id"]
    )
    op.create_index(
        "ix_lawyer_match_recommendations_recommended_lawyer_id",
        "lawyer_match_recommendations",
        ["recommended_lawyer_id"],
    )


def downgrade() -> None:
    op.drop_table("lawyer_match_recommendations")
    op.drop_table("lawyer_secondary_practice_areas")
    op.drop_table("lawyer_profiles")
    bind = op.get_bind()
    client_type.drop(bind, checkfirst=True)
    case_complexity.drop(bind, checkfirst=True)
    lawyer_practice_area.drop(bind, checkfirst=True)
