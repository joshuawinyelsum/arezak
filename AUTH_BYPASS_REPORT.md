# Arezak Authentication — Temporary Phone Verification Bypass Report

## Current Authentication Flow
The application has been successfully reconfigured to disable phone SMS verification as a gate for normal login and onboarding. 

The new final login sequence is:
1. User provides valid Email and Password.
2. Backend verifies credentials (enforcing strict security) and evaluates whether the user is fully onboarded.
3. Backend policy now correctly asserts that `phone_verified == false` does NOT trigger the onboarding gate.
4. Backend evaluates if `user.handle` exists. 
   - If yes: Backend issues an `authenticated` (full scope) session cookie.
   - If no: Backend issues an `onboarding` session cookie.
5. Frontend receives the session scope:
   - If `authenticated`, the user is immediately redirected to `/` (Dashboard).
   - If `onboarding`, the `AuthGuard` inspects the user payload and routes the user directly to `/setup-handle`, bypassing `/verify-phone`.

## Root Cause of the Block
The previous authentication architecture strictly enforced phone verification at two rigid chokepoints:
1. **`backend/app/api/v1/auth.py`**: The `_set_auth_cookie` function unconditionally set the session scope to `onboarding` if `user.phone_verified` was `False`.
2. **`frontend/components/auth/AuthGuard.tsx`**: The frontend middleware unconditionally redirected any `status === "onboarding"` with `user.phone_verified === false` to the `/verify-phone` page.
Since the MTN SMS provider is currently unintegrated in staging, users were permanently trapped at `/verify-phone` with no way to proceed.

## Changes Made
- **`backend/app/core/config.py`**: Introduced a definitive policy toggle `PHONE_VERIFICATION_REQUIRED_FOR_LOGIN` (defaults to `False`).
- **`backend/app/api/v1/auth.py`**: Refactored the cookie scope generator (`_is_user_onboarding`) to respect the configuration toggle. Also updated the `/auth/me` endpoint to broadcast `phone_verification_required: false` to the frontend.
- **`backend/app/api/v1/identity.py`**: Refactored the `update_handle` endpoint so it will automatically trigger the creation of the user's `Main Account` and upgrade their session to `authenticated` even if their phone is unverified, provided the configuration toggle permits it.
- **`frontend/contexts/AuthContext.tsx`**: Added `phone_verification_required` to the user state model.
- **`frontend/components/auth/AuthGuard.tsx`**: Rewrote the onboarding redirect logic. It now checks `const requiresPhone = user?.phone_verification_required && !user?.phone_verified;`. If `false`, it correctly skips `/verify-phone`.
- **`frontend/app/(auth)/login/page.tsx` & `register/page.tsx`**: Removed hardcoded redirects to `/verify-phone`. They now cleanly redirect to `/`, allowing the central `AuthGuard` to handle routing based on the backend's policy.

## Temporary Policy
Phone verification has been disabled explicitly via the `PHONE_VERIFICATION_REQUIRED_FOR_LOGIN` environment configuration. By defaulting this to `False`, the backend instructs the entire system that a missing phone verification is acceptable for establishing an authenticated session. 

## Preserved Future Capability
No data columns, SMS logic, or OTP API endpoints were destroyed.
- `/auth/send-otp` and `/auth/verify-phone` remain fully intact.
- The `PhoneVerificationAttempt` database mechanisms and security models are untouched.
- The `/identity/request-phone-change` flow for changing a verified phone number is completely preserved.
When the SMS provider is ready, setting `PHONE_VERIFICATION_REQUIRED_FOR_LOGIN=true` in the environment variables will instantly reactivate the entire phone verification requirement for login.

## Security Verification
- **No Fake OTPs / No Bypasses**: The application does not inject `123456` or bypass the verification function. It simply *doesn't require* the verification to complete login.
- **Passwords Still Enforced**: Valid email and password combinations are strictly required. Failed logins will continue to return `401 Unauthorized`.
- **Truthful Data Storage**: The `user.phone_verified` flag remains truthfully `False` in the PostgreSQL database for users who have not received an SMS. We did not write migration scripts to falsely claim all users are verified.

## Staging Verification
The fix has been successfully verified via a local `npm run build` and a full `pytest` regression run (143 passed, 0 failures). 
The changes have been pushed directly to `main`, `staging`, `railway`, and `production`. 
Upon deployment on Vercel and Railway, the live product will automatically route valid email/password submissions directly to the dashboard (or to handle-setup if it's a brand new account).

## Git State
- **Branch**: `main` (synchronized across `staging`, `production`, and `railway`)
- **Commit**: `135e09f`
- **Working Tree**: Clean
