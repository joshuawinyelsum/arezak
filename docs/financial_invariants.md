# Financial Invariants and Source of Truth

Arezak's core philosophy depends on an accurate, deterministic, and immutable financial state.

## 1. Core Balance Invariant

The total financial state of a user (or specific account) must always satisfy this equation:

```
Total Balance = Available Balance + Reserved Balance + Locked Balance
```

These pools are logically derived from the immutable `Transaction` ledger and related state entities (like Goals and Obligations). The system does not rely on static `balance` columns that are independently updated. Instead, balances are derived (or cached deterministically) based on the sum of transactions.

To avoid expensive recalculations on every read while maintaining integrity, the system will use a materialization/caching strategy (e.g., balance tables updated strictly within the same DB transaction as the ledger entry) or rely on indexed aggregations depending on performance testing. For the initial implementation, we will maintain current balance state within specific summary tables (e.g., `AccountBalance`, `CategoryBalance`, `GoalBalance`) but *only* update them alongside a `Transaction` insert within a single `SERIALIZABLE` or properly locked database transaction.

### Definitions
- **Available Balance**: Money currently permitted to be spent under active rules.
- **Reserved Balance**: Money intentionally assigned to a purpose (like an Obligation) but not strictly locked from emergency use (depending on strictness settings).
- **Locked Balance**: Money completely inaccessible for normal spending (e.g., locked in a Goal).

## 2. Transaction Integrity Invariant

- Every financial movement creates a `Transaction` record.
- No money can be created or destroyed.
  - Income increases Total.
  - Expense decreases Total (and Available/Reserved).
  - Transfers, Allocations, and Goal Contributions move money between internal pools but do NOT change the Total.
  - E.g., for a Goal Contribution: `Available` decreases by X, `Locked` increases by X. `Total` remains the same.

## 3. Constraint Invariants

- **No Negative Balances**: An operation that would result in `Available Balance < 0` must be rejected.
- **Lock Enforcement**: A normal expense operation cannot draw from `Locked Balance`.
- **Rounding Determinism**: When calculating percentage allocations, the sum of allocated minor units (pesewas) must exactly equal the total income amount. Remainder distributions must be deterministic (e.g., largest remainder method or add to highest priority).

## 4. Concurrency Protection

- Financial state mutations (e.g., spending, contributing) require row-level locking (`SELECT ... FOR UPDATE` in PostgreSQL) on the relevant balance/state rows to prevent race conditions (e.g., double-spending the same available funds).
- Idempotency keys must be used for critical write endpoints to prevent duplicate processing of the same user intent (e.g., double form submission).

## 5. Historical Integrity

- A transaction record, once committed, is immutable.
- Changes to rules (e.g., Allocation percentages) only affect future income, not historical transactions.
- Errors must be corrected via compensating `ADJUSTMENT` transactions, not by deleting or modifying past transactions.

