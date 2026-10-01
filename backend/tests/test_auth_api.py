import pytest
import uuid
from fastapi.testclient import TestClient
from app.core.config import settings

def test_cors_options_preflight(client: TestClient):
    # Test that OPTIONS requests are handled by CORS middleware 
    # and NOT rejected by the CSRF middleware.
    response = client.options(
        f"{settings.API_V1_STR}/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST"
        }
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert response.headers.get("access-control-allow-credentials") == "true"

def test_csrf_protection_missing_header(client: TestClient):
    # Test that a POST without x-requested-with is rejected
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "test@test.com", "password": "password"}
    )
    assert response.status_code == 403
    assert "CSRF protection" in response.json()["detail"]

def test_csrf_protection_with_header(client: TestClient):
    # Test that a POST with x-requested-with is accepted (even if auth fails)
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": "test@test.com", "password": "password"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    # Auth fails but CSRF passes
    assert response.status_code == 401

def test_get_request_bypasses_csrf(client: TestClient):
    # Test that GET requests don't need the header
    response = client.get(f"{settings.API_V1_STR}/identity/me")
    # Will fail auth, but NOT fail CSRF
    assert response.status_code == 401

def test_registration_and_login_success(client: TestClient, db_session):
    uid = str(uuid.uuid4())
    # Register A
    register_response = client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={"email": f"user_a_{uid}@example.com", "password": "passwordA123", "first_name": "Test", "last_name": "User A", "phone_number": "+233240000001", "handle": "hdla"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    assert register_response.status_code == 201
    
    # Register duplicate
    dup_response = client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={"email": f"user_a_{uid}@example.com", "password": "passwordA123", "first_name": "Test", "last_name": "User A Dup", "phone_number": "+233240000003", "handle": "hdlc"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    assert dup_response.status_code == 400
    
    # Login A
    login_response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": f"user_a_{uid}@example.com", "password": "passwordA123"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    assert login_response.status_code == 200
    
    # Check cookie
    cookies = login_response.cookies
    assert "access_token" in cookies

    # Verify phone to get full session
    from tests.conftest import TestingSessionLocal
    from app.models.phone_verification import PhoneVerificationAttempt
    from app.core.security import get_password_hash
    from datetime import datetime, timedelta, timezone

    if True:
        db = db_session
        attempt = PhoneVerificationAttempt(
            phone_number="+233240000001",
            otp_hash=get_password_hash("123456"),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
            attempts=0,
            verified=False
        )
        db.add(attempt)
        db.commit()

    verify_res = client.post(
        f"{settings.API_V1_STR}/auth/verify-phone",
        json={"phone_number": "+233240000001", "otp": "123456"},
        cookies=cookies,
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    assert verify_res.status_code == 200
    cookies = verify_res.cookies
    
    # Check /me
    me_response = client.get(
        f"{settings.API_V1_STR}/identity/me",
        cookies={"access_token": cookies.get("access_token")}
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == f"user_a_{uid}@example.com"

def test_user_isolation(client: TestClient, db_session):
    from datetime import datetime, timedelta, timezone
    from app.core.security import get_password_hash
    from app.models.phone_verification import PhoneVerificationAttempt
    uid_a = str(uuid.uuid4())
    uid_b = str(uuid.uuid4())
    
    # Setup User A
    client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={"email": f"iso_a_{uid_a}@example.com", "password": "pass", "first_name": "Test", "last_name": "A", "phone_number": "+233240000004", "handle": "hdld"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    login_a = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": f"iso_a_{uid_a}@example.com", "password": "pass"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    cookies_a = login_a.cookies
    
    # Setup User B
    client.post(
        f"{settings.API_V1_STR}/auth/register",
        json={"email": f"iso_b_{uid_b}@example.com", "password": "pass", "first_name": "Test", "last_name": "B", "phone_number": "+233240000005", "handle": "hdle"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    login_b = client.post(
        f"{settings.API_V1_STR}/auth/login",
        json={"email": f"iso_b_{uid_b}@example.com", "password": "pass"},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    cookies_b = login_b.cookies

    if True:
        db = db_session
        a1 = PhoneVerificationAttempt(phone_number="+233240000004", otp_hash=get_password_hash("111111"), expires_at=datetime.now(timezone.utc) + timedelta(minutes=5), attempts=0, verified=False)
        a2 = PhoneVerificationAttempt(phone_number="+233240000005", otp_hash=get_password_hash("222222"), expires_at=datetime.now(timezone.utc) + timedelta(minutes=5), attempts=0, verified=False)
        db.add_all([a1, a2])
        db.commit()
    
    ca = client.post(f"{settings.API_V1_STR}/auth/verify-phone", json={"phone_number": "+233240000004", "otp": "111111"}, cookies=cookies_a, headers={"x-requested-with": "XMLHttpRequest"}).cookies
    cb = client.post(f"{settings.API_V1_STR}/auth/verify-phone", json={"phone_number": "+233240000005", "otp": "222222"}, cookies=cookies_b, headers={"x-requested-with": "XMLHttpRequest"}).cookies
    cookies_a = ca
    cookies_b = cb
    
    # Get A's account
    acc_a_resp = client.get(f"{settings.API_V1_STR}/accounts", cookies={"access_token": cookies_a.get("access_token")})
    assert acc_a_resp.status_code == 200
    acc_a_id = acc_a_resp.json()[0]["id"]
    
    # Get B's account
    acc_b_resp = client.get(f"{settings.API_V1_STR}/accounts", cookies={"access_token": cookies_b.get("access_token")})
    acc_b_id = acc_b_resp.json()[0]["id"]
    
    # User A tries to get User B's account
    iso_acc = client.get(f"{settings.API_V1_STR}/accounts/{acc_b_id}", cookies={"access_token": cookies_a.get("access_token")})
    assert iso_acc.status_code == 404 # Isolated
    
    # User A tries to add income to User B's account
    iso_inc = client.post(
        f"{settings.API_V1_STR}/transactions/income",
        json={
            "account_id": acc_b_id,
            "amount": {"amount_pesewas": 10000, "currency": "GHS"}
        },
        cookies={"access_token": cookies_a.get("access_token")},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    assert iso_inc.status_code in [404, 400] # Usually 400 ConstraintViolation or 404
    if iso_inc.status_code == 400:
        assert iso_inc.json()["detail"]["code"] in ("ACCOUNT_NOT_FOUND", "ACCOUNT_NOT_OWNED")
        
    # Setup a goal for User B
    goal_b_resp = client.post(
        f"{settings.API_V1_STR}/goals/",
        json={"name": "Goal B", "target_amount": 50000},
        cookies={"access_token": cookies_b.get("access_token")},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    assert goal_b_resp.status_code == 200, f"Failed to create Goal B: {goal_b_resp.json()}"
    goal_b_id = goal_b_resp.json()["id"]
    
    # User A tries to read Goal B
    iso_goal_read = client.get(f"{settings.API_V1_STR}/goals/{goal_b_id}", cookies={"access_token": cookies_a.get("access_token")})
    assert iso_goal_read.status_code == 404
    
    # User A tries to contribute to Goal B
    iso_goal_contrib = client.post(
        f"{settings.API_V1_STR}/goals/{goal_b_id}/contributions",
        json={"amount": 1000, "account_id": acc_a_id},
        cookies={"access_token": cookies_a.get("access_token")},
        headers={"x-requested-with": "XMLHttpRequest"}
    )
    assert iso_goal_contrib.status_code in [404, 400]
