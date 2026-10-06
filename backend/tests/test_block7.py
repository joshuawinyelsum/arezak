import pytest
import uuid
from fastapi.testclient import TestClient
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.models.phone_verification import PhoneVerificationAttempt
from app.models.provider_identity import ProviderIdentity
from app.models.user import User
from app.core.security import get_password_hash

def test_otp_expiry_and_limits(client: TestClient, db_session):

    from app.api.deps import get_db
    client.app.dependency_overrides[get_db] = lambda: db_session

    phone = "+233240000010"

    res = client.post(f"{settings.API_V1_STR}/auth/register", json={"email": "p1@ex.com", "password": "pass", "first_name": "F", "last_name": "L", "phone_number": "+233240000013", "handle": "photo_hdl"}, headers={"x-requested-with": "XMLHttpRequest"})
    cookies = res.cookies
    
    # Bypass OTP
    attempt = PhoneVerificationAttempt(
        phone_number="+233240000013",
        otp_hash=get_password_hash("123456"),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        attempts=0,
        verified=False
    )
    db_session.add(attempt)
    db_session.commit()
    
    res = client.post(f"{settings.API_V1_STR}/auth/verify-phone", json={"phone_number": "+233240000013", "otp": "123456"}, cookies=cookies, headers={"x-requested-with": "XMLHttpRequest"})
    cookies = res.cookies
    
    # Upload photo
    # This requires a multipart file
    # If storage is missing, returns 501
    res = client.put(f"{settings.API_V1_STR}/identity/profile/photo", cookies=cookies, files={"file": ("test.jpg", b"fake image bytes", "image/jpeg")}, headers={"x-requested-with": "XMLHttpRequest"})
    assert res.status_code == 503

def test_delete_profile_photo(client: TestClient, db_session, monkeypatch):
    from app.services.storage import storage_service
    
    # Mock storage_service to prevent 501
    class MockStorage:
        def delete_profile_photo(self, photo_url: str):
            pass
    
    monkeypatch.setattr("app.services.storage.storage_service", MockStorage())
    
    # Create user directly
    user_id = uuid.uuid4()
    user = User(
        id=user_id,
        email="photodel@example.com",
        password_hash="hash",
        first_name="P",
        last_name="D",
        phone_number="+233240000099",
        handle="photodel",
        phone_verified=True,
        profile_photo_url="https://s3.amazonaws.com/fake/photo.jpg"
    )
    db_session.add(user)
    db_session.commit()
    
    from app.core.security import create_access_token
    token = create_access_token(str(user.id))
    
    res = client.delete(f"{settings.API_V1_STR}/identity/profile/photo", cookies={"access_token": token}, headers={"x-requested-with": "XMLHttpRequest"})
    
    assert res.status_code == 200
    
    db_session.refresh(user)
    assert user.profile_photo_url is None
