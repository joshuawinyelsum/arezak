import uuid

import pytest

from app.models.account import Account
from app.models.ledger_entry import LedgerEntry
from app.models.transaction import TransactionType
from app.models.user import User
from app.rules.decision import ConstraintViolationException
from app.services import account_identity
from app.services.internal_transfer import initiate_internal_transfer
from app.services.recipient_identity import RecipientNotFound, resolve_recipient
from app.api.v1.transactions import get_transactions, get_transaction_ledger


def _other_user(db_session, *, handle=None, phone=None, verified=False):
    user = User(
        email=f"recipient_{uuid.uuid4()}@example.com",
        name="Ama Recipient",
        password_hash="test-hash",
        currency="GHS",
        handle=handle,
        phone_number=phone,
        phone_verified=verified,
    )
    db_session.add(user)
    db_session.flush()
    account = account_identity.create_account(db_session, user_id=user.id, name="Main Account")
    db_session.flush()
    return user, account


def test_account_number_is_generated_unique_and_persisted(db_session, test_user, test_account):
    _, another = _other_user(db_session)
    db_session.commit()
    db_session.refresh(another)
    assert len(test_account.account_number) == 12
    assert test_account.account_number.isdigit()
    assert test_account.account_number != another.account_number
    assert db_session.get(Account, another.id).account_number == another.account_number


def test_account_number_collision_retries(db_session, test_user, test_account, monkeypatch):
    generated = iter([test_account.account_number, "123456789987"])
    monkeypatch.setattr(account_identity, "generate_account_number", lambda: next(generated))
    account = account_identity.create_account(db_session, user_id=test_user.id, name="Second Account")
    assert account.account_number == "123456789987"


def test_resolve_account_number_handle_and_qr_to_same_canonical_account(db_session):
    user, account = _other_user(db_session, handle=f"person_{uuid.uuid4().hex[:8]}")
    db_session.commit()
    by_number = resolve_recipient(db_session, account.account_number)
    by_handle = resolve_recipient(db_session, f"@{user.handle}")
    by_qr = resolve_recipient(db_session, f"arezak://receive/{account.qr_token}")
    assert by_number.account_id == by_handle.account_id == by_qr.account_id == account.id
    assert by_number.display_name == "Ama Recipient"
    assert by_number.account_number == account.account_number


def test_phone_lookup_requires_verified_phone(db_session):
    phone = f"+23324{uuid.uuid4().int % 10_000_000:07d}"
    _, account = _other_user(db_session, phone=phone, verified=False)
    db_session.commit()
    with pytest.raises(RecipientNotFound):
        resolve_recipient(db_session, phone)
    db_session.query(User).filter(User.phone_number == phone).update({User.phone_verified: True})
    db_session.commit()
    assert resolve_recipient(db_session, phone).account_id == account.id


def test_internal_transfer_credits_canonical_recipient_once(db_session, test_user, test_account):
    recipient_user, recipient_account = _other_user(db_session, handle=f"target_{uuid.uuid4().hex[:8]}")
    test_account.available_balance = 5_000
    db_session.flush()
    key = str(uuid.uuid4())

    first = initiate_internal_transfer(
        db_session,
        user_id=test_user.id,
        source_account_id=test_account.id,
        recipient_account_id=recipient_account.id,
        amount_pesewas=1_200,
        idempotency_key=key,
    )
    db_session.flush()
    replay = initiate_internal_transfer(
        db_session,
        user_id=test_user.id,
        source_account_id=test_account.id,
        recipient_account_id=recipient_account.id,
        amount_pesewas=1_200,
        idempotency_key=key,
    )
    assert first.id == replay.id
    assert first.type == TransactionType.TRANSFER
    assert first.recipient_account_id == recipient_account.id
    assert test_account.available_balance == 3_800
    assert recipient_account.available_balance == 1_200
    entries = db_session.query(LedgerEntry).filter_by(transaction_id=first.id).all()
    assert len(entries) == 2
    assert sum(entry.amount for entry in entries if entry.entry_type == "DEBIT") == 1_200
    assert sum(entry.amount for entry in entries if entry.entry_type == "CREDIT") == 1_200
    assert recipient_account.user_id == recipient_user.id

    sender_history = get_transactions(db_session, test_user)
    recipient_history = get_transactions(db_session, recipient_user)
    sent = next(item for item in sender_history if item.id == first.id)
    received = next(item for item in recipient_history if item.id == first.id)
    assert sent.direction == "OUTGOING"
    assert received.direction == "INCOMING"
    assert received.description == "Received from Arezak user"
    recipient_ledger = get_transaction_ledger(first.id, db_session, recipient_user)
    assert len(recipient_ledger) == 1


def test_internal_transfer_idempotency_conflicts_on_recipient_change(db_session, test_user, test_account):
    _, first_recipient = _other_user(db_session)
    _, other_recipient = _other_user(db_session)
    test_account.available_balance = 5_000
    db_session.flush()
    key = str(uuid.uuid4())
    params = dict(
        user_id=test_user.id,
        source_account_id=test_account.id,
        amount_pesewas=500,
        idempotency_key=key,
    )
    initiate_internal_transfer(db_session, recipient_account_id=first_recipient.id, **params)
    with pytest.raises(ConstraintViolationException):
        initiate_internal_transfer(db_session, recipient_account_id=other_recipient.id, **params)
