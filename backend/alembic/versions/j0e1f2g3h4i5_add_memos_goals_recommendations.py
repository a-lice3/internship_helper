"""add memos, goals, goal_progress, skill_recommendations tables

Revision ID: j0e1f2g3h4i5
Revises: i9d0e1f2g3h4
Create Date: 2026-03-23 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "j0e1f2g3h4i5"
down_revision: Union[str, None] = "i9d0e1f2g3h4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # -- Memos --
    op.create_table(
        "memos",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("tags", sa.Text(), nullable=True),
        sa.Column(
            "offer_id",
            sa.Integer(),
            sa.ForeignKey("internship_offers.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("skill_name", sa.String(100), nullable=True),
        sa.Column("is_favorite", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # -- Skill Recommendations (cache) --
    op.create_table(
        "skill_recommendations",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
            unique=True,
        ),
        sa.Column("aggregated_skills", sa.Text(), nullable=False),
        sa.Column("offers_analyzed_count", sa.Integer(), nullable=False),
        sa.Column("generated_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # -- Goal frequency enum --
    goalfrequency = postgresql.ENUM(
        "daily", "weekly", name="goalfrequency", create_type=False
    )
    op.execute(
        "DO $$ BEGIN CREATE TYPE goalfrequency AS ENUM ('daily', 'weekly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$"
    )

    # -- Goals --
    op.create_table(
        "goals",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column(
            "frequency",
            goalfrequency,
            nullable=False,
            server_default="daily",
        ),
        sa.Column("target_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), default=True, server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # -- Goal Progress --
    op.create_table(
        "goal_progress",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "goal_id",
            sa.Integer(),
            sa.ForeignKey("goals.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("completed_count", sa.Integer(), default=0, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.UniqueConstraint("goal_id", "date", name="uq_goal_progress_goal_date"),
    )


def downgrade() -> None:
    op.drop_table("goal_progress")
    op.drop_table("goals")
    op.execute("DROP TYPE IF EXISTS goalfrequency")
    op.drop_table("skill_recommendations")
    op.drop_table("memos")
