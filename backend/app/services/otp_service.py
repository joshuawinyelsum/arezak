"""Secure OTP delivery abstraction and logic."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.phone_verification import PhoneVerificationAttempt
from app.core.security import get_password_hash, verify_password

logger = logging.getLogger(__name__)

class OTPRateLimitExceeded(Exception):
    pass

class OTPDeliveryFailed(Exception):
    pass

def generate_and_send_otp(db: Session, phone_number: str) -> None:
    """Generate, securely hash, and send an OTP."""
    # 1. Enforce rate limits / invalidation
    recent_attempts = db.query(PhoneVerificationAttempt).filter(
        PhoneVerificationAttempt.phone_number == phone_number,
        PhoneVerificationAttempt.created_at >= datetime.now(timezone.utc) - timedelta(hours=1)
    ).count()
    
    if recent_attempts >= 5:
        raise OTPRateLimitExceeded("Too many OTP requests. Try again later.")
        
    # Invalidate previous unverified attempts by expiring them immediately
    db.query(PhoneVerificationAttempt).filter(
        PhoneVerificationAttempt.phone_number == phone_number,
        PhoneVerificationAttempt.verified == False
    ).update({"expires_at": datetime.now(timezone.utc)})

    import secrets
    otp_code = "".join(str(secrets.randbelow(10)) for _ in range(6))
    
    # Short expiration (e.g., 5 minutes)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    attempt = PhoneVerificationAttempt(
        phone_number=phone_number,
        otp_hash=get_password_hash(otp_code),
        expires_at=expires_at,
        attempts=0,
        verified=False
    )
    db.add(attempt)
    db.flush()
    
    # 2. Secure Delivery Abstraction
    # If SMS infrastructure is not configured, we do not print the OTP!
    # We log the action without the plaintext code.
    logger.info(f"OTP delivery abstraction called for {phone_number}.")
    
    # TODO: Integrate real SMS provider (e.g., Twilio, Africa's Talking)
    # If in strict isolation (test), we might bypass real send.
    # We NEVER log `otp_code` to console!

def verify_otp(db: Session, phone_number: str, otp_code: str) -> bool:
    """Verify an OTP securely with strict attempt limits and single-use."""
    attempt = db.query(PhoneVerificationAttempt).filter(
        PhoneVerificationAttempt.phone_number == phone_number,
        PhoneVerificationAttempt.verified == False,
        PhoneVerificationAttempt.expires_at > datetime.now(timezone.utc)
    ).order_by(PhoneVerificationAttempt.created_at.desc()).first()

    if not attempt:
        return False
        
    if attempt.attempts >= 3:
        # Too many incorrect guesses, invalidate
        attempt.expires_at = datetime.now(timezone.utc)
        db.commit()
        return False
        
    attempt.attempts += 1
    db.commit()
    
    if not verify_password(otp_code, attempt.otp_hash):
        return False
        
    # Single use: mark as verified
    attempt.verified = True
    db.commit()
    return True
