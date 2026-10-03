import pytest
from unittest.mock import MagicMock
from app.services.otp_service import generate_and_send_otp, verify_otp, OTPDeliveryFailed, OTPRateLimitExceeded
from app.models.phone_verification import PhoneVerificationAttempt
from app.core.config import settings
from app.providers.mtn import mtn_provider, MTNSMSError
import httpx
from datetime import datetime, timedelta, timezone

@pytest.fixture(autouse=True)
def reset_mtn_cache():
    mtn_provider._token = None
    mtn_provider._token_expiry = 0
    yield
    mtn_provider._token = None

class MockResponse:
    def __init__(self, json_data, status_code=200):
        self._json = json_data
        self.status_code = status_code
        self.text = "Error"
    def json(self):
        if self._json is None: raise ValueError("No json")
        return self._json
    def raise_for_status(self):
        if self.status_code >= 400:
            raise httpx.HTTPStatusError("error", request=MagicMock(), response=self)

def test_mtn_oauth_success_and_sms_success(db_session, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "MTN_CONSUMER_KEY", "mock_key")
    monkeypatch.setattr(settings, "MTN_CONSUMER_SECRET", "mock_sec")
    monkeypatch.setattr(settings, "MTN_SMS_SENDER_ADDRESS", "AREZAK")
    
    calls = []
    
    def mock_post(url, *args, **kwargs):
        calls.append(url)
        if "oauth" in url:
            assert "Basic" in kwargs["headers"]["Authorization"]
            return MockResponse({"access_token": "mock_token", "expires_in": 3600})
        elif "messages" in url:
            assert kwargs["headers"]["Authorization"] == "Bearer mock_token"
            assert kwargs["json"]["receiverAddress"] == ["+233244000000"]
            assert kwargs["json"]["senderAddress"] == "AREZAK"
            assert "Your Arezak verification code" in kwargs["json"]["message"]
            return MockResponse({"resourceReference": {"transactionId": "txn123"}}, status_code=201)
            
    monkeypatch.setattr(mtn_provider._client, "post", mock_post)
    
    generate_and_send_otp(db_session, "+233244000000")
    
    assert len(calls) == 2
    attempt = db_session.query(PhoneVerificationAttempt).filter_by(phone_number="+233244000000").first()
    assert attempt is not None
    assert attempt.otp_hash is not None
    assert attempt.provider == "mtn"
    assert attempt.provider_managed is False

def test_mtn_oauth_failure(db_session, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "MTN_CONSUMER_KEY", "mock_key")
    monkeypatch.setattr(settings, "MTN_CONSUMER_SECRET", "mock_sec")
    monkeypatch.setattr(settings, "MTN_SMS_SENDER_ADDRESS", "AREZAK")
    
    def mock_post(url, *args, **kwargs):
        if "oauth" in url:
            return MockResponse(None, status_code=401)
            
    monkeypatch.setattr(mtn_provider._client, "post", mock_post)
    
    with pytest.raises(OTPDeliveryFailed, match="Failed to authenticate"):
        generate_and_send_otp(db_session, "+233244000001")

def test_mtn_sms_provider_failure(db_session, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "MTN_CONSUMER_KEY", "mock_key")
    monkeypatch.setattr(settings, "MTN_CONSUMER_SECRET", "mock_sec")
    monkeypatch.setattr(settings, "MTN_SMS_SENDER_ADDRESS", "AREZAK")
    
    def mock_post(url, *args, **kwargs):
        if "oauth" in url:
            return MockResponse({"access_token": "mock_token", "expires_in": 3600})
        elif "messages" in url:
            return MockResponse({}, status_code=400)
            
    monkeypatch.setattr(mtn_provider._client, "post", mock_post)
    
    with pytest.raises(OTPDeliveryFailed, match="Provider rejected SMS request"):
        generate_and_send_otp(db_session, "+233244000002")

def test_mtn_timeout(db_session, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "MTN_CONSUMER_KEY", "mock_key")
    monkeypatch.setattr(settings, "MTN_CONSUMER_SECRET", "mock_sec")
    monkeypatch.setattr(settings, "MTN_SMS_SENDER_ADDRESS", "AREZAK")
    
    def mock_post(url, *args, **kwargs):
        if "oauth" in url:
            return MockResponse({"access_token": "mock_token", "expires_in": 3600})
        elif "messages" in url:
            raise httpx.RequestError("Timeout")
            
    monkeypatch.setattr(mtn_provider._client, "post", mock_post)
    
    with pytest.raises(OTPDeliveryFailed, match="Network failure connecting to SMS provider"):
        generate_and_send_otp(db_session, "+233244000003")

def test_mtn_malformed_json(db_session, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "MTN_CONSUMER_KEY", "mock_key")
    monkeypatch.setattr(settings, "MTN_CONSUMER_SECRET", "mock_sec")
    monkeypatch.setattr(settings, "MTN_SMS_SENDER_ADDRESS", "AREZAK")
    
    def mock_post(url, *args, **kwargs):
        if "oauth" in url:
            return MockResponse({"access_token": "mock_token", "expires_in": 3600})
        elif "messages" in url:
            return MockResponse(None, status_code=201) # JSON throws ValueError
            
    monkeypatch.setattr(mtn_provider._client, "post", mock_post)
    
    with pytest.raises(OTPDeliveryFailed, match="Malformed provider success response"):
        generate_and_send_otp(db_session, "+233244000005")

def test_no_secret_leakage(monkeypatch, caplog):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "MTN_CONSUMER_KEY", "SUPER_SECRET_KEY")
    monkeypatch.setattr(settings, "MTN_CONSUMER_SECRET", "SUPER_SECRET_SECRET")
    monkeypatch.setattr(settings, "MTN_SMS_SENDER_ADDRESS", "AREZAK")
    
    def mock_post(url, *args, **kwargs):
        raise httpx.RequestError("Forced Failure")
        
    monkeypatch.setattr(mtn_provider._client, "post", mock_post)
    
    try:
        mtn_provider._refresh_token()
    except MTNSMSError:
        pass
        
    # Check that secrets are not in logs
    assert "SUPER_SECRET_KEY" not in caplog.text
    assert "SUPER_SECRET_SECRET" not in caplog.text

def test_verify_success_and_failure(db_session, monkeypatch):
    # Just standard verification testing since provider_managed is False
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")
    monkeypatch.setattr(settings, "MTN_SMS_SENDER_ADDRESS", "AREZAK")
    generate_and_send_otp(db_session, "+233244000004")
    
    assert verify_otp(db_session, "+233244000004", "000000") is False
    assert verify_otp(db_session, "+233244000004", "123456") is True
