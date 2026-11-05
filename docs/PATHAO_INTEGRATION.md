# Pathao prepaid courier integration (draft, not production-ready)

## Implemented
- Authenticated admin city → zone → area selection, parcel weight and booking controls.
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

The integration presently uses Pathao's published official WooCommerce plugin auth contract. The merchant developer panel's account-specific contract and tracking endpoint need sandbox verification before dispatch is enabled. No live authentication, shipment or payment was executed during implementation.

## What the owner needs to provide/configure
Use the hosting provider's encrypted server secret settings, not chat, GitHub, frontend variables or a public document:
- `PATHAO_CLIENT_ID` and `PATHAO_CLIENT_SECRET` from the merchant developer API page.
- `PATHAO_STORE_ID`: the approved pickup store ID for the selected environment.
- `PATHAO_ENVIRONMENT=sandbox` for staging; production only after approval and validation.
- `PATHAO_ENABLED=true` enables server location/tracking API access.
- `PATHAO_DISPATCH_ENABLED=true` separately enables admin booking. Both default to disabled.
- Existing `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` and `DB` D1 binding must already be securely configured.

The current auth flow does not request the merchant account password. If the merchant panel specifies a legacy password-grant contract, do not silently fall back or paste credentials into chat. Have an engineer verify and implement that contract securely before enabling dispatch.

Also confirm the pickup store/address, actual packed parcel weight (0.5–10 kg), parcel eligibility, pricing agreement and courier operating process. The storefront's existing delivery charge is not a live Pathao quote. Merchant delivery fees and return/cancellation charges remain subject to the Pathao merchant agreement.

## API routes
- GET `/api/admin/pathao/locations?type=cities`
- GET `/api/admin/pathao/locations?type=zones&city_id=…`
- GET `/api/admin/pathao/locations?type=areas&zone_id=…`
- GET `/api/admin/orders/{uuid}/shipment`: local durable record and eligibility.
- POST same route: accepts only numeric `city_id`, `zone_id`, `area_id`, `item_weight`.
- PATCH same route: refreshes an existing confirmed consignment from Pathao.

All routes require the signed admin session. Mutations additionally require matching Origin. Provider errors are not returned verbatim or logged because they may contain credentials or customer details. No unauthenticated public consignment lookup or provider webhook is implemented.

## Staging and reconciliation
1. Use a separate staging D1 and synthetic orders, never production customers/orders. Apply migrations 0001, 0002 and 0003 in order. Back up and inspect schema before any production migration.
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
- Official merchant page supplied by the owner: https://merchant.pathao.com/courier/developer-api (public extraction shows only a JavaScript shell; account-specific documentation not inspected).
- Primary source, Pathao's official integration: https://github.com/pathao-eng/courier-woocommerce-plugin/blob/main/pathao-bridge.php . Uses POST `/aladdin/api/v1/external/login` with client ID/secret, `access_token`, production `https://api-hermes.pathao.com`, sandbox `https://courier-api-sandbox.pathao.com` and geographic endpoints.
- Primary prepaid payload source: https://github.com/pathao-eng/courier-woocommerce-plugin/blob/main/plugin-api.php . Paid orders collect zero COD.
- Secondary compatibility reference: https://github.com/shahria7k/pathao-courier/blob/main/pathaodocs.md . Tracking GET `/aladdin/api/v1/orders/{consignment_id}/info`, recipient bounds and response fields. These details require official merchant/sandbox confirmation.

No provider guarantee of `merchant_order_id` idempotency was verified. Treat even HTTP 401/4xx/5xx after the booking POST as needing reconciliation rather than replaying it. The local claim is the duplicate-prevention mechanism, not an assumed provider guarantee.
