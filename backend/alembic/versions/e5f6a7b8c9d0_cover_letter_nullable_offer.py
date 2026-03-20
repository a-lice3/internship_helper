"""make offer_id nullable and add name to generated_cover_letters

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-03-20 11:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "generated_cover_letters",
        sa.Column("name", sa.String(300), nullable=True),
    )
    op.alter_column(
        "generated_cover_letters",
        "offer_id",
        existing_type=sa.Integer(),
        nullable=True,
    )
    op.alter_column(
        "generated_cover_letters",
        "offer_title",
        existing_type=sa.String(300),
        nullable=True,
    )
    op.alter_column(
        "generated_cover_letters",
        "company",
        existing_type=sa.String(200),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "generated_cover_letters",
        "company",
        existing_type=sa.String(200),
        nullable=False,
    )
    op.alter_column(
        "generated_cover_letters",
        "offer_title",
        existing_type=sa.String(300),
        nullable=False,
    )
    op.alter_column(
        "generated_cover_letters",
        "offer_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.drop_column("generated_cover_letters", "name")
