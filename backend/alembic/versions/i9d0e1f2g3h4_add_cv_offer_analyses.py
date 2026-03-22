"""add cv_offer_analyses table

Revision ID: i9d0e1f2g3h4
Revises: h8c9d0e1f2g3
Create Date: 2026-03-22 15:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "i9d0e1f2g3h4"
down_revision: Union[str, None] = "h8c9d0e1f2g3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "cv_offer_analyses",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "offer_id",
            sa.Integer(),
            sa.ForeignKey("internship_offers.id"),
            nullable=False,
        ),
        sa.Column(
            "cv_id",
            sa.Integer(),
            sa.ForeignKey("cvs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("offer_title", sa.String(300), nullable=False),
        sa.Column("company", sa.String(200), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("suggested_title", sa.Text(), nullable=True),
        sa.Column("suggested_profile", sa.Text(), nullable=True),
        sa.Column("other_suggestions", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("cv_offer_analyses")
