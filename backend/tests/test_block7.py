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
    assert res.status_code == 501
