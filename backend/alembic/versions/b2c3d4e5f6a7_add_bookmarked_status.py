"""add bookmarked status to offerstatus enum

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-03-19 16:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add 'bookmarked' value to the offerstatus enum."""
    op.execute(
        "ALTER TYPE offerstatus ADD VALUE IF NOT EXISTS 'bookmarked' BEFORE 'applied'"
    )


def downgrade() -> None:
    """Remove 'bookmarked' from offerstatus enum.

    PostgreSQL does not support removing enum values directly.
    We rename the type, create a new one without 'bookmarked',
    migrate existing rows, and swap.
    """
    op.execute(
        "UPDATE internship_offers SET status = 'applied' WHERE status = 'bookmarked'"
    )
    op.execute("ALTER TYPE offerstatus RENAME TO offerstatus_old")
    op.execute(
        "CREATE TYPE offerstatus AS ENUM ('applied', 'screened', 'interview', 'rejected', 'accepted')"
    )
    op.execute(
        "ALTER TABLE internship_offers "
        "ALTER COLUMN status TYPE offerstatus USING status::text::offerstatus"
    )
    op.execute("DROP TYPE offerstatus_old")
