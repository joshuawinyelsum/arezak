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

## Deployment follow-up (2026-10-07)
- GitHub `main` and Railway's production source branch `staging` were fast-forwarded to the repair commit. Railway production deployment `b267d5a` succeeded; startup completed Alembic migration execution and `/health/ready` returned 200.
- `https://arezak-staging.vercel.app/` returned 200. The public frontend bundle contains the committed 20-second API timeout; `/api/v1/auth/me` and `/api/v1/accounts` reached the backend and returned the expected unauthenticated 401.
- This repository has no Supabase project configuration or Supabase CLI. Runtime database is Railway Postgres; migrations run through `backend/start.sh`.
- Authenticated E2E, photo storage, light/dark visual review, and desktop/mobile browser checks remain unverified. Vercel CLI has no local credentials; public frontend behavior was checked without signing in.

## Current iteration
- Goal: guarantee stalled API calls exit loading state and audit critical secondary data screens.
- Changes: shared API requests now abort after 20 seconds while preserving caller cancellation; receive and security views show explicit recoverable errors; goal detail clears stale errors, hides raw load failures, and supports retry; receive distinguishes zero receiving accounts.
- Verification: `tsc --noEmit` passed; `npm run lint` passed with the existing SocialAuth hook warning; production build passed (24 routes generated). Targeted pytest did not complete: test execution stalled at the first CORS TestClient request and was interrupted; no backend code changed in this iteration. Playwright could not launch because its Chromium executable is not installed. The desktop browser tool could not reach the local preview (`ERR_CONNECTION_TIMED_OUT`).
- Decision: keep the frontend changes; their targeted TS/lint/build checks pass. Browser verification remains outstanding.
- Next: provide a reachable browser runtime and test-safe backend/database environment, then complete authentication, data, upload, theme and viewport flows; verify deployment only when credentials/access are available.
- Remaining blockers: no complete browser flow; no runtime verification of configured object storage; no deployment credentials/access. The checked-in Playwright auth spec contains obsolete OTP/onboarding expectations and must be updated before it can serve as regression coverage.
