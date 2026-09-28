"""Add customer-facing identity and recipient account references.

Revision ID: e82b47c1a9d4
Revises: d7a1c4e9b2f6
"""
from __future__ import annotations

import secrets
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e82b47c1a9d4"
down_revision: Union[str, Sequence[str], None] = "d7a1c4e9b2f6"
branch_labels = None
depends_on = None


def _account_number(used: set[str]) -> str:
    while True:
        candidate = str(secrets.randbelow(900_000_000_000) + 100_000_000_000)
        if candidate not in used:
            used.add(candidate)
            return candidate


def upgrade() -> None:
    op.add_column("users", sa.Column("handle", sa.String(length=30), nullable=True))
    op.add_column("users", sa.Column("phone_number", sa.String(length=20), nullable=True))
    op.add_column("users", sa.Column("phone_verified", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_users_handle", "users", ["handle"], unique=True)
    op.create_index("ix_users_phone_number", "users", ["phone_number"], unique=True)

    op.add_column("accounts", sa.Column("account_number", sa.String(length=12), nullable=True))
    op.add_column("accounts", sa.Column("qr_token", sa.String(length=64), nullable=True))
    bind = op.get_bind()
    account_table = sa.table(
        "accounts",
        sa.column("id", sa.Uuid()),
        sa.column("account_number", sa.String()),
        sa.column("qr_token", sa.String()),
    )
    used: set[str] = set()
    rows = bind.execute(sa.select(account_table.c.id)).all()
    for (account_id,) in rows:
        bind.execute(
            account_table.update()
            .where(account_table.c.id == account_id)
            .values(account_number=_account_number(used), qr_token=secrets.token_urlsafe(24))
        )
    op.alter_column("accounts", "account_number", nullable=False)
    op.alter_column("accounts", "qr_token", nullable=False)
    op.create_index("ix_accounts_account_number", "accounts", ["account_number"], unique=True)
    op.create_index("ix_accounts_qr_token", "accounts", ["qr_token"], unique=True)

    op.add_column("transactions", sa.Column("recipient_account_id", sa.Uuid(), nullable=True))
    op.create_index("ix_transactions_recipient_account_id", "transactions", ["recipient_account_id"])
    op.create_foreign_key(
        "fk_transactions_recipient_account_id_accounts",
        "transactions", "accounts", ["recipient_account_id"], ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_transactions_recipient_account_id_accounts", "transactions", type_="foreignkey")
    op.drop_index("ix_transactions_recipient_account_id", table_name="transactions")
    op.drop_column("transactions", "recipient_account_id")
    op.drop_index("ix_accounts_qr_token", table_name="accounts")
    op.drop_index("ix_accounts_account_number", table_name="accounts")
    op.drop_column("accounts", "qr_token")
    op.drop_column("accounts", "account_number")
    op.drop_index("ix_users_phone_number", table_name="users")
    op.drop_index("ix_users_handle", table_name="users")
    op.drop_column("users", "phone_verified")
    op.drop_column("users", "phone_number")
    op.drop_column("users", "handle")
