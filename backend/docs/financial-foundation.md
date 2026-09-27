# Arezak Financial Foundation — Engineering Contract

**Version:** 1.0  
**Phase:** Core Financial Engine — Block 1  
**Status:** Active

This document is the authoritative contract for Arezak's financial model.
Every contributor working on money-touching code must understand and preserve
these invariants. When doubt arises, the invariants here take precedence over
implementation convenience.

---

## The Core Model

```
TOTAL BALANCE = AVAILABLE + PROTECTED

PROTECTED = locked_balance + reserved_balance
```

- **Available** — money the user can use for external operations right now.
- **Protected** — money intentionally set aside inside Arezak (e.g. in Goals).
- **Total** — the user's complete financial position. Never changes from
  internal reallocation.

---

## Financial Invariants

### F-1 · Money is always integer pesewas

All financial amounts at the persistence and domain boundary are stored as
`INTEGER` pesewas. Never floats.

```
GH₵1.50 → 150 pesewas
GH₵100  → 10,000 pesewas
```

**Enforced by:**
- SQLAlchemy column type: `Integer`
- DB check constraint: `amount > 0` on `transactions` and `ledger_entries`
- Application validation via `ValidAmountConstraint`

### F-2 · Currency is always GHS

Arezak currently operates only in Ghanaian cedis. No FX is supported.

**Enforced by:**
- DB check constraint: `currency = 'GHS'` on `accounts`, `transactions`,
  `ledger_entries`, `goals`, and `goal_contributions`
- `correct_transaction()` rejects `new_currency != original.currency`

### F-3 · Transaction amounts must be strictly positive

A transaction with `amount <= 0` is financially meaningless and is always
rejected before database write.

**Enforced by:**
- `ValidAmountConstraint` in the constraint engine pipeline
- DB check constraint: `amount > 0` on `transactions`
- Explicit guard in `withdraw_from_goal()`: `amount_pesewas <= 0` → ValueError

### F-4 · Ledger entry amounts must be strictly positive

Ledger entries always record the magnitude; direction is encoded by
`entry_type` (CREDIT/DEBIT), not by sign.

**Enforced by:**
- DB check constraint: `amount > 0` on `ledger_entries`

### F-5 · Ledger entries are CREDIT or DEBIT

No other `entry_type` values are valid.

**Enforced by:**
- DB check constraint: `entry_type IN ('CREDIT', 'DEBIT')` on `ledger_entries`

### F-6 · Every financial operation produces balanced ledger entries

For any transaction, the sum of all CREDIT entries must equal the sum of all
DEBIT entries:

```
Σ CREDIT amounts == Σ DEBIT amounts (per transaction)
```

The `balance_type` column records which pool of money each entry affects:

| balance_type | Meaning                                    |
|--------------|--------------------------------------------|
| AVAILABLE    | The user's spendable balance               |
| LOCKED       | Money locked into a Goal                   |
| RESERVED     | Reserved by Rules (future)                 |
| EXTERNAL     | The counterparty outside Arezak            |

Examples:

**Income (Fund):**
```
CREDIT  AVAILABLE  +50,000  ← user's available goes up
DEBIT   EXTERNAL   +50,000  ← from external source
```

**Expense/Send/Pay:**
```
DEBIT   AVAILABLE  +12,000  ← user's available goes down
CREDIT  EXTERNAL   +12,000  ← to external destination
```

**Goal Contribution (Add to Goal):**
```
DEBIT   AVAILABLE  +10,000  ← leaves available pool
CREDIT  LOCKED     +10,000  ← enters locked pool
```

**Goal Withdrawal (Withdraw from Goal):**
```
DEBIT   LOCKED     +10,000  ← leaves locked pool
CREDIT  AVAILABLE  +10,000  ← returns to available pool
```

**Enforced by:**
- Application service code (both entries always created atomically)
- Test suite: `test_financial_foundation_v2.py::TestBalancedLedger`

> ⚠️ **Note:** The current enforcement is at the application layer.
> A future enhancement should add a PostgreSQL trigger or deferred constraint
> that verifies ledger balance before each transaction commits.

### F-7 · Available + Protected = Total (always)

Internal reallocation never creates or destroys money.

```
Before:  Available=100,000   Protected=0   Total=100,000
Contribute 30k:
After:   Available= 70,000   Protected=30,000  Total=100,000  ✓
```

**Enforced by:**
- Goal contribution: `account.available_balance -= x; account.locked_balance += x`
- Goal withdrawal: `account.locked_balance -= x; account.available_balance += x`
- DB check constraints: all three balance columns `>= 0`

### F-8 · Goal contribution does not change Total

Adding money to a Goal is internal reallocation. Total is unchanged.

**Enforced by:** Service code + test `TestBalanceInvariants::test_goal_contribution_preserves_total`

### F-9 · Goal withdrawal does not change Total

Withdrawing from a Goal is internal reallocation. Total is unchanged.

**Enforced by:** Service code + test `TestBalanceInvariants::test_goal_withdrawal_preserves_total`

### F-10 · Goal balance is not double-counted in Total

`goal.current_amount` reflects money that is already part of
`account.locked_balance`. It is not additional money.

```
account.locked_balance == Σ goal.current_amount  (for all goals on that account)
```

**Enforced by:** Contribution/withdrawal service code; test
`TestBalanceInvariants::test_goal_not_double_counted_in_total`

### F-11 · Available balance never goes negative

DB-level `CHECK (available_balance >= 0)` makes this a hard database guarantee.
The application `BalanceConstraint` provides a structured error before the DB
ever needs to enforce it.

**Enforced by:**
- `BalanceConstraint` → `INSUFFICIENT_AVAILABLE_FUNDS` / `FUNDS_LOCKED`
- DB check constraint: `available_balance >= 0`

### F-12 · Locked funds cannot be spent

Money in Goals (locked) is not spendable. Only `available_balance` can be
debited for external operations.

**Enforced by:** `BalanceConstraint` compares only against `available_balance`

### F-13 · Financial history is append-only

Once a ledger entry is created, it is never updated or deleted via normal
service operations. The application exposes no `DELETE /ledger` endpoint.

Corrections are implemented by creating new transactions (reversal +
replacement), preserving the original record intact.

**Enforced by:**
- No `UPDATE`/`DELETE` paths exist in `transaction_service.py` for financial
  records (only metadata fields like `description`, `note`, `funding_source`
  may be edited on INCOME/EXPENSE transactions — these are not financial facts)
- `correct_transaction()` creates a `CORRECTION_REVERSAL` + replacement,
  never modifies the original

### F-14 · Users cannot access other users' financial data

The constraint pipeline loads accounts only when
`Account.id == context.account_id AND Account.user_id == context.user_id`.
Cross-user access always returns `ACCOUNT_NOT_FOUND`.

**Enforced by:**
- `AccountAccessConstraint` (uses row-level lock via `with_for_update()`)
- `GoalAccessConstraint` (verifies `goal.user_id == user_id`)
- Direct service guards in `withdraw_from_goal()`
- All API endpoints use `CurrentUser` dependency injection

### F-15 · Transaction identity is unique

The `reference` column on `Transaction` has a `UNIQUE` index. Duplicate
idempotency keys return the original transaction, never create a new one.

**Enforced by:**
- DB unique index on `transactions.reference`
- Double-checked locking pattern: idempotency key is checked before acquiring
  the row lock and again after, preventing race conditions

### F-16 · Transaction status model

| Status      | Meaning                                              |
|-------------|------------------------------------------------------|
| `COMPLETED` | Transaction processed and accounted. Money has moved.|

Currently all transactions are `COMPLETED` on creation. Future provider-specific
statuses (`PENDING`, `FAILED`) belong in Block 3 (Money Movement Hub) and must
not be added speculatively.

---

## What Is NOT Implemented Yet (Block 2+)

- External payment rails (MTN, Telecel, AirtelTigo, bank)
- Rules Engine (automatic allocation on income)
- Fee calculation
- Multi-currency
- Provider transaction references / reconciliation
- Webhook delivery

These must not be faked in the current codebase.

---

## Schema Ownership

| Table                | Financial Facts | Mutable Fields            |
|----------------------|-----------------|---------------------------|
| `accounts`           | balances        | `name`, `status`          |
| `transactions`       | `amount`, `type`, `currency` | `description`, `note`, `funding_source` (INCOME/EXPENSE only) |
| `ledger_entries`     | all fields      | —                         |
| `goals`              | `current_amount`, `locked_amount`, `currency` | `name`, `icon`, `description`, `status` |
| `goal_contributions` | all fields      | —                         |

---

## Constraint Enforcement Summary

| Invariant                        | Application | Database     |
|----------------------------------|-------------|--------------|
| Amount > 0                       | ✅ Engine   | ✅ CHECK     |
| Currency = GHS                   | ✅ Service  | ✅ CHECK     |
| Available balance ≥ 0            | ✅ Engine   | ✅ CHECK     |
| Reserved balance ≥ 0             | ✅ Service  | ✅ CHECK     |
| Locked balance ≥ 0               | ✅ Service  | ✅ CHECK     |
| Ledger entry_type valid          | ✅ Service  | ✅ CHECK     |
| Ledger balance_type valid        | ✅ Service  | ✅ CHECK     |
| Balanced ledger per transaction  | ✅ Service  | ❌ (future trigger) |
| Unique idempotency key           | ✅ Service  | ✅ UNIQUE    |
| Cross-user isolation             | ✅ Engine   | ❌ (no RLS)  |
| Goal not double-counted          | ✅ Service  | ❌ (invariant test) |

---

## Remaining Risks (Block 2)

1. **Ledger balance verification is application-only.** There is no DB trigger
   or deferred constraint verifying `Σ CREDIT == Σ DEBIT` per transaction.
   A bug in service code could write unbalanced entries without the DB catching
   it. Block 2 should add a PostgreSQL trigger.

2. **No row-level security (RLS).** Cross-user isolation is enforced by
   application code. If a raw SQL path is ever introduced (e.g. a migration
   script or admin tool), it bypasses these guards. Block 2 should consider
   PostgreSQL RLS policies.

3. **`goal.locked_amount` vs `account.locked_balance` drift.** Both are updated
   in the same transaction but there is no DB-level constraint ensuring their
   aggregate equality. An interrupted transaction could theoretically leave them
   out of sync. The existing use of `db.flush()` + `db.commit()` atomicity
   mitigates this, but a scheduled reconciliation job would add a safety net.

4. **`Transaction.status` is always `COMPLETED`.** When provider integrations
   arrive (Block 3), there will be a need for `PENDING` transactions that
   eventually settle. The status model should be explicitly designed at that
   point, not retrofitted.
