# API Contracts

All APIs are versioned under `/api/v1/`.

## Authentication

We use HTTP-only secure cookies for session management to minimize token exposure in the browser.

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login` (Sets HTTP-only cookie)
- `POST /api/v1/auth/logout` (Clears cookie)
- `GET /api/v1/auth/me` (Returns current user profile)

## Standard Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description."
  }
}
```

Common Error Codes:
- `INSUFFICIENT_AVAILABLE_FUNDS`
- `LOCKED_FUNDS`
- `GOAL_NOT_COMPLETED`
- `INVALID_ALLOCATION`
- `INVALID_AMOUNT`
- `CATEGORY_DISABLED`
- `TRANSFER_NOT_ALLOWED`
- `UNAUTHORIZED`
- `VALIDATION_ERROR`

## Financial Endpoints (Idempotent)

Critical write operations require an `Idempotency-Key` header.

### 1. Add Income (with Allocation)
`POST /api/v1/transactions/income`
```json
{
  "amount": 100000, // 1000.00 GHS in pesewas
  "source": "Salary",
  "description": "June Salary",
  "date": "2025-06-16T10:00:00Z"
}
```
*Backend runs rule engine, determines allocations, creates transactions, updates balances, and returns the resulting state.*

### 2. Record Expense
`POST /api/v1/transactions/expense`
```json
{
  "amount": 5000, // 50.00 GHS
  "category_id": "uuid",
  "description": "Groceries",
  "date": "2025-06-16T12:00:00Z"
}
```
*Backend evaluates rules (sufficient available funds, category unlocked). Rejects with `LOCKED_FUNDS` if necessary.*

### 3. Transfer Money
`POST /api/v1/transactions/transfer`
```json
{
  "amount": 2000,
  "from_category_id": "uuid1",
  "to_category_id": "uuid2"
}
```

### 4. Goal Contribution
`POST /api/v1/goals/{goal_id}/contribute`
```json
{
  "amount": 10000
}
```

### 5. Goal Override
`POST /api/v1/goals/{goal_id}/override`
```json
{
  "amount": 5000,
  "reason": "Emergency repair"
}
```

### 6. Debt Payment
`POST /api/v1/debts/{debt_id}/pay`
```json
{
  "amount": 2500
}
```

## Data Retrieval Endpoints

- `GET /api/v1/dashboard` (Aggregated summary of balances, active goals, recent activity)
- `GET /api/v1/transactions?limit=20&offset=0&type=EXPENSE`
- `GET /api/v1/goals`
- `GET /api/v1/categories`
- `GET /api/v1/allocation-rules`
- `GET /api/v1/debts`
- `GET /api/v1/obligations`

