# Arezak Identity and Recipient Discovery

## Scope and current authentication

Arezak's ecosystem is its identity and people-to-people discovery layer. The existing authentication system remains email and password with an HTTP-only session cookie. Phone-number login and phone ownership verification are not implemented. A database phone field is reserved for a future verified-number flow, and recipient lookup ignores every unverified number.

The existing UUID primary keys remain internal database identifiers. An account now has a separate customer-facing 12-digit Arezak Account Number, generated from cryptographic randomness and protected by a unique database index. It is created with the financial account, backfilled for existing accounts, and is not derived from a sequence or UUID. The unique index is the final collision guard; account creation retries a collision under a savepoint.

Email remains a private authentication/contact address and is not a recipient identifier. Names come from the existing user record. Handles are optional, normalized to lowercase, unique, and selected by the user. Phone numbers are stored in Ghana E.164 form only when a future verification flow is present; no public phone number is returned unless `phone_verified` is true.

## Identity and recipient resolution

`GET /api/v1/identity/me` returns the authenticated user's display name, handle, email, verification state, and receiving account details. Each account includes its customer-facing account number and opaque QR payload. Internal account IDs are included only in this authenticated self-view for compatibility with account operations; they are never returned by recipient lookup.

`POST /api/v1/identity/resolve` accepts one of:

- a 12-digit Arezak Account Number;
- an `@handle`;
- a Ghana phone number only when that number is verified;
- a UUID for authenticated internal/support resolution;
- an Arezak QR payload (`arezak://receive/<opaque-token>`).

The resolver selects an active receiving account and returns only the display name, handle, account number, and masked verified phone number. It does not return email, balances, or database IDs. A sender must confirm that identity before entering an amount.

`PATCH /api/v1/identity/handle` lets an authenticated user set or change their handle. The database unique index resolves concurrent handle claims; conflicts return HTTP 409. Contact upload and contact matching are not implemented, and no contact permission is requested.

## QR identity

Each financial account receives a separate, random 192-bit opaque token. The QR encodes only the versioned Arezak receiving URI and that token; it does not encode a name, phone, account number, balance, or transaction details. The token is stable for the life of the account and resolves to the same account through the recipient resolver. It is not a payment instruction: the sender still confirms identity and amount in Arezak.

The Receive page renders a QR from the server-provided payload. Send can scan with the browser's native `BarcodeDetector` where supported and where camera access is available; otherwise the QR value can be pasted. A native application deep-link handler is not part of this web block.

## Internal transfers and financial boundary

The external `SEND` operation is reserved for external provider execution. The API rejects an `AREZAK_USER` destination through that external route so it cannot be mistaken for a provider payment.

`POST /api/v1/operations/internal-transfer` accepts the sender's owned account, a recipient identifier, GHS pesewas, and a required `Idempotency-Key`. The backend resolves the identifier again at initiation, locks the two canonical account rows in stable order, applies the existing Rules Engine decision to the sender, and creates one completed `TRANSFER` transaction. It atomically debits sender available funds, credits recipient available funds, and writes equal debit/credit ledger entries against their canonical account UUIDs. Reserved and locked balances are untouched. Replays with matching parameters return the original transaction; key reuse with different parameters is rejected. The client never supplies a target database account UUID.

The transfer is internal and synchronous. It does not use the provider router or create a provider attempt. External mobile-money sends remain unavailable until a provider is configured.

## Available and unavailable identity features

Available: generated account numbers, unique optional handles, self identity/receive details, opaque receiving QR, recipient resolution by account number/handle/QR, verified-only phone lookup, and internal account-to-account transfers through the ledger.

Unavailable: phone registration/login, phone verification and phone discovery for current users, profile photo storage, contact sync, email discovery, a native deep-link handler, provider-backed external sending, and QR scanning on browsers without `BarcodeDetector`. These are shown as unavailable rather than simulated.

## Migration and data handling

Migration `e82b47c1a9d4` adds optional handle and phone verification fields, backfills random account numbers and QR tokens for existing accounts, and adds the recipient-account foreign key. Downgrade removes these identity fields and the new transfer reference. It does not alter historical ledger entries or transaction amounts.
