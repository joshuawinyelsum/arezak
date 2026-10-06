"""Regression coverage for nullable identity fields and photo upload contracts."""
import uuid

from fastapi.testclient import TestClient

from app.core.security import create_access_token
from app.models.user import User
from app.core.config import settings


def _authenticated_user(db_session):
    user = User(
        id=uuid.uuid4(),
        email=f"identity-{uuid.uuid4()}@example.com",
        first_name="Identity",
        last_name="Test",
        phone_number=None,
        phone_verified=False,
        handle=None,
        profile_photo_url=None,
        password_hash="not-used",
    )
    db_session.add(user)
    db_session.commit()
    return user, {"access_token": create_access_token(str(user.id))}


def test_identity_allows_missing_optional_fields(client: TestClient, db_session):
    from app.api.deps import get_db

    client.app.dependency_overrides[get_db] = lambda: db_session
    user, cookies = _authenticated_user(db_session)

    me = client.get(f"{settings.API_V1_STR}/identity/me", cookies=cookies)
    auth_me = client.get(f"{settings.API_V1_STR}/auth/me", cookies=cookies)

    assert me.status_code == 200, me.text
    assert me.json()["handle"] is None
    assert me.json()["phone_number"] is None
    assert me.json()["profile_photo_url"] is None
    assert len(me.json()["accounts"]) == 1
    assert auth_me.status_code == 200, auth_me.text
    assert auth_me.json()["status"] == "authenticated"
    assert auth_me.json()["phone_verified"] is False


def test_profile_photo_upload_returns_persisted_identity(client: TestClient, db_session, monkeypatch):
    from app.api.deps import get_db

    client.app.dependency_overrides[get_db] = lambda: db_session
    user, cookies = _authenticated_user(db_session)
    user.profile_photo_url = "https://cdn.example.test/previous.webp"
    db_session.commit()

    class MockStorage:
        def upload_profile_photo(self, user_id, file):
            assert user_id == user.id
            assert file.content_type == "image/webp"
            return "https://cdn.example.test/profile.webp"

    monkeypatch.setattr("app.services.storage.storage_service", MockStorage())
    response = client.put(
        f"{settings.API_V1_STR}/identity/profile/photo",
        cookies=cookies,
        files={"file": ("profile.webp", b"RIFFxxxxWEBP data", "image/webp")},
        headers={"x-requested-with": "XMLHttpRequest"},
    )

    assert response.status_code == 200, response.text
    assert response.json()["profile_photo_url"] == "https://cdn.example.test/profile.webp"
    db_session.refresh(user)
    assert user.profile_photo_url == response.json()["profile_photo_url"]


def test_profile_photo_rejects_invalid_type_and_oversized_files(client: TestClient, db_session):
    from app.api.deps import get_db

    client.app.dependency_overrides[get_db] = lambda: db_session
    _, cookies = _authenticated_user(db_session)
    url = f"{settings.API_V1_STR}/identity/profile/photo"
    headers = {"x-requested-with": "XMLHttpRequest"}

    invalid = client.put(url, cookies=cookies, files={"file": ("notes.txt", b"text", "text/plain")}, headers=headers)
    oversized = client.put(url, cookies=cookies, files={"file": ("large.png", b"x" * (5 * 1024 * 1024 + 1), "image/png")}, headers=headers)

    assert invalid.status_code == 400
    assert oversized.status_code == 400
