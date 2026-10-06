# Arezak Repair State

## Objective
Repair auth/session and data reliability, then verify the premium mobile-first UI without disturbing pre-existing worktree edits.

## Known failures and root causes
- `/auth/me` bound the JWT subject string to a SQLAlchemy UUID column; reproductions failed with `AttributeError: 'str' object has no attribute 'hex'`. UUID parsing is fixed and regression-tested.
- Handle and phone verification were incorrectly part of the authenticated state. API access and client routing now require only a valid session; OTP route is dormant.
- The storage SDK was imported eagerly; missing `boto3` caused photo requests to 500 before storage configuration could be handled. Missing support now returns 503.
- No remaining backend 500 reproduced in the current suite. Exact exception from an older deployed handle failure is unavailable because prior code masked it.

## Fixes already applied
- Nullable identity responses, UUID conversion, phone-independent sessions, optional registration identity, handle setup response, storage failure mapping, WebP alignment, explicit retry/error UI, semantic theme tokens, ledger rows, primary navigation, reduced-motion support, and local-font fallback.

## Verification
- Backend: 149 passed, 4 skipped.
- Frontend: production build, `tsc --noEmit`, lint passed (one existing `SocialAuth` hook warning).
- Browser/device/theme and deployed verification: not yet run.
- Prior user changes remain in `backend/app/main.py` and diagnostic scripts; do not overwrite them.

## Current iteration
- Goal: guarantee stalled API calls exit loading state and audit critical secondary data screens.
- Changes: shared API requests now abort after 20 seconds while preserving caller cancellation; receive and security views show explicit recoverable errors; goal detail clears stale errors, hides raw load failures, and supports retry; receive distinguishes zero receiving accounts.
- Verification: `tsc --noEmit` passed; `npm run lint` passed with the existing SocialAuth hook warning; production build passed (24 routes generated). Targeted pytest did not complete: test execution stalled at the first CORS TestClient request and was interrupted; no backend code changed in this iteration.
- Decision: keep the frontend changes; their targeted TS/lint/build checks pass. Browser verification remains outstanding.
- Next: complete end-to-end browser checks in a safe local setup if available; audit remaining screens and deployment constraints without modifying user diagnostics.
- Remaining blocker: no evidence yet from a complete browser flow or configured object storage/deployment.
