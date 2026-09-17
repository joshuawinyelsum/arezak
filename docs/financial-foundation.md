# Arezak Financial Foundation (Phase 2A)

This document outlines the strict technical foundation built for the Arezak constraint-based money management system.

## 1. Financial Domain Model

Arezak's core financial model strictly distinguishes between **Transactions** (the logical operation/intent) and **Ledger Entries** (the actual, immutable accounting effects).

### Money Representation (Invariant 1)
All financial amounts are strictly stored as `Integer` representing the smallest unit of the given currency. For Ghana Cedis (GHS), this is the `pesewa` (1/100th of a Cedi).
- GH₵ 10.50 is stored as `1050`.
- Floating-point representations (`float`, `double`, `NUMERIC` for currency) are NEVER used to prevent rounding errors.
- The `currency` field is explicitly tracked (e.g., `GHS`).

### Account Model
The `Account` serves as the top-level container of a user's funds. It caches authoritative balance projections for rapid access, preventing the need to sum the ledger for every request.
- Tied securely to a single `user_id`.
- By invariant: `total_balance = available_balance + reserved_balance + locked_balance`.

### Transaction Model
The `Transaction` model tracks the logical operation requested by the client (e.g. `INCOME`, `EXPENSE`).
- It has a `status` (e.g., `COMPLETED`).
- Contains the unique `reference` (idempotency key) for the operation.

### Ledger Model (Invariant 2, 6)
The `LedgerEntry` model forms the immutable audit trail of how balances actually changed.
- Tied to a `transaction_id`.
- Records explicitly whether it was a `CREDIT` or `DEBIT`.
- Once committed, these entries are strictly immutable. No standard application route allows `PUT` or `DELETE` on these entries. Corrections must be handled by compensating transactions.

## 2. Atomicity & Transaction Boundaries (Invariant 3, 8)
Financial operations execute inside strict database transaction boundaries.
The sequence is:
1. Begin DB Transaction.
2. Acquire locks (e.g., `SELECT ... FOR UPDATE` on the `Account`).
3. Validate invariants (e.g., sufficient funds).
4. Mutate the `Account` balance cache.
5. Insert `Transaction`.
6. Insert `LedgerEntry`(s).
7. Insert `AuditLog`.
8. Commit DB Transaction.

If any of these steps fail, the entire operation is rolled back safely, ensuring no partial financial state is ever recorded.

## 3. Concurrency Strategy (Invariant 7)
We utilize row-level locking via SQLAlchemy's `.with_for_update()` mechanism. When two operations attempt to mutate the same account simultaneously, the database enforces sequential processing by locking the account row during the transaction boundary. This safely prevents overdrafts and race conditions without requiring distributed locking like Redis.

## 4. Idempotency Strategy (Invariant 4)
The API accepts an `idempotency_key` via request headers. The key is persisted in the `reference` column of the `Transaction` table with a unique constraint. If a client retries a request (due to a timeout or network failure) using the same key, the system simply returns the originally processed `Transaction` rather than processing duplicate financial ledger entries.

## 5. Ownership & Data Isolation (Invariant 5)
Every financial table (`Account`, `Transaction`, `LedgerEntry`) strictly maps back to an owning `user_id` or `account_id` that rolls up to a `user_id`. Route handlers and Service layers automatically append the `current_user.id` filter to all read and write queries. Cross-tenant access is categorically rejected.

## 6. Audit Log
A separate `audit_logs` table tracks system-level events (e.g., "TRANSACTION_CREATED") with details of the actor, entity, and event type. This complements the ledger by tracking *who* did *what* (while the ledger tracks *what happened to the money*).

## 7. Migration Process
Alembic is used to deterministically apply these schema boundaries to the PostgreSQL database. The migration guarantees that tables, constraints, and relationships are generated safely and enforce the data models defined in code.

