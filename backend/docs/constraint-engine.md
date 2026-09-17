# Constraint Engine Architecture

## Purpose
Arezak is a constraint-based money management system. The Constraint Engine is the definitive backend authority governing all financial mutations. It enforces strict rules separating operational intent from immutable financial state, ensuring that the frontend is never trusted with restriction logic.

## Architecture Pipeline

```text
HTTP Request
    ↓
API
    ↓
Transaction Service
    ↓
Constraint Engine
    ↓
Constraint Pipeline (Deterministic short-circuit evaluation)
    ↓
Decision (ConstraintDecision)
    ↓
Allowed? ── NO → No financial mutation (Rollback)
    │
    YES
    ↓
Ledger/financial mutation
    ↓
Commit
```

## Core Components

### 1. `EvaluationContext`
Encapsulates all necessary state for evaluating an operation. It carries the database session, user ID, account ID, requested amount, operation type, and dynamically loaded models (like the fully locked account record).

### 2. `ConstraintDecision`
A structured domain response containing:
- `allowed` (boolean)
- `code` (stable machine-readable DecisionCode)
- `message` (human-readable reason)

### 3. Decision Codes
Stable machine-readable identifiers mapped to HTTP 400 responses:
- `ALLOWED`
- `INVALID_AMOUNT`
- `ACCOUNT_NOT_FOUND`
- `INSUFFICIENT_AVAILABLE_FUNDS`
- `FUNDS_LOCKED`

### 4. Constraint Evaluation Order (Deterministic)
The engine evaluates constraints sequentially using a first-failure short-circuit mechanism:
1. **ValidAmountConstraint**: Ensures requested amount > 0.
2. **AccountAccessConstraint**: Verifies the account exists, belongs to the user, and acquires a `SELECT FOR UPDATE` row lock.
3. **BalanceConstraint**: Evaluates the strict invariants protecting locked funds and preventing negative available balances.

## Balance Semantics
Arezak distinguishes between total balance and available balance:
`available_balance = total_balance - locked_balance - reserved_balance`

- It is completely valid for `total_balance == available_balance` if no funds are locked.
- If a user requests a spend exceeding `available_balance` but within `total_balance`, the system explicitly rejects it with `FUNDS_LOCKED`.
- `available_balance` can never become negative.

## Concurrency & Idempotency Strategy
- **Concurrency**: Financial boundaries utilize `SELECT ... FOR UPDATE` directly in the `AccountAccessConstraint` prior to loading balance logic. This guarantees that concurrent evaluation pipelines wait on the row lock and see the authoritative committed state sequentially.
- **Idempotency**: The `TransactionService` validates idempotency keys *before* engaging the engine, returning the previous successful transaction if retried to avoid duplicate evaluation.

## Rejected-Operation Behavior
When a constraint fails, it throws a `ConstraintViolationException` inside the domain layer. The API catches this and aborts the database transaction. There is absolutely no financial or ledger mutation for a rejected operation.

## Adding Future Constraints
To add new constraints (like Goal target locks, time locks, or obligations), implement the `BaseConstraint` interface and register it in the `engine.pipeline` at the appropriate deterministic stage.

