# Provider Integration and Rail Resolution (Block 4)

## Architecture and ownership

The financial operations service remains responsible for logical transaction
idempotency and delegates authorization decisions to the existing Rules Engine.
The lifecycle service remains the only place that reserves funds, posts ledger
entries, and changes Arezak transaction status. The Money Movement Hub owns
external dispatch, provider evidence, webhook intake, status inquiry, and
reconciliation. Adapters translate between Arezak contracts and one provider's
protocol. No rules are duplicated in the provider layer.

```text
Financial Operations → existing Rules Engine decision
                   → lifecycle and reservation
                   → Money Movement Hub
                   → RailResolver → ProviderRouter → Provider adapter
```

## Rail model and resolver

`MoneyRail` is independent of provider identity. Current values include
`MTN_MOMO`, `TELECEL_CASH`, `AIRTELTIGO_MONEY`, `BANK_TRANSFER`,
`INTERNAL_AREZAK`, `SANDBOX`, and `UNKNOWN`. A new external transaction stores
its selected rail on `transactions.rail`; the same rail is part of the
idempotency parameter comparison.

`RailResolver` requires an explicit rail and returns a normalized destination.
Ghana phone numbers accept local `0...`, `233...`, and `+233...` forms and are
sent as `+233...`. It deliberately does not infer a carrier from prefixes:
number portability means a prefix cannot establish the current network. The
selected rail is a user/client routing choice and must be supported by the
selected provider. Bank destinations are not parsed as phone numbers. Unknown
and unsupported rails fail explicitly.

## Provider registry and routing

`ProviderRegistration` is non-secret runtime configuration. It declares provider
code, rails, operations, capabilities, environment, enabled state, timeout, and
retry limits. `ProviderRouter` validates the adapter against this declaration,
selects only providers compatible with the exact operation and rail, supports a
preferred provider, and refuses disabled providers. When no exact provider is
available it raises a routing error; it never changes rails or retries through
another provider after a dispatch.

The existing `ProviderRecord` database model is administrative metadata and is
not the live credential or adapter registry. Secrets must not be put in this
table. Runtime registration stays in application configuration until there is
a secured operational provider-management design.

## Adapter interface and state mapping

Adapters implement `ProviderInterface`: `initiate`, `status_query`, and
`verify_webhook`. The generic `initiate` request contains an Arezak operation
code; provider response shapes are mapped to `ProviderResult` and
`ProviderStatusResult` inside the adapter. Capabilities such as FUND, SEND, PAY,
WITHDRAW, STATUS_QUERY, and WEBHOOKS must be declared. Missing capabilities
cause a deterministic routing or capability error.

Providers that support lookup using Arezak's stable idempotency key may also
declare `STATUS_QUERY_BY_IDEMPOTENCY_KEY`. This allows recovery when initiation
timed out before Arezak received the provider reference. The returned stable
reference is persisted on the original attempt; no new attempt is created.

Canonical initiation/status states map as follows: SUCCEEDED means the provider
confirms completion; FAILED means the provider confirms failure; PENDING means
accepted but unresolved; IN_DOUBT means the request may have executed but no
verified final result is available. A production adapter must document its
provider-specific state mapping and include the requested amount, currency, and
stable provider reference in normalized final evidence.

## Sandbox and production modes

`MONEY_MOVEMENT_MODE=sandbox` is the sandbox setting for development and test
environments (the application default there; deployers can override it). The
HTTP operations API does not instantiate or inject a successful sandbox
adapter. It uses the configured router. Production defaults to
`MONEY_MOVEMENT_MODE=production` and has no implicit sandbox registration.
There is no live provider adapter, API access, or credential configured in this
repository. Production external routing therefore fails closed until an adapter
and its complete configuration are deliberately added. There is no silent
sandbox fallback.

The sandbox has no real network side effects and its fixed signing key is for
tests only. It must never be used to authenticate production callbacks.

## Authentication and secrets

Provider credentials belong in deployment secret configuration or a secret
manager and must never be committed, returned to the frontend, stored in plain
provider records, or logged. A future adapter must validate required settings
when initialized, set bounded connect/read timeouts, cache access tokens until
near expiry, and map authentication failure, token expiry, and provider
unavailability into safe internal errors. No provider-specific authentication
or endpoint has been invented here because no real integration access is
available.

## Webhook security and replay protection

`POST /api/v1/webhooks/{provider_code}` resolves only a registered adapter with
WEBHOOKS capability. The adapter verifies the signature over raw bytes and
normalizes provider identity, event ID, event time, reference, amount, currency,
and event type. The Hub checks identity, requires a unique event ID and
timezone-aware event time within a five-minute past / two-minute future window,
deduplicates `(provider_code, provider_event_id)`, and rejects reuse of an event
ID with different bytes. Provider references must correlate to an attempt;
final events must match the requested amount and currency. Unknown authenticated
references are retained as reconciliation evidence. Delayed events cannot
reverse a terminal transaction. All final effects go through lifecycle
transitions and the ledger; webhooks do not edit balances.

Adapters whose upstream does not supply an event timestamp must establish
equivalent freshness/replay protection during signature verification and
provide a verified timestamp in `VerifiedProviderEvent`.

## Retry policy

The default `max_retries` is zero. Safe status inquiries may be repeated because
they are read-only. Initiation must not be retried under a new key or sent to a
second provider while the first attempt is unresolved. A future adapter may
retry a transient transport failure only with the same persisted attempt key
and only when the provider guarantees idempotency for that key. A timeout is
IN_DOUBT, not a confirmed failure. Invalid credentials, invalid recipients,
malformed requests, unsupported operations, and provider-side insufficient
funds are non-retryable. No automatic initiation retry is enabled in this
block.

## Reconciliation and recovery

`reconcile_due_transactions` queries IN_DOUBT and PROCESSING movements older
than the configured age through the original provider attempt. Status responses
must match reference, amount, and GHS currency before a final lifecycle
transition. Confirmed success/failure resolves the transaction and records a
reconciliation record. Pending, unknown, unavailable, or conflicting evidence
is retained as a discrepancy and leaves the financial state unchanged. Ledger
history is append-only. The service is callable by an operator or scheduler;
this block does not add a scheduler.

Disabled providers are excluded from new routing. Existing attempt lookup by
provider code remains available for status inquiry and webhook verification, so
disablement does not erase recovery paths.

## Observability and privacy

Structured events carry Arezak transaction ID, attempt ID, provider code, rail,
operation, reference, latency, retry count, provider state, and failure code.
They do not contain idempotency values, full recipients, credentials, access
tokens, or provider response bodies. Provider evidence remains persisted in the
existing attempt/webhook records for audit; future adapters must redact secrets
and minimize personal data before returning normalized payloads.

## Adding a future provider

1. Implement an adapter in `app/providers/` without importing it into the Rules
   Engine, financial operations, account services, or ledger code.
2. Map provider operation and state formats to the shared request/result types.
3. Declare exact rails, operations, capabilities, deployment environment,
   timeout, and retry policy in a `ProviderRegistration`.
4. Add secret-backed credentials and provider-specific token/signature handling;
   startup must fail closed if required production settings are absent.
5. Register it only in the intended environment and test success, failure,
   pending, ambiguous timeout, duplicate/replayed/out-of-order webhooks, status
   inquiry, and reconciliation without live network access.
6. Test disabled routing and prove that an ambiguous attempt cannot route to a
   different provider.
7. Add a migration only if durable data requirements cannot be met by the
   existing provider, attempt, webhook, and reconciliation tables.

## Current limitations

No real MTN MoMo, Telecel, AirtelTigo, bank, or payment-provider adapter is
included. No production credentials are present. Provider registration is
application configuration rather than a user-facing or database-driven admin
API. Automatic dispatch retries and reconciliation scheduling remain disabled.
