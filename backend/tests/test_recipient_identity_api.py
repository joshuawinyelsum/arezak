import uuid

from app.core.security import create_access_token
from app.models.account import Account
from app.models.user import User
from app.services.account_identity import create_account
from tests.conftest import TestingSessionLocal


def test_recipient_resolution_and_internal_transfer_api(client):
    sender = User(
        email=f"sender_{uuid.uuid4()}@example.test",
        name="Sender Person",
        password_hash="test-hash",
        currency="GHS",
    )
    recipient = User(
        email=f"recipient_{uuid.uuid4()}@example.test",
        name="Recipient Person",
        handle=f"recipient_{uuid.uuid4().hex[:10]}",
        password_hash="test-hash",
        currency="GHS",
    )
    with TestingSessionLocal() as db:
        db.add_all([sender, recipient])
        db.flush()
        sender_account = create_account(db, user_id=sender.id, name="Sender main")
        recipient_account = create_account(db, user_id=recipient.id, name="Recipient main")
        sender_account.available_balance = 8_000
        sender_id = sender.id
        recipient_id = recipient.id
        recipient_handle = recipient.handle
        db.commit()
        sender_account_id = sender_account.id
        recipient_account_number = recipient_account.account_number
        recipient_qr = f"arezak://receive/{recipient_account.qr_token}"

    sender_cookie = {"access_token": create_access_token(str(sender_id))}
    identity = client.get("/api/v1/identity/me", cookies=sender_cookie)
    assert identity.status_code == 200
    own_identity = identity.json()
    assert own_identity["accounts"][0]["account_number"]
    assert own_identity["accounts"][0]["qr_payload"].startswith("arezak://receive/")

    for identifier in (recipient_account_number, f"@{recipient_handle}", recipient_qr, str(recipient_id)):
        response = client.post(
            "/api/v1/identity/resolve",
            json={"identifier": identifier},
            cookies=sender_cookie,
            headers={"x-requested-with": "XMLHttpRequest"},
        )
        assert response.status_code == 200
        assert response.json()["display_name"] == "Recipient Person"
        assert response.json()["account_number"] == recipient_account_number
        assert "account_id" not in response.json()

    transfer = client.post(
        "/api/v1/operations/internal-transfer",
        json={
            "account_id": str(sender_account_id),
            "recipient_identifier": f"@{recipient_handle}",
            "amount": {"amount_pesewas": 1_250, "currency": "GHS"},
            "note": "Dinner",
        },
        cookies=sender_cookie,
        headers={"x-requested-with": "XMLHttpRequest", "Idempotency-Key": str(uuid.uuid4())},
    )
    assert transfer.status_code == 201, transfer.text

    with TestingSessionLocal() as db:
        assert db.get(Account, sender_account_id).available_balance == 6_750

    recipient_history = client.get(
        "/api/v1/transactions",
        cookies={"access_token": create_access_token(str(recipient_id))},
    )
    received = next(item for item in recipient_history.json() if item["id"] == transfer.json()["transaction_id"])
    assert received["direction"] == "INCOMING"
    assert received["description"] == "Received from Arezak user"
