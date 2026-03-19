"""add reminders and offer_notes tables

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-19 18:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type via raw SQL (idempotent)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE remindertype AS ENUM ('deadline', 'follow_up', 'interview', 'custom');
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # Use postgresql.ENUM with create_type=False to reference the already-created type
    reminder_enum = postgresql.ENUM(
        "deadline",
        "follow_up",
        "interview",
        "custom",
        name="remindertype",
        create_type=False,
    )

    # Create reminders table
    op.create_table(
        "reminders",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "offer_id",
            sa.Integer(),
            sa.ForeignKey("internship_offers.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column(
            "reminder_type", reminder_enum, nullable=False, server_default="custom"
        ),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_at", sa.DateTime(), nullable=False),
        sa.Column("is_done", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_reminders_id", "reminders", ["id"])
    op.create_index("ix_reminders_user_id", "reminders", ["user_id"])
    op.create_index("ix_reminders_due_at", "reminders", ["due_at"])

    # Create offer_notes table
    op.create_table(
        "offer_notes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "offer_id",
            sa.Integer(),
            sa.ForeignKey("internship_offers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index("ix_offer_notes_id", "offer_notes", ["id"])
    op.create_index("ix_offer_notes_offer_id", "offer_notes", ["offer_id"])


def downgrade() -> None:
    op.drop_index("ix_offer_notes_offer_id", table_name="offer_notes")
    op.drop_index("ix_offer_notes_id", table_name="offer_notes")
    op.drop_table("offer_notes")

    op.drop_index("ix_reminders_due_at", table_name="reminders")
    op.drop_index("ix_reminders_user_id", table_name="reminders")
    op.drop_index("ix_reminders_id", table_name="reminders")
    op.drop_table("reminders")

    op.execute("DROP TYPE IF EXISTS remindertype")
