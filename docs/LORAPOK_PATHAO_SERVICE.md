# Lorapok Labs Courier API

<img src="../public/images/themes/lorapok-labs.svg" alt="Lorapok Labs" width="64" height="64">

An independent, private, server-to-server API for reusable Pathao courier integration. BNP is the first product adapter. The service has its own runtime, authentication, encrypted credential registry, persistence and migrations in `services/pathao-api/`. It does not import BNP UI, orders or payment tables. It is source in this draft, **not a deployed service or published package**. No infrastructure, credentials, domain changes or paid resources were provisioned.

## Parent API integration

The [Lorapok Labs Platform API](LORAPOK_PLATFORM_API.md) can mount this service under `/courier/v1/*` with separate courier credentials and database. BNP catalog/orders now default to that parent API, while gateway work is deferred. Parent-mode paid dispatch is disabled regardless of old local order flags. The legacy verified-payment adapter below remains explicit migration/test code.

## Boundaries and trust

- `services/pathao-api/src/worker.js`: Fetch-runtime entry point; an optional Node 22 host is `src/server.js`. Hosting is not selected by this draft.
- `src/api.js`: versioned `/v1` API, authenticated capability checks, tenant resolution, operation claims and encrypted webhook admission.
- `src/provider/`: fixed-host Pathao transport, token lifecycle, stores, locations, quotes, prepaid bookings and tracking.
- `src/client.js`: thin server-only product SDK. BNP imports this, not a provider runtime, by default.
- `src/token-store.js`, `registry.js`, `operations.js`, `reconciliation.js`, `rewards.js`: separate persistence boundaries.
- BNP Pages Functions: admin sessions, CSRF, single-product order ownership, QC, verified settlement proof and fulfillment policy. These remain product responsibilities.

The service authenticates a random bearer token by its SHA-256 digest in `courier_api_clients`. A client has one immutable merchant/product/environment scope and explicit permissions: `courier:read`, `courier:dispatch`, `courier:stores:create`, `rewards:read`. Scope never comes from public JSON or a caller-provided merchant header. API tokens, dispatch signing keys and provider credentials stay on servers. Requests with an `Origin` header and CORS preflights are rejected; no browser cookie authentication is offered. SDK configuration must match `/v1/context` before other calls.

Provider credential registrations are encrypted and authenticated per merchant/product/environment. Products have separate credential records, client permissions, dispatch keys, token caches, operation records and webhook endpoints; ciphertext cannot be transplanted between products. If an operator deliberately configures the same provider account for multiple products, that is an explicit provisioning choice, not a lookup fallback. Rewards are deliberately **merchant-wide across products**, so only grant `rewards:read` to clients authorized to see that aggregate. Provider clients use fixed sandbox/production hosts and reject redirects. Token keys include merchant, product, environment and a credential fingerprint.

**BNP's orders/payment DB is single merchant/product.** Never put unrelated merchants' orders into that DB. Courier scoping does not retrofit tenant ownership onto BNP order tables. A future shared ecommerce order backend requires tenant ownership throughout. The current primary website and BNP.live are intended as separate frontends; whether they share catalog, orders and admin is unresolved. No DNS, CORS, primary-URL, legal ownership or deployment assumption is made.

## Prepaid dispatch proof and one-way outcomes

BNP atomically claims an eligible order only after QC and durable verified payment settlement. It rechecks proof and signs a 60-second dispatch grant containing the stable order ID, intent, payment event, amount/currency, product/merchant/environment and exact payload hash. The service verifies that grant before and after provider preflight, then atomically claims its own operation. Unique stable order ID, intent and merchant reference constraints prevent replays or renamed references from booking again.

The grant is **delegated evidence from the trusted product payment adapter**, not independent bank confirmation. A compromised product signing key can attest false payment; it must be protected and only used after durable settlement checks. No browser flag, return URL, manual paid flag or mock receipt can mint a BNP grant. The current LoraHost payment contract is still unimplemented and public checkout remains fail-closed.

This adapter supports normal parcel service (`delivery_type: 48`, `item_type: 2`), 0.5–10 kg and `amount_to_collect: 0`. It validates Unicode name/address lengths, Bangladesh phone format, IDs, store ownership/activity, city → zone → area hierarchy and explicit home-delivery availability. Store creation validates pickup availability. Missing availability does not imply permission.

Once a shipment/store POST might have been sent, **never retry automatically**. A timeout, HTTP error, malformed response or failed DB confirmation is retained as `unknown`/`submitting`; Pathao idempotency is unverified. There is no reset API. Reconcile provider records manually under a separately reviewed procedure before repairing a claim. Refund/dispute races after the final payment check require operational reconciliation because the product DB and Pathao cannot share a transaction.

## Encrypted persistence

Apply service migrations `0001_api.sql` through `0005_quotes.sql` to a **separate** service database, not BNP's `DB`. The runtime uses `COURIER_DB`, a 32-byte base64 `COURIER_ENCRYPTION_KEY`, a key version, and optional explicitly versioned old decryption keys. Registry configurations, dispatch keys, webhook secrets, tokens and complete webhook payloads are encrypted with AES-256-GCM and contextual authenticated data. Client bearer tokens are stored as hashes. No secret values are committed or returned by API metadata.

The D1 token adapter uses cross-isolate leases, compare-and-swap and fencing. It never steals an expired token-grant lease automatically: the upstream token operation may already have executed, and Pathao cannot honor a local fencing token. Ambiguous/failed refreshes are quarantined for review rather than resetting to a password grant. Read-only tracking reconciliation can retry with a fenced lease. Encryption supports key rotation through exact versioned old keys; a DB writer could still replay old authenticated ciphertext, so encryption is not a substitute for database access control, audit, backups and recovery.

The legacy embedded adapter remains for explicit migration/tests only. It has an in-memory token cache, and is never chosen as a silent service fallback. It must not be mistaken for durable production persistence.

## API routes

All routes except health and scoped provider webhooks require bearer authentication.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/health` | Runtime health and Lorapok Labs identity |
| GET | `/v1/context` | Authenticated scope/environment |
| GET | `/v1/stores?page=1` | Paginated merchant stores |
| GET | `/v1/stores/{id}` | Verify an active store, bounded 20-page scan |
| GET | `/v1/locations?type=cities` | Cities |
| GET | `/v1/locations?type=zones&parent_id=…` | Zones in one city |
| GET | `/v1/locations?type=areas&parent_id=…` | Areas and availability in one zone |
| POST | `/v1/rates` | Validate `{store_id,city_id,zone_id,item_weight}` and persist estimate |
| POST | `/v1/stores` | Gated `{request_id: UUID,store:{…}}`, pending provider approval |
| POST | `/v1/shipments` | Gated `{payload,dispatch_grant}`, atomic duplicate prevention |
| POST | `/v1/shipments/{merchant_order_id}/tracking` | Refresh a known confirmed scoped shipment |
| GET | `/v1/operations?kind=shipment&reference=…` | Read a scoped operation; `kind=store` also supported |
| GET | `/v1/rewards?month=YYYY-MM` | Merchant-wide confirmed evidence and separate projection |
| POST | `/v1/webhooks/pathao/{endpoint_id}` | Registered scoped provider callback |

No bulk order adapter, public tracking endpoint, provider credential provisioning endpoint, reward editing endpoint or automatic fulfillment transition is exposed. The provider documents asynchronous bulk acceptance but not enough idempotency/per-item failure guarantees for safe implementation here.

## Quotes, fees and integer math

Quotes preserve provider `price`, `discount`, `promo_discount`, `additional_charge`, `final_price`, `plan_id`, COD flags and percentage where returned. Money fields also have exact integer poisha representations (100 poisha = BDT 1); excessive decimal precision, negative values and unsafe numbers fail validation instead of being rounded. The quote ledger stores its scope, input, exact provider breakdown and observation time.

`final_price` is authoritative **for that quote**, not a settled invoice. Never subtract tier or promotional discounts again. The price-plan request does not include collection amount; its result must not be assumed to include a COD collection fee. BNP always collects zero. Potential return fees, extra-weight rounding, tax, promo stacking and later adjustments remain provider-contract/invoice matters. No invented formula or static pricing snapshot is used for customer charging.

## Webhooks and status reconciliation

The exact single-key `{ "event": "webhook_integration" }` challenge receives 202 and the provider-documented integration header. The protocol response constant is not a merchant secret. Other callbacks require `X-PATHAO-Signature` equal to the configured shared secret using constant-time comparison; it is **not HMAC**.

Authenticated JSON payloads are encrypted in a durable, deduplicated inbox with a scoped queue job in one transaction. Failure to persist returns 503. Accepted admission returns 202 within an outer eight-second budget; body reads are limited to 16 KiB/five seconds. A late database completion is safe to deduplicate. No raw customer payload appears in logs or the response.

**The delivery payload schema and stable event identifiers are still unverified.** The processor therefore does not interpret a field as paid, delivered, sorted or reward-eligible. A callback triggers bounded read-only GET reconciliation of known confirmed consignments in that scope. Both provider identities must match before display-only status changes. Raw unknown states remain unknown. After refresh, receipts remain `review_required` because schema interpretation is unresolved. Payments, fulfillment and rewards never change from these callbacks.

Workers use `waitUntil` plus an explicitly configured scheduled trigger for retries/pagination. The optional Node host supplies tracked background work and a 60-second bounded queue drain when the reconciliation gate is enabled. Claim leases, bounded batches, exponential retry delays and terminal review states prevent an unbounded hot loop. Hosting must still supply TLS, reachability, authentication/rate limits, retention and external latency tests. No scheduler or webhook subscription was provisioned.

## Merchant rewards: evidence versus projections

Verified merchant UI/T&C currently show Standard 0–49, Silver 50, Gold 100 and Diamond 200 monthly qualifying sorted/processing orders, reset monthly, and a BDT 5,000 merchant-wide cap. The FAQ states higher discounts apply to future orders. These observations have provenance, not a guarantee that policy never changes.

The backend includes an immutable scoped evidence ledger, authenticated server-adapter ingestion contract, deduplication, reversal handling, provider snapshots and integer-money projections. A trusted adapter must authenticate and normalize provider evidence; there is **no public ingestion route and no real provider reward adapter installed**. A snapshot can be marked complete only after reconciling all merchant history across products, not merely reading a dashboard counter.

Default projections fail closed on unknown provider timezone, qualifying event mapping, reversal policy, exact threshold-order eligibility, route/weight schedule, partial cap allocation and complete history. Tier/count/earnings are `null` when unsupported, never fabricated zeros. Fixtures test 49/50, 99/100, 199/200, monthly boundaries, duplicate/reversed events, negative/zero values, cap remainder and safe integer arithmetic under explicit synthetic policies. Those fixtures do not establish Pathao's unknown policies. API quotes are never modified by reward projection results.

The admin settings panel requests an explicit reporting month and shows provider-confirmed evidence separately from local projections, source/time and missing facts. No implicit Bangladesh month-boundary timezone, guessed current tier, customer discount or earned balance is asserted. The inspected account had no invoices, so actual settlement reconciliation remains unverified.

## Run and verify safely

From the repo on Node 22+: `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run build`.

`node scripts/run-pathao-local.mjs --smoke` starts a separate API on loopback port 8788 and a static-export/Pages-function adapter on 8789 using only in-memory synthetic databases and a mock provider. It performs read-only smoke checks and remains running until interrupted. Its printed demo login is synthetic. No real Pathao, payment or store transaction occurs. This is a development harness, not a deployable Pages emulator or provider acceptance test.

For a separately configured Node service, use `npm start --prefix services/pathao-api` with an existing migrated `COURIER_DATABASE_PATH` and the service environment. The host does not create/migrate the DB, provision credentials or enable gates. For Fetch hosting, configure `worker.js`, `COURIER_DB`, encrypted settings, routes and optional schedules through a separately approved deployment plan. Avoid public exposure without TLS and platform controls.

Before production: approve hosting/provisioning, configure encrypted clients/merchant records, verify provider sandbox contracts, implement verified payment settlement, test deployed auth/CSRF/D1 and webhook latency, define backup/retention/rotation/incident procedures, and obtain explicit release approval. Browser interaction/visual QA is still required in a working browser environment; builds and HTTP smoke tests are not browser acceptance.

## Sources

Verified on 2026-11-05 from the signed-in merchant dashboard and owner-supplied documentation: [API](https://merchant.pathao.com/courier/developer-api), [rewards](https://merchant.pathao.com/courier/benefits-reward), [pricing](https://merchant.pathao.com/courier/plan). No account secrets or raw internal audit were copied into source. Live token issuance, orders, stores, invoices, payment settlement and provider acceptance were not exercised.
