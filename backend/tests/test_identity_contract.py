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


def test_profile_photo_upload_stores_key_and_returns_public_url(client: TestClient, db_session, monkeypatch):
    """Uploads persist an object key; the API renders it as a loadable URL."""
    from app.api.deps import get_db

    client.app.dependency_overrides[get_db] = lambda: db_session
    user, cookies = _authenticated_user(db_session)
    user.profile_photo_url = "profiles/old/previous.webp"
    db_session.commit()

    seen = {}

    class MockStorage:
        def upload_profile_photo(self, user_id, file, previous_reference=None):
            assert user_id == user.id
            assert file.content_type == "image/webp"
            seen["previous_reference"] = previous_reference
            return "profiles/new/photo_abc.webp"

        def public_url(self, reference):
            return None if not reference else f"https://cdn.example.test/{reference}"

    monkeypatch.setattr("app.api.v1.identity.storage_service", MockStorage())
    response = client.put(
        f"{settings.API_V1_STR}/identity/profile/photo",
        cookies=cookies,
        files={"file": ("profile.webp", b"RIFFxxxxWEBP data", "image/webp")},
        headers={"x-requested-with": "XMLHttpRequest"},
    )

    assert response.status_code == 200, response.text
    # The response carries a URL the browser can load...
    assert response.json()["profile_photo_url"] == "https://cdn.example.test/profiles/new/photo_abc.webp"
    # ...while the row stores only the key, so the storage host can change.
    db_session.refresh(user)
    assert user.profile_photo_url == "profiles/new/photo_abc.webp"
    # The superseded object is handed over so it can be removed.
    assert seen["previous_reference"] == "profiles/old/previous.webp"


def test_profile_photo_rejects_content_that_is_not_really_an_image(client: TestClient, db_session):
    """A declared image content type must not be enough to get a file stored."""
    from app.api.deps import get_db

    client.app.dependency_overrides[get_db] = lambda: db_session
    _, cookies = _authenticated_user(db_session)

    response = client.put(
        f"{settings.API_V1_STR}/identity/profile/photo",
        cookies=cookies,
        files={"file": ("payload.png", bytes.fromhex("4d5a9000") + b" windows executable", "image/png")},
        headers={"x-requested-with": "XMLHttpRequest"},
    )

    assert response.status_code == 400, response.text
    assert "not a valid" in response.json()["detail"]


def test_profile_photo_upload_unconfigured_storage_is_unavailable_not_an_error(client: TestClient, db_session):
    """With no storage configured the endpoint reports 503, never a 500."""
    from app.api.deps import get_db

    client.app.dependency_overrides[get_db] = lambda: db_session
    _, cookies = _authenticated_user(db_session)

    response = client.put(
        f"{settings.API_V1_STR}/identity/profile/photo",
        cookies=cookies,
        files={"file": ("profile.png", bytes.fromhex("89504e470d0a1a0a") + b"body", "image/png")},
        headers={"x-requested-with": "XMLHttpRequest"},
    )

    assert response.status_code == 503, response.text


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
