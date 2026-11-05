# Lorapok Labs Platform API

<img src="../public/images/themes/lorapok-labs.svg" alt="Lorapok Labs" width="64" height="64">

This local architecture separates reusable backend products from slim ecommerce frontends. The parent API contains independent commerce and courier modules. BNP consumes server-only SDKs; BNP.live can be another frontend without copying the whole backend. No hosting, domain, ownership, shared-catalog or shared-admin decision is implied.

**Payment gateway work is explicitly deferred.** The complete current non-payment workflow is catalog → unpaid request → admin verification/cancellation. Capturing payment, marking paid, production, QC and paid dispatch are unavailable in the parent commerce model. No configuration flag can turn the deferred payment port into a working gateway.

## Components

- `services/lorapok-api/src/worker.js`: parent Fetch API. `/v1/*` serves commerce and `/courier/v1/*` mounts the isolated courier module. `src/server.js` provides an optional Node 22 host.
- `src/commerce.js`: catalog, immutable priced order snapshots, scoped queries and non-payment status transitions.
- `src/registry.js`: hashed server API credentials and enabled merchant/application/environment registrations.
- `src/client.js`: small server-only product SDK. No payment/provider code in browser bundles.
- `src/payment-port.js`: explicit unavailable interface for later payment integration.
- `services/pathao-api/`: reusable courier adapter, encrypted provider/token storage, operation claims, quotes and webhook/reward evidence. It may run standalone or under the parent mount.
- BNP Pages Functions: browser session/CSRF boundary and fixed API adapters. They are not an alternate order or price source.
- BNP admin: parent catalog/version management, scoped unpaid requests, verification/cancellation, and separate merchant reward evidence.

The parent commerce DB (`PLATFORM_DB`), courier DB (`COURIER_DB`) and legacy BNP/auth DB (`DB`) remain distinct. Node startup rejects using the same configured path for the parent and courier databases. In service mode the legacy BNP order tables are never consulted for commerce or dispatch proof. The remaining `DB` binding supports existing admin login throttling. No production data was copied or migrated.

## Tenant and credential boundaries

Every registration, catalog entry, revision, order and audit record includes merchant, application (`product_key`) and environment. All reads/writes use that authenticated tuple. Composite keys and foreign keys enforce ownership. A SKU is a catalog product; `product_key` means an application such as BNP. These are deliberately different concepts.

Server API clients store SHA-256 token digests, not plaintext tokens. Disabling a registration disables its clients. Browser Origin requests and CORS preflights are rejected by the APIs. BNP checks its signed admin session and same-origin mutation before forwarding through a server credential. Frontend bundles contain no API credentials.

Use distinct keys:

- Storefront: `catalog:read`, `orders:create`.
- Administration: `catalog:read`, `catalog:write`, `orders:read`, `orders:update`.
- Courier: separate scoped credentials with only necessary courier/reward permissions. The parent prefix does not merge permission sets or grant access from a commerce key.

The SDK verifies `/v1/context` matches configured merchant/application/environment before other calls. URLs must be HTTPS origins and redirects are rejected. Requests never forward browser cookies or Origin to the parent API. Secret provisioning is not included and requires separate authorization.

## Catalog and exact pricing

Catalog products contain `sku`, `title`, integer `unit_price_minor`, BDT currency, active state, kind, metadata and version. Shipping choices contain a code, explicit service-area label, integer `price_minor`, active state and version. 100 poisha equals BDT 1. No floating-point rounding, browser total, wholesale discount, tax, Pathao quote or promotional snapshot determines the stored order total.

Catalog writes require `expected_version`. Zero creates a record; existing records require the current version. Concurrent edits conflict rather than overwrite. Revisions are immutable. Archiving removes an item from public catalog, not historic orders. No real catalog/prices are seeded automatically.

For BNP, a `plate` can carry `metadata.model` A or B, and an optional accessory uses kind `bracket`. The UI requires exactly one active configured model; it does not guess a duplicate SKU. Other applications are not constrained to BNP model names. The current customization contract supports optional registration text; other customization schemas require deliberate future extension.

Shipping choice is customer-declared and must be verified against the address by operations. A district name does not establish same-city eligibility. The displayed unpaid request total is subject to that review. The courier quote ledger remains a separate merchant estimate, never a silently substituted customer shipping price.

## Durable unpaid order intake

POST `/v1/orders` accepts only:

- A persistent UUID `request_id`.
- Customer name, phone, address, district and optional shop name.
- Up to 20 distinct item SKUs with integer quantities 1–100 and allowed customization fields.
- An explicit shipping code and expected catalog/shipping versions.

The service loads current active prices, checks exact safe-integer line/subtotal/shipping sums, and inserts an immutable snapshot using version guards in the same SQL statement. A shared-scope CTE keeps the maximum 20-item insertion within D1's 100-bind limit. Audit triggers participate in the same transaction; failure to write the audit prevents order creation.

The scoped UUID and canonical request hash prevent concurrent duplicates. Repeating the same request returns the existing order, including its original prices after later catalog edits. Reusing that UUID with different details conflicts. HTTP uncertainty must retain the original UUID/payload; never generate a new request merely because a response was lost.

The storefront retains the exact pending request in its tab's session storage, clears it after confirmed success, and visibly freezes conflicting/uncertain changes. It never redirects an unpaid request to payment success or invents a checkout URL. Server prices and versions remain authoritative. There is no order-number-only customer lookup or mock receipt endpoint. A same-origin proof-based receipt-status adapter returns only minimal unpaid status; see [the provisioning and receipt contract](BACKEND_PROVISIONING.md).

## Admin operations and audit

Admin list reads are scoped and bounded to 100 records maximum (25 default), with query-bound, scope-validated keyset cursors. Order detail is scoped. The status graph allows only `new → verification`, `new → cancelled`, `verification → cancelled`. Updates require `expected_version`; conflicting operators receive a conflict.

Order snapshots, identity, totals, currency, created time and unpaid payment state cannot be modified by the status API. Database triggers also reject such mutations. Append-only order audits and catalog revisions are operational history, not proof of payment. The current server-key boundary identifies the trusted application; individual multi-admin identity/audit delegation is not implemented by this single-admin BNP adapter.

Legacy order handlers exist only behind explicit `COMMERCE_BACKEND_MODE=legacy`, for migration/tests. This is never an automatic fallback. The new admin screens target the parent API, not the legacy database. Parent-mode shipment routes return ineligible/disabled, regardless of legacy paid flags or courier environment gates.

## HTTP contract

| Method | Path | Permission / behavior |
| --- | --- | --- |
| GET | `/health` | Module configuration indicator, not provider readiness |
| GET | `/v1/context` | Authenticated scope/environment |
| GET | `/v1/capabilities` | Intake availability, payment and paid-dispatch false |
| GET | `/v1/catalog` | `catalog:read`, active entries |
| GET | `/v1/admin/catalog` | `catalog:write`, includes archived entries |
| PUT | `/v1/admin/catalog/products/{sku}` | `catalog:write`, versioned product mutation |
| PUT | `/v1/admin/catalog/shipping/{code}` | `catalog:write`, versioned shipping mutation |
| POST | `/v1/orders` | `orders:create`, separately gated unpaid intake |
| POST | `/v1/order-status` | `orders:create`, private order-number + request-ID proof, minimal status, 30-day lifetime |
| GET | `/v1/admin/orders` | `orders:read`, q/status/limit/cursor |
| GET | `/v1/admin/orders/{id}` | `orders:read` |
| PATCH | `/v1/admin/orders/{id}` | `orders:update`, status and expected_version only |
| Any | `/v1/payment*` or `/v1/dispatch*` | Unavailable, gateway deferred |
| Various | `/courier/v1/*` | Separate courier authentication and gates |

Core errors use `{error:{code,message}}`; the BNP browser adapter returns sanitized messages. Bodies are byte-bounded, time-bounded UTF-8 JSON; unexpected fields, compressed bodies, malformed length and invalid identifiers fail closed. Catalog and API responses are not cacheable. Platform perimeter rate limits, quotas and production retention still need an approved hosting plan.

## Local verification and deployment boundary

Run `npm test`, `npx tsc --noEmit`, `npm run build`, then `node scripts/run-pathao-local.mjs --smoke`. The mock harness starts the parent commerce API and mock courier on loopback 8788, and frontend/Pages adapters on 8789. It uses only in-memory databases, synthetic clients/catalog/unpaid requests and no provider credentials. Payment and real courier mutations are disabled. It is not a complete Pages emulator or production host.

Production schema is empty. Apply `services/lorapok-api/migrations/0001_commerce.sql` only to a new, approved parent database. Configure scoped registrations, separate client tokens, bindings and catalog deliberately. Migration from existing order data requires reconciliation/export/import design and approval; do not infer tenant ownership or manufacture settlement proof. No migration/deployment or public source publication was performed in this phase.

For a Node host, `npm start --prefix services/lorapok-api` requires an existing migrated `PLATFORM_DATABASE_PATH`; optional courier requires a different migrated `COURIER_DATABASE_PATH` and its encrypted settings. Worker hosting uses separate `PLATFORM_DB` and `COURIER_DB` bindings. No new infrastructure is required by the source layout, and none has been purchased.

Later payment integration must supply the real gateway contract, authenticated event/replay/amount/currency/reference validation and atomic settlement. Enabling production/QC/courier dispatch requires a separately reviewed state-machine/schema extension and signed verified proof. Current flags cannot bypass those missing pieces.

Catalog metadata is public product information. Never place secrets, private customer details or internal operational notes in catalog metadata. Customer/order data is exposed only through the scoped admin read API or the creating request's response. No product/customer data is sent to analytics, external agents or payment providers by this implementation.

For an isolated second preview, use `node scripts/run-pathao-local.mjs --api-port 8790 --frontend-port 8791 --out /path/to/built/out --smoke`. Host binding remains loopback and external calls remain blocked. Browser cookies are hostname-scoped, not port-scoped; use `localhost` for the second preview when an existing `127.0.0.1` admin session must remain untouched.
