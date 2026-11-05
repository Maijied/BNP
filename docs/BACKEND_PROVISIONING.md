# Backend wiring and safe acceptance

## What the source implements

The parent runtime is `services/lorapok-api/src/worker.js`, with a Node host in
`src/server.js`. Commerce persists immutable priced unpaid requests and audited
verification/cancellation. The independently scoped courier module implements
stores, geography, quote records, guarded booking claims, webhook admission and
read-only reconciliation. These are implementations, not evidence of a deployed
service, live provider connectivity or merchant provisioning.

The repository's Pages release workflow deploys the frontend and Pages Functions
only. It does not deploy the parent Worker, apply its commerce migrations, create
registrations, provision server credentials, or bind the Pages application to it.
Without those steps `/api/catalog` and `/api/order` correctly return 503. A static
frontend deployment or successful build cannot fix those missing bindings.

Vespa is the parent product experience and BNP is its client storefront. The
current API implements tenant isolation, not a super-admin permission: a BNP
credential never reads another application's records. The separate Vespa sample
store adapter is another explicitly registered scope. A cross-client parent admin
console and delegated multi-admin identity are not implemented. Do not repurpose a
BNP admin key as an unrestricted parent key.

## Three separate databases

1. Pages/auth `DB`: admin throttle schema `migrations/d1/0002_admin_login_attempts.sql`
   and receipt throttle schema `migrations/d1/0006_receipt_status_attempts.sql`.
   These tables are independent and can be applied to a new auth-only DB. The other
   `migrations/d1` files concern the explicitly legacy commerce/shipment path; do
   not bind an existing production orders database merely to get login working.
2. Parent `PLATFORM_DB`: `services/lorapok-api/migrations/0001_commerce.sql`.
3. Optional courier `COURIER_DB`: all ordered migrations in
   `services/pathao-api/migrations/`, currently `0001` through `0005`.

All creation, remote migrations, credentials, bindings, custom-domain routes and
deployment require explicit approval. No remote schema or settings were changed
by this implementation. Do not apply a new schema over an unidentified database.

## Exact provisioning sequence after approval

1. Identify the existing Cloudflare account, Pages project and environments. Verify
   the current bindings, environment variables, deployment commit and existing
   data. Record rollback/export arrangements. Select a separate approved staging
   parent service and empty staging databases first.
2. Copy `services/lorapok-api/wrangler.example.jsonc` to a private deployment config,
   replace the approved Worker and D1 identifiers, and keep every gate `false`.
   The example intentionally cannot deploy as-is and creates no custom route or
   scheduled trigger. Bind optional `COURIER_DB` only as a separate database.
3. Apply the parent migration with the approved config using Wrangler's D1
   `migrations apply <approved-commerce-database> --remote --config <approved-config>`.
   Apply the two auth-only SQL files using D1 `execute <approved-auth-database>
   --remote --file <file>` if those tables are absent. Apply courier migrations to
   the distinct courier DB only when that module is being provisioned. These
   commands describe the deployment path; they were not executed.
4. Register the agreed merchant/application/environment tuples in
   `platform_registrations`. Provision separate random server credentials through
   the approved secret-management process, storing only SHA-256 digests in
   `platform_api_clients`. Storefront permissions are `catalog:read, orders:create`;
   admin permissions are `catalog:read, catalog:write, orders:read, orders:update`.
   Receipt lookup requires both private receipt proofs under `orders:create` and
   does not grant general order read access. Generating or configuring persistent
   credentials requires separate action-time approval.
5. Publish the parent Worker only to its approved private/service-bound destination.
   Configure Pages `PLATFORM_API_BINDING` to that exact Worker, or an approved HTTPS
   `PLATFORM_API_URL`. Set matching `PLATFORM_MERCHANT_KEY`, `PLATFORM_PRODUCT_KEY`,
   `PLATFORM_ENVIRONMENT`, and distinct `PLATFORM_STOREFRONT_API_TOKEN` and
   `PLATFORM_ADMIN_API_TOKEN` using server-only settings. Never prefix secrets with
   `NEXT_PUBLIC_`. For the second sample store, set all `VESPA_PLATFORM_*` settings
   separately; there is intentionally no fallback to BNP credentials or scope.
6. Bind the auth-only DB as Pages `DB`. Configure the existing Pages login contract
   with `ADMIN_EMAIL`, `ADMIN_PASSWORD` (at least 16 characters) and
   `ADMIN_SESSION_SECRET` (at least 32 characters) using approved secret storage.
   `ADMIN_DEFAULT_EMAIL` and `ADMIN_DEFAULT_PASSWORD` only seed legacy MySQL and do
   not configure Pages login. The template previously omitted this distinction.
7. With intake still false, populate only the separately approved catalog via the
   authenticated admin API and confirm product/shipping prices and versions.
   Catalog data is public. Do not copy the local synthetic demo catalog into a live
   tenant or assume the second sample store's prices are real merchant prices.
8. Verify `/health`, then authenticated `/v1/context`, catalog and capabilities from
   each server identity. `/health` reports binding presence, not schema readiness,
   registration, permissions, catalog completeness or provider connectivity. Test
   Pages login, admin catalog/order reads, 401 unauthenticated access, wrong-scope
   denial, and unavailable order submission while the intake gate is false.
9. Only in an approved isolated sandbox, exercise a synthetic request, same-request
   retry, admin verification/cancellation, receipt status, expiry and throttling.
   Keep production intake, all actual provider booking, store creation and payment
   disabled. Do not create a real order merely to smoke-test the live site.

The alternative Node host requires an existing migrated persistent
`PLATFORM_DATABASE_PATH` and optional DIFFERENT `COURIER_DATABASE_PATH`, plus an
approved TLS/service proxy and process supervision. It defaults to loopback and
never creates databases or credentials automatically. A filesystem file mounted
ephemerally in a container is not durable production storage.

## Private receipt status, not courier tracking

The only public status routes are same-origin POST `/api/order/status` (BNP) and
`/api/vespa/order/status` (separate sample store). The JSON body contains
`order_number` and the original `request_id`; neither belongs in a URL, analytics,
logs, chat support snippets or public links. The browser retains both in the same
tab's session storage after confirmation. The server-generated order number uses
`crypto.randomUUID()`; a user-selected predictable request ID alone is not enough.

The parent's server-only POST `/v1/order-status` checks both values in the client's
merchant/application/environment and accepts them for 30 days after creation.
It returns only order reference, `new/verification/cancelled`, `unpaid`, currency,
total, creation/update timestamps and disabled payment/dispatch capabilities.
It never returns customer name, phone, address, item customization, a payment
confirmation, a courier identity or an estimated delivery date. Possession of the
two receipt proofs is not verified personal identity. There is no account recovery
or proof-reissue endpoint. A lost/expired proof cannot be looked up by phone or name.

Pages consumes an atomic, durable limit of 20 requests per 15-minute fixed window
per trusted Cloudflare IP and shop, including unsuccessful attempts. The rate key
is a domain-separated HMAC of the trusted IP, using the existing admin session
secret; only its digest/counters are stored. Records older than a day are cleaned
up. Missing trusted IP, secret, DB or throttle schema returns 503 before the parent
API is called. The Cloudflare header is trusted only at the actual Pages edge; do
not expose this handler behind a proxy that lets callers spoof that header.
Origin mismatch returns 403, incorrect/expired proof returns a generic 404, and
throttling returns 429. Responses are `no-store`. Global perimeter abuse limits and
retention/backups remain deployment responsibilities.

The old GET `/api/order/:orderNumber` remains unavailable: order number alone does
not authorize a receipt or customer lookup. Existing receipts created before the
frontend retained their request UUID cannot be recovered through this endpoint.

## Delivery gaps that remain

- No provisioned parent host/bindings or approved tenant catalogs are established
  by the repository alone. Live configuration must be independently inspected.
- A real Pathao account/token/store configuration and provider sandbox acceptance
  have not been exercised by local tests. The local provider is deliberately fake.
- The parent order state machine cannot reach production, QC, or dispatch. Its
  shipment adapters reject booking even if legacy paid flags or courier gates are
  changed. Payment capture/settlement is deferred, so there is no paid dispatch proof.
- Customer courier tracking does not exist without a real, confirmed consignment
  and an authorized ownership binding. Receipt status is not delivery tracking.
- Provider webhook payload semantics and full rewards/invoice evidence still need
  verification. Unknown evidence must not become delivered, paid, or earned states.

No keys, real customer requests, provider bookings, production writes or remote
migrations are necessary for the local acceptance suite.
