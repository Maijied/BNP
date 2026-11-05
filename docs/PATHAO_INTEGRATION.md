# BNP prepaid courier integration

BNP and the independent Courier API are Lorapok Labs products. BNP is the API's first consumer; provider credentials and persistence live in the separate service. See [architecture, API, security and remaining gates](LORAPOK_PATHAO_SERVICE.md).

## Current parent architecture

BNP now defaults to the [Lorapok Labs Platform API](LORAPOK_PLATFORM_API.md) for catalog and unpaid requests. Payment gateway work is explicitly deferred. Parent-mode order shipment routes stay disabled; the prepaid verified-settlement adapter described below is preserved only for explicit legacy migration/tests until a future verified payment integration is reviewed. Courier queries and reward evidence remain independently available.

## Implemented product adapter

- Signed admin sessions and same-origin mutations.
- Dynamic paginated stores, active-store verification, city → zone → area and explicit delivery availability.
- Merchant quote display with provider breakdown, exact money representation and observation provenance. It never changes the customer delivery charge or subtracts a reward twice.
- Server-selected recipient, quantity and reference; 0.5–10 kg normal parcels and zero cash collection.
- Durable QC/verified-payment eligibility at atomic local booking claim, then rechecked before signing a short-lived exact-payload grant for the independent API.
- A second scoped claim in the service, including unique stable order identity, prevents duplicate provider requests.
- Explicit tracking refresh of known consignments. Status is display-only and does not imply payment or fulfillment.
- Read-only merchant-wide reward evidence and projection panel with explicit reporting month and unknown-state disclosure.
- Gated create-store API with validated fields, persistent request UUID and uncertain-outcome protection. It is not an automatic store-creation action or a complete management UI.

## Payment remains a launch blocker

The LoraHost payment webhook and customer order lookup remain fail-closed. Paid checkout remains fail-closed. The replacement unpaid-intake route persists a versioned, idempotent request in the parent API and never initiates payment. Do not enable real checkout until the actual bridge contract, durable order creation, authenticated/replay-safe webhook, amount/currency/reference matching and atomic settlement are implemented and staged.

Migration `0003_pathao_shipments.sql` adds an **empty** settlement proof table. Never populate it from a paid flag, receipt, return URL, browser callback, manual note or mock data. A verified payment event must insert proof in the same transaction as the matched successful payment attempt/order updates. No manual proof-writing route exists. The courier API's signed grant delegates trust to this product adapter and does not independently verify a bank transaction.

## Product configuration

Use encrypted server settings, not chat, GitHub, frontend variables or public documents:

- `PATHAO_BACKEND_MODE=service` (default); `COURIER_API_URL` must be an HTTPS origin, or use an authorized server binding `COURIER_API_BINDING`.
- `COURIER_API_TOKEN`: scoped API client bearer secret; `COURIER_DISPATCH_SIGNING_KEY`: matching product dispatch proof key.
- `PATHAO_MERCHANT_KEY`, `PATHAO_PRODUCT_KEY`: stable server identity; BNP order DB belongs only to this product/merchant.
- `PATHAO_ENVIRONMENT=sandbox`; the SDK checks service identity/environment before use.
- `PATHAO_STORE_ID`: optional preferred store, always revalidated. No first-store guessing.
- `PATHAO_ENABLED`, `PATHAO_DISPATCH_ENABLED`, `PATHAO_STORE_MANAGEMENT_ENABLED`: separate gates, disabled by default. Service capability gates and client permissions must also permit the action.
- Existing `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `DB` belong to the BNP adapter.

Provider credentials belong in the independent service's encrypted registry, not BNP. See `services/pathao-api/.env.example`. No real credentials, persistent access or hosting configuration have been provisioned. Explicit legacy `embedded` mode is retained for migration/tests only; it is not an automatic fallback.

## BNP routes

- GET `/api/admin/pathao/stores?page=1`
- POST `/api/admin/pathao/rates`
- POST `/api/admin/pathao/stores`: `{request_id: UUID, store: {…}}`; retain the UUID and reconcile unknown outcomes before any new request.
- GET `/api/admin/pathao/locations?type=cities`, `type=zones&city_id=…`, `type=areas&zone_id=…`
- GET `/api/admin/pathao/rewards?month=YYYY-MM`: explicitly authorized merchant-wide reward view.
- GET `/api/admin/orders/{uuid}/shipment`: durable record and eligibility.
- POST same route: numeric `store_id`, `city_id`, `zone_id`, `area_id`, `item_weight`; no caller payment, recipient or COD overrides.
- PATCH same route: refresh confirmed shipment status.

Provider callbacks target the independent service's registered `/v1/webhooks/pathao/{endpoint}`. BNP `/api/pathao/webhook` rejects service mode; the old embedded route is not the new callback. The independent API persists encrypted callbacks and safely reconciles known tracking records without inferring unknown delivery-event fields. Payment, fulfillment and rewards are not mutated by callbacks.

## Staging checklist

1. Apply BNP migrations `migrations/d1/0001` through `0005` to a separate staging product DB. Apply `services/pathao-api/migrations/0001` through `0005` to a different service DB. Do not mix them. Backups/schema review precede any authorized production migration.
2. Historical unscoped shipments remain blocked until ownership is reconciled. Use separate sandbox/production DBs and scopes; a shipment slot spans environments. Never book a sandbox parcel against a production order.
3. Run tests, typecheck, production export and `node scripts/run-pathao-local.mjs --smoke`. The local harness uses only synthetic fixtures and mock provider responses.
4. Obtain approval before provider token provisioning, live/test stores or shipments, merchant webhook settings, migration or deployment. Validate the official API in sandbox rather than treating mocked tests as acceptance.
5. Exercise repeated clicks, concurrency, wrong merchant/product/environment, missing/expired proof, refunds/disputes, geography/availability, provider timeouts, DB failures and stale UI responses. Verify real deployed static admin access gates and CSRF.
6. Never reset/replay a `submitting` or `unknown` operation automatically. Reconcile provider records/support with the merchant reference before a separately reviewed repair.
7. Booking does not imply pickup/delivery. Manual shipped/delivered transitions still require confirmed **production** booking, verified settlement and operational verification.
8. Agree on backend hosting, frontend data/admin sharing and the exact primary URL. BNP.live is a separate slim frontend, not a redirect. No DNS or domain-ownership changes are included.
9. Verify browser/mobile interaction, external webhook TLS/latency, retention, backups, key rotation and incident response before launch. Account invoices were empty, so settlement/fees have not been empirically reconciled.

Source of truth: [official merchant API](https://merchant.pathao.com/courier/developer-api), [merchant pricing](https://merchant.pathao.com/courier/plan), [rewards policy](https://merchant.pathao.com/courier/benefits-reward), reviewed 2026-11-05. Runtime-secret changes, hosting and deployment are separate approval-requiring operations. GitHub secrets are not automatically Cloudflare runtime bindings.
