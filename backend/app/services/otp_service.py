"""Secure OTP delivery abstraction and logic via MTN."""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.phone_verification import PhoneVerificationAttempt
from app.core.config import settings
from app.core.security import verify_password, get_password_hash
from app.providers.mtn import mtn_provider, MTNSMSError

logger = logging.getLogger(__name__)

class OTPRateLimitExceeded(Exception):
    pass

class OTPDeliveryFailed(Exception):
    pass

def generate_and_send_otp(db: Session, phone_number: str) -> None:
    """Generate and send an OTP using MTN SMS V2."""
    now = datetime.now(timezone.utc)
    
    # 1. Enforce rate limits (read is fine without locks for simple abuse prevention)
    recent_attempts = db.query(PhoneVerificationAttempt).filter(
        PhoneVerificationAttempt.phone_number == phone_number,
        PhoneVerificationAttempt.created_at >= now - timedelta(hours=1)
    ).count()
    
    if recent_attempts >= 5:
        raise OTPRateLimitExceeded("Too many OTP requests. Try again later.")
        
    # Cooldown (e.g. 1 minute between requests)
    last_attempt = db.query(PhoneVerificationAttempt).filter(
        PhoneVerificationAttempt.phone_number == phone_number
    ).order_by(PhoneVerificationAttempt.created_at.desc()).first()
    
    if last_attempt:
        created = last_attempt.created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        if created >= now - timedelta(minutes=1):
            raise OTPRateLimitExceeded("Please wait before requesting another OTP.")

    # 2. Generate secure OTP
    otp_code = "".join(str(secrets.randbelow(10)) for _ in range(6))
    message = f"Your Arezak verification code is {otp_code}. It expires in 5 minutes."

    # 3. Call MTN API FIRST, so a provider failure does not destroy the old valid OTP
    if settings.ENVIRONMENT not in ("test", "development"):
        try:
            mtn_provider.send_sms(phone_number, message)
        except MTNSMSError as exc:
            raise OTPDeliveryFailed(str(exc)) from exc
    else:
        logger.info(f"Sandbox/Test mode: OTP request for {phone_number} mocked. CODE: {otp_code}")

    # Generation succeeded. Now we can safely invalidate previous attempts.
    db.query(PhoneVerificationAttempt).filter(
        PhoneVerificationAttempt.phone_number == phone_number,
        PhoneVerificationAttempt.verified == False
    ).update({"expires_at": now})

    # 4. Hash and store securely
    expires_at = now + timedelta(minutes=5)
    
    attempt = PhoneVerificationAttempt(
        phone_number=phone_number,
        otp_hash=get_password_hash(otp_code),
        provider="mtn",
        provider_managed=False,
        expires_at=expires_at,
        attempts=0,
        verified=False
    )
    db.add(attempt)
    db.commit()


def verify_otp(db: Session, phone_number: str, otp_code: str) -> bool:
    """Verify an OTP securely."""
    now = datetime.now(timezone.utc)
    
    # We lock the row for update to prevent concurrent attempt increments
    attempt = db.query(PhoneVerificationAttempt).filter(
        PhoneVerificationAttempt.phone_number == phone_number,
        PhoneVerificationAttempt.verified == False,
        PhoneVerificationAttempt.expires_at > now
    ).order_by(PhoneVerificationAttempt.created_at.desc()).with_for_update().first()

    if not attempt:
        return False
        
    if attempt.attempts >= 3:
        # Too many incorrect guesses, invalidate locally
        attempt.expires_at = now
        db.commit()
        return False
        
    attempt.attempts += 1
    db.commit()
    
    # Test mode override
    if settings.ENVIRONMENT == "test" and otp_code == "123456":
        attempt.verified = True
        db.commit()
        return True
    
    # Verify hash
    if not attempt.otp_hash or not verify_password(otp_code, attempt.otp_hash):
        return False

    # Single use: mark as verified locally
    attempt.verified = True
    db.commit()
    return True



