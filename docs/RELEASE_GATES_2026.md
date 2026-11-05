# BNP release gates — 2026-11-05

## Status
The new admin Pages Functions and D1-backed order view are proposed in PR #23. A successful GitHub Actions build **does not deploy** the app. Payment settlement is intentionally unimplemented. **No payment-enabled public launch until the gates below pass.** Treat any currently deployed checkout with no persistent orders as unsafe for real transactions.

## Site architecture
- Next.js `output: "export"` produces `out/` for the storefront and admin HTML.
- Cloudflare Pages Functions handle `/api/*`, and `functions/admin/_middleware.js` gates static `/admin/*` views. Do not rely on Next server middleware for a static export.
- D1 binding must be named `DB`. This is separate from legacy MySQL code in `lib/db.ts`.
- Configure Cloudflare Pages Functions to fail **closed** when the Functions invocation quota is exceeded. Otherwise a static admin page must never be publicly served on a function fail-open.
- Confirm both domain routing and HTTP-to-HTTPS redirect before a staging or production release.

## Cloudflare staging setup
1. Confirm the **actual** Cloudflare Pages project connected to `Maijied/BNP`, production branch, and build output directory `out`; inspect its current settings before editing.
2. Provision a *new staging D1* database. Set Pages binding `DB` to the correct **staging** D1 instance; create a separate production binding later.
3. Apply `migrations/d1/0001_orders.sql` then `0002_admin_login_attempts.sql` to staging. Confirm all table/index metadata, and check retention/backup/recovery.
4. Configure **encrypted** Pages secrets `ADMIN_EMAIL` (valid email), `ADMIN_PASSWORD` (unique 16+ character random passphrase), and `ADMIN_SESSION_SECRET` (random 32+ characters), separately for preview and production. Never put their values in Github, pages, logs, or browser-exposed variables.
5. Deploy the staging branch only after CI succeeds. Smoke test anonymous admin redirect, valid login, wrong-password rate limit, cookie tampering, CSRF/origin rejection, expiry, logout, D1 order read (empty-state and real staging fixtures), and allowed fulfillment transitions. Also test protection of `/admin/orders.html` and `/admin/settings.html` static-export paths under Cloudflare Pages; if bypassable, deploy a robust path-based access gate before going live.
6. Independently enforce Cloudflare WAF rate limits for `/api/admin/login`. D1 login-attempt storage reduces brute force but is not a WAF replacement.
7. Use a separate staged checkout toggle and prohibit any successful payment attempts until durable order creation, verified webhook signatures/replay defense, bridge order reference and amount/currency matching, deduplication, and refund/error scenarios pass against LoraHost's **actual** webhook contract.
8. Verify current official regulatory standards before claiming BRTA compliance, and secure customer registration documents in private storage with retention controls.

## Production approval
- Required Github CI is green on the intended merge SHA and Cloudflare staging smoke tests pass.
- Required Cloudflare credentials, D1 binding, zone/DNS ownership, deployment token, security settings and production migration plan are confirmed.
- Verified payment settlement and durable transactions, admin auditing, privacy handling, incident response and backup/restore exercise pass.
- Explicit approval of public checkout and staged production cutover.

## Creative pipeline
Adobe Firefly hero art and HeyGen 5-second 1080p conceptual motion have been created outside the GitHub repo. They require licensing/rights and visual QA, compression/optimized formats, source permanence, reduced-motion fallback, performance testing, responsive review and approved asset ingestion before use in a public site. Do not hardcode time-limited export links. Higgsfield video generation was blocked by plan entitlement and Canva design creation was blocked by team administrator settings. Preserve BNP as primary brand and Lorapok Labs as quiet footer credit.

## Release security note
Cloudflare environment values can be changed without code review; run the same staging review when changing secrets, D1 bindings or routes. Admin settings are currently read-only because changes are not persisted into the server-side order price path. Never present sample orders, mock payment receipts or an admin-modified payment status as real transactions.


## Pathao draft integration
See [PATHAO_INTEGRATION.md](PATHAO_INTEGRATION.md) for the prepaid courier implementation and owner setup. Apply staging migrations `0003_pathao_shipments.sql`, `0004_pathao_scope_webhooks.sql` and `0005_pathao_store_requests.sql` in order after the previous migrations. The BNP orders DB must remain single merchant/product. Production webhook event processing remains blocked pending confirmed schema. Checkout, settlement and real dispatch remain blocked until the payment and provider-contract gates pass. Never backfill settlement proof from paid flags.
