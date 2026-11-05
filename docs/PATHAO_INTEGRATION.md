# Pathao prepaid courier integration (draft, not production-ready)

## Implemented
This is the source-extraction stage of the requested independent Lorapok API service, not a deployed standalone backend. Merchant rewards accounting and customer live tracking remain incomplete pending validated data contracts.

- Authenticated admin paginated active-store selection, city → zone → area, parcel weight, merchant rate estimate and booking controls.
- Reusable server-only Lorapok service boundary with merchant/product/environment isolation; see [architecture and limitations](LORAPOK_PATHAO_SERVICE.md).
- Server-only client credentials and fixed allowlisted sandbox/production API hosts.
- Prepaid orders only: `amount_to_collect: 0`. Client payment, recipient and COD overrides are rejected.
- Recipient, quantity and merchant order reference come from D1, never browser payment state.
- QC and durable settlement proof are required at the atomic claim write and rechecked immediately before booking.
- A unique D1 shipment claim is persisted before the external POST. Repeated clicks and concurrent isolates cannot book twice.
- Confirmed consignment and raw provider status are recorded. Tracking refresh never implies BNP shipped/delivered status.
- Manual shipped/delivered transitions require a confirmed **production** Pathao booking plus verified settlement.
- Ambiguous provider outcomes are retained for reconciliation, without automatic retry.

## Important launch blockers
This code does not finish the payment integration. The current payment webhook and customer order lookup remain fail-closed. Public checkout is now also fail-closed, including when bridge credentials are present: the previous route could initiate payment without persisting an order. No real checkout should be enabled until the actual LoraHost bridge contract, durable order creation, signed/replay-safe webhook validation and atomic settlement are implemented and staged.

Migration `0003_pathao_shipments.sql` adds an EMPTY `payment_settlements` proof table. Do not populate it from existing `payment_status='paid'` flags, receipts, return URLs, client callbacks, manual transaction notes or mock data. A future verified webhook must insert it **in the same transaction** as the verified event and order/attempt updates, after matching amount, currency, session and reference. Proof must link the correct successful event to its attempt and order. Do not expose a manual proof-writing API.

The integration uses the owner's merchant-panel documentation: `/issue-token` password/refresh grants and `/city-list`. This takes precedence over the different auth/city paths found in Pathao's public WooCommerce plugin. The account-specific contract still needs sandbox verification before dispatch is enabled. No live authentication, shipment or payment was executed during implementation.

## What the owner needs to provide/configure
Use the hosting provider's encrypted server secret settings, not chat, GitHub, frontend variables or a public document:
- `PATHAO_CLIENT_ID` and `PATHAO_CLIENT_SECRET` from the merchant developer API page.
- `PATHAO_USERNAME` and `PATHAO_PASSWORD` for the merchant API password grant. These are server-only encrypted secrets; never send them in chat.
- `PATHAO_MERCHANT_KEY` and `PATHAO_PRODUCT_KEY`: stable server-selected merchant/product identifiers. The BNP orders DB must belong to only this merchant/product.
- `PATHAO_STORE_ID`: optional preferred pickup store for this environment. Admins select an active store fetched dynamically; the server revalidates it before booking.
- `PATHAO_WEBHOOK_ENABLED=false` and a separate 32–512-character `PATHAO_WEBHOOK_SECRET`. Do not enable production webhooks until delivery-event schema and processing are confirmed. Use a different secret per environment/product callback.
- `PATHAO_STORE_MANAGEMENT_ENABLED=false`: independent gate for intentional admin create-store submissions.
- `PATHAO_ENVIRONMENT=sandbox` for staging; production only after approval and validation.
- `PATHAO_ENABLED=true` enables server location/tracking API access.
- `PATHAO_DISPATCH_ENABLED=true` separately enables admin booking. Both default to disabled.
- Existing `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` and `DB` D1 binding must already be securely configured.

Authentication uses `POST /aladdin/api/v1/issue-token` with `grant_type=password`, client ID/secret, username and password. Token renewal uses the same endpoint with `grant_type=refresh_token`. Tokens use a bounded, scoped in-memory adapter with expiry skew and shared in-flight grants. The same client rechecks expiry on every operation. There is no durable cross-isolate token storage; see the architecture document for the secure persistence adapter contract. No silent fallback within a failed refresh call and no retry of shipment/store POSTs. Cache-lifetime refresh-failure suppression is not a durable revocation mechanism.

Also confirm the pickup store/address, actual packed parcel weight (0.5–10 kg), parcel eligibility, pricing agreement and courier operating process. The storefront's existing delivery charge is not a live Pathao quote. Merchant delivery fees and return/cancellation charges remain subject to the Pathao merchant agreement.

## API routes
- GET `/api/admin/pathao/stores?page=1`: active/inactive stores and pagination.
- POST `/api/admin/pathao/rates`: validated store/destination/weight, returning a merchant estimate only.
- POST `/api/admin/pathao/stores`: gated store creation with `{ request_id: UUID, store: { ... } }`. Retain the UUID across retries. A pending/unknown submission is not an approved store; reconcile it before a new request.
- GET `/api/admin/pathao/locations?type=cities`
- GET `/api/admin/pathao/locations?type=zones&city_id=…`
- GET `/api/admin/pathao/locations?type=areas&zone_id=…`
- GET `/api/admin/orders/{uuid}/shipment`: local durable record and eligibility.
- POST same route: accepts numeric `store_id`, `city_id`, `zone_id`, `area_id`, `item_weight`. Omitted `store_id` requires a configured preferred store; no first/default-store guessing.
- PATCH same route: refreshes an existing confirmed consignment from Pathao.

All admin routes require the signed admin session. Mutations additionally require matching Origin. Provider errors are not returned verbatim or logged because they may contain credentials or customer details. No unauthenticated public consignment lookup is implemented.

POST `/api/pathao/webhook` is a separate provider route. Exact `{ "event": "webhook_integration" }` receives 202 and `X-Pathao-Merchant-Webhook-Integration-Secret` with the documented public protocol value. Delivery requests require `X-PATHAO-Signature` equal to the configured merchant secret, not an HMAC. They record a deduplicated metadata receipt and return **503 until the actual event schema/processor is verified**. No delivery event can mutate shipment, payment or fulfillment state. The route has bounded body parsing and an 8-second processing deadline. This is not yet live customer tracking; keep the webhook gate disabled in production.

## Staging and reconciliation
1. Use a separate staging D1 and synthetic orders, never production customers/orders. Apply migrations 0001 through 0005 in order. Migration 0004 adds merchant/product scope and webhook receipts; 0005 adds durable store requests. Existing unscoped shipments require ownership reconciliation and remain blocked. Back up and inspect schema before any production migration.
2. Run `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run build` on Node 22+ (tests use built-in SQLite).
3. Validate the official merchant API contract in sandbox with explicit authorization for test booking, then verify the deployed Cloudflare auth/CSRF/D1 behavior. Mock tests are not staging/provider acceptance.
4. Rehearse refund/dispute blocking, missing proof, invalid hierarchy, repeated submissions, timeouts and lost DB responses.
5. Do not equate “booking created” with courier pickup or delivery. Admin fulfillment requires operational verification.
6. Never delete/reset/retry a `submitting` or `unknown` claim automatically. Pathao may have booked the parcel even when no response arrived. Reconcile the merchant order reference in the Pathao merchant panel/support first. There is deliberately no self-service reset endpoint. Record the evidence and use a separately reviewed operations procedure to repair a confirmed consignment or safely resolve a proven non-booking.
7. A shipment's unique order slot spans sandbox and production. Do not book sandbox shipments against production orders or switch the DB from sandbox to production. Tracking rejects environment mismatches.
8. D1 and Pathao cannot share a distributed transaction. A refund/dispute racing after the final eligibility check requires immediate operations reconciliation/cancellation through the merchant process. Future payment/refund tooling must coordinate with shipment claims.
9. Customer fields are currently not editable through these routes. If editing is added, revalidate the address snapshot/request hash before external submission.

## Evidence and compatibility
Checked 2026-11-05:
- Official merchant page supplied by the owner: https://merchant.pathao.com/courier/developer-api (public extraction shows only a JavaScript shell; owner supplied the account-specific endpoint documentation, with no example credentials copied into code).
- Historical cross-check (not the selected merchant contract), Pathao's official integration: https://github.com/pathao-eng/courier-woocommerce-plugin/blob/main/pathao-bridge.php . Uses POST `/aladdin/api/v1/external/login` with client ID/secret, `access_token`, production `https://api-hermes.pathao.com`, sandbox `https://courier-api-sandbox.pathao.com` and geographic endpoints.
- Primary prepaid payload source: https://github.com/pathao-eng/courier-woocommerce-plugin/blob/main/plugin-api.php . Paid orders collect zero COD.
- Secondary compatibility reference (also used for rate estimates and create-store field bounds; requires sandbox confirmation): https://github.com/shahria7k/pathao-courier/blob/main/pathaodocs.md . Tracking GET `/aladdin/api/v1/orders/{consignment_id}/info`, recipient bounds and response fields. The owner-supplied merchant documentation corroborates these fields; live sandbox behavior remains untested.

No provider guarantee of `merchant_order_id` idempotency was verified. Treat even HTTP 401/4xx/5xx after the booking POST as needing reconciliation rather than replaying it. The local claim is the duplicate-prevention mechanism, not an assumed provider guarantee.

## Runtime secrets from GitHub Actions
Storing a secret in GitHub does **not** automatically make it a Cloudflare Pages Function binding. The existing deployment workflow deploys the application but does not provision application secrets.

For an existing Pages project, current Wrangler supports `wrangler pages secret put KEY --project-name PROJECT --env production` (value through stdin) or `wrangler pages secret bulk --project-name PROJECT --env production` (JSON through stdin). Use `--env preview` separately for previews. Supply values from protected GitHub environment secrets with no shell tracing/logging, not literal command arguments, committed JSON or frontend variables. Configure before a subsequent authorized deployment; updating project secret configuration does not itself deploy. Keep all Pathao gates disabled until acceptance testing is approved.

The generic `cloudflare/wrangler-action` `secrets` input targets Workers and is not a Pages runtime-secret uploader. Use an explicit `pages secret` command if wiring this in CI. GitHub environment secrets require the job to select that environment. The CI token needs Account → Cloudflare Pages → Edit and `CLOUDFLARE_ACCOUNT_ID`. Provisioning persistent credentials/runtime secrets and deploying are separate approval-requiring operations, not performed by this PR.

Sources: [Pages bindings and secrets](https://developers.cloudflare.com/pages/functions/bindings/#secrets), [Wrangler Pages secret commands](https://developers.cloudflare.com/workers/wrangler/commands/pages/#pages-secret-put), [official CLI implementation](https://github.com/cloudflare/workers-sdk/blob/main/packages/wrangler/src/pages/secret/index.ts), [wrangler-action implementation](https://github.com/cloudflare/wrangler-action/blob/main/src/wranglerAction.ts).
