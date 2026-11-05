# Lorapok Pathao service boundary

This is reusable **server-only source inside the BNP draft**, not a published package or a newly hosted service. BNP is its first consumer. No paid infrastructure, domain changes, secrets or deployments are included.

## Boundaries

- `functions/_lib/lorapok/pathao/service.js`: provider transport, credential isolation, token lifecycle, paginated stores, cities/zones/areas, merchant rate estimates, create-store, prepaid orders and tracking.
- `functions/_lib/lorapok/pathao/webhook.js`: documented integration challenge, shared-secret comparison, bounded JSON parsing, receipt fingerprinting and conservative display-status normalization.
- `functions/_lib/pathao.js`: BNP environment adapter and recipient/prepaid payload rules.
- `shipment-store.js` and BNP routes: BNP authentication, durable settlement/QC checks, atomic booking claims, shipment ownership and fulfillment policy. These are not part of the transport package.

The provider API never returns credentials/tokens in client metadata and accepts no arbitrary base URL. Only Pathao's sandbox and production hosts are supported. Client instances copy credentials and recheck token expiry for every operation, including reuse after expiry. HTTP redirects are rejected. Orders and create-store requests are never automatically replayed, including after 401, 500, malformed success, timeout or uncertain database response.

## Merchant/product isolation

Each service instance needs an immutable server-selected scope `{ merchant, product }`. Neither field may be populated from an unauthenticated request. Tokens are separated by scope, environment and credential fingerprint. Shipment records and store-request receipts carry that same scope; historical unscoped shipments are blocked until reviewed, not silently assigned to the current merchant.

**The BNP orders/settlement adapter is a single merchant/product database.** Existing orders and settlements do not have tenant columns. Do not connect multiple merchants or products to the same BNP `DB` binding. A future shared order backend needs tenant-aware ownership on every order/payment read and write, database constraints and authenticated tenant resolution. Scoped courier metadata alone is not sufficient. Separate products may reuse the source with separate credentials, order adapters and storage. This draft does not decide whether BNP's existing site and BNP.live share catalog, orders or administration.

## Tokens and persistence

`createPathaoService(config, { fetcher, tokenStore, now })` allows server-side injection. The token adapter must implement async `get(key)`, `set(key, entry)`, `delete(key)` and `withLock(key, operation)`.

The supplied bounded memory adapter shares one in-flight grant per key within an isolate, never evicts an active grant, and rejects new grants when its concurrency limit is full. It retains access/refresh tokens only in process memory; it is **not durable cross-isolate persistence**. No tokens are written to D1, logs or public configuration. Password grants use `/issue-token`; expired cached tokens use a refresh grant. Failed refreshes are suppressed for that cache entry's lifetime; cache eviction/restart or credential rotation may require a new password grant. A missing replacement refresh token is not assumed to extend an old token's validity.

A future durable adapter needs encrypted-at-rest token values, tightly scoped access, cross-isolate leases/fencing, rotation and secure deletion, implemented and reviewed before enabling it. No persistent credential access has been provisioned here.

## Store/rate/order contracts

- `stores(page)`: normalizes IDs, active/default flags and pagination. Pagination uses only locally constructed numeric paths; upstream URL fields are never followed with bearer credentials.
- `validateStore(id)`: verifies an active store owned by the authenticated merchant, with a bounded 20-page scan. An unverified or inactive store cannot dispatch. Large accounts beyond this bound need an explicit lookup design, not an automatic fallback.
- `rateEstimate(input)`: returns a whitelisted merchant fee in BDT after store and destination validation. It does not change checkout prices, create orders or establish payment proof. The provider final_price is used as returned, without subtracting discounts again. Merchant discount tiers, monthly caps and sorting/reset rules are variable account policy, not guaranteed customer discounts, and are not hardcoded. A quote is not assumed to include every tax, return fee or later charge; the current merchant agreement still applies.
- `createStore(input)`: one provider request, returning pending approval, not an active pickup store. The BNP admin API requires an enabled gate and a durable request UUID before calling it. There is no automatic store-creation UI or background creation.
- `createShipment(payload)`: transport requires zero collection. The caller must first own a durable booking claim and enforce verified payment/recipient rules. BNP enforces these in SQL, not browser flags.
- `tracking(consignment, merchantOrderId)`: verifies both identities before accepting provider status. Status normalization is for display only; unknown values remain unknown and never imply paid/delivered fulfillment.

## Webhook status

The exact integration event receives HTTP 202 and Pathao's documented response header without contacting Pathao or D1. Other events require the merchant-configured `X-PATHAO-Signature` value. This header is a shared secret, **not an HMAC signature**. The fixed integration response value is a public protocol constant, not that secret.

Delivery-event payload fields, event identifiers and ordering semantics were not supplied. Consequently, the route records only a deduplicated hash/event receipt and returns **503**, not a success acknowledgement, until a verified processor exists. Receipts are an audit, **not a replayable queue**: raw payloads and customer data are not saved. Do not enable production webhooks or subscribe to live events yet. Provider retry behavior remains unverified. Tracking is currently an explicit admin refresh.

Body reads are capped at 16 KiB and 7 seconds; an outer 8-second deadline covers parsing, verification and database work. A late DB write may finish after a timeout response; the scoped unique receipt key makes a repeated notification harmless. Handshake can be tested independently with the exact single-key body. Staging must still verify externally observed timing, certificate validity and reachability within Pathao's redirect limit.

## Future frontends

Use relative API paths and a trusted server adapter for each frontend. Existing site stays primary; BNP.live is intended as a separate slim frontend, not a redirect. The primary URL and shared-vs-separate data/admin decisions are unresolved. No DNS, deployment, cross-origin sharing, tenant onboarding, package publication or domain-ownership assumption is made by this change.

## Next stage: independent API backend and merchant rewards

The owner's latest direction is a separate reusable API service consumed by BNP frontends and future products, not each storefront containing the whole backend. This commit is an extraction step only: the transport is separated from BNP policy, but the current adapter still runs in BNP Pages Functions. **A separately deployed API backend has not been delivered.** Its hosting, authentication between products and service, credential vault/persistence, tenant-scoped order database, API versioning and migration/cutover require a separate implementation and deployment decision. No new infrastructure was purchased or deployed.

Merchant rewards must be added to that backend after validating dashboard/API sources. The provided account snapshot describes monthly sorted-order qualifying counts, tier thresholds at 50/100/200, route/weight-dependent discounts and a BDT 5,000 monthly cap/reset. These are unverified account-policy inputs, not hardcoded operational rules. The qualifying event schema, month/time-zone boundaries, reversals/returns, discount ledger and authoritative reward balances remain unconfirmed. Keep calculated projections distinct from provider-confirmed progress/rewards, and never subtract a reward again from an API final_price that may already include it. No reward counting or redemption is performed by this draft.

## Verification for this revision

- 73 mocked Node tests pass, including SQLite-backed ownership, payment proofs, store/booking claims, refresh lifecycle, malformed notifications, duplicate receipts and the actual eight-second webhook deadline.
- TypeScript, production build/static export, generated page checks and whitespace validation pass.
- Browser interaction/mobile visual QA did not run: bundled Playwright Chromium was unavailable and installed Chromium failed creating its process socket in the execution environment. Source review and a successful build are not browser acceptance.
- No live provider authentication, store creation, shipments, payments, credential provisioning, migration or deployment was performed.
