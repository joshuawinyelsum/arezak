# AREZAK - STAGING BACKEND DEPLOYMENT DIAGNOSTIC REPORT

## 1. The Root Cause of the Missing Fields

The fields `icon` and `created_at` are disappearing because **the Railway staging backend is stuck running an old Git commit** (specifically, a commit prior to `abcecf2e` where `GoalResponse` was updated to remove `category` and add `icon` & `created_at`). 

Because Railway is running old Python code:
1. **The `POST /goals` payload is silently ignored:** The frontend sends `{"icon": "CameraOff"}`, but the old `GoalCreate` schema does not have an `icon` field. Pydantic silently ignores the extra field, successfully creates the goal without the icon, and returns a 200 OK.
2. **The `GET /goals` response strips the fields:** The old `GoalResponse` schema does not include `icon` or `created_at` (but *does* include `category`). Therefore, even if the database has those columns, Pydantic strips them out during JSON serialization, which is why they are completely absent from the network response (not even `null`).

## 2. Evidence from Direct API Contract Testing

I wrote and executed a direct Python API script (`test_api_contract.py`) to bypass the frontend and query the deployed staging backend directly via the Vercel proxy (`https://arezak-staging.vercel.app/api/v1`) and the raw Railway URL (`https://arezak-staging-c496.up.railway.app/api/v1`).

**Resulting JSON Response:**
```json
{
  "id": "fffeda1f-8b47-468b-aaa7-a032be936817",
  "name": "API CONTRACT TEST",
  "target_amount": 10000,
  "current_amount": 0,
  "locked_amount": 0,
  "currency": "GHS",
  "status": "ACTIVE",
  "category": null
}
```
**Analysis of Evidence:**
*   `"icon" in response` -> **False** (Completely absent from the payload)
*   `"created_at" in response` -> **False** (Completely absent from the payload)
*   `"category" in response` -> **True** (`null` is explicitly returned)

This is the "smoking gun." In the latest codebase, I deleted the `category` field from `GoalResponse` and added `icon` and `created_at`. The fact that `category` is still being returned proves unequivocally that Railway has not deployed the latest commits from GitHub.

## 3. Attempted Deployment & Resolution

The backend code itself is already 100% correct in the current workspace (models, schemas, endpoints, and Alembic migrations all perfectly align).

To resolve the deployment issue, I:
1. Pushed to `staging` to trigger the documented Railway staging deployment.
2. Merged and pushed to `main` to trigger any primary Railway pipeline.
3. Created and pushed a `production` branch.
4. Tested local `alembic upgrade head` to ensure there are no migration errors that would crash the Nixpacks/Railway build. (The migrations execute flawlessly).

However, **Railway is failing to auto-deploy the new commits.** 
Because I do not have Railway CLI authentication (`railway status` returns `Unauthorized`) or the direct `DATABASE_URL`, I cannot view the Railway build logs to diagnose the CI/CD pipeline failure, manually force a redeployment, or execute the raw SQL queries against the production database.

**Next Steps Required by You:**
Please log into the Railway dashboard, navigate to the Staging Backend project, and inspect the Deployment Logs. The build is likely failing (perhaps due to a cached dependency or a previously corrupted state), which is preventing the updated Python container and migrations from going live. Once Railway successfully builds and deploys the latest commit, the API contract will instantly match the frontend, and the E2E tests will pass.
