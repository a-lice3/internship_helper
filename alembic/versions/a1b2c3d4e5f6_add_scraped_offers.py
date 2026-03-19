"""add scraped_offers table

Revision ID: a1b2c3d4e5f6
Revises: 6808a6c6eb76
Create Date: 2026-03-19 15:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "6808a6c6eb76"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "scraped_offers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=50), nullable=False),
        sa.Column("source_id", sa.String(length=200), nullable=False),
        sa.Column("company", sa.String(length=300), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("locations", sa.String(length=500), nullable=True),
        sa.Column("link", sa.String(length=1000), nullable=True),
        sa.Column("contract_type", sa.String(length=100), nullable=True),
        sa.Column("salary", sa.String(length=200), nullable=True),
        sa.Column("published_at", sa.String(length=30), nullable=True),
        sa.Column("match_score", sa.Float(), nullable=True),
        sa.Column("match_reasons", sa.Text(), nullable=True),
        sa.Column("saved", sa.Boolean(), nullable=True, default=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_scraped_offers_id"), "scraped_offers", ["id"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_scraped_offers_id"), table_name="scraped_offers")
    op.drop_table("scraped_offers")
