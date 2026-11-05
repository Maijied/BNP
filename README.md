# Vespa system and BNP storefront

BNP ecommerce and the reusable Courier API are Lorapok Labs products. BNP is the initial storefront, with a number-plate designer and admin operations. Existing shop/entity credits are preserved; this draft does not establish domain or legal ownership.

## Separate local experiences

Vespa is the main system; BNP is its dedicated rider-photo storefront client. Review Vespa at `/` or `/vespa`, and BNP at `/bnp`. These are local preview paths, not final domain or tenant decisions. The customer sites no longer share an appearance switch. See [the separation and original-photo notes](docs/SEPARATE_EXPERIENCES.md).

## Current release status

**Not ready for payment-enabled launch.** Payment capture, verified settlement, production and paid dispatch are deliberately deferred. The parent API supports durable unpaid requests with server-owned catalog prices; intake is disabled unless explicitly configured. Order-number-only lookup remains unavailable; minimal receipt status requires both private receipt proofs and a configured durable throttle. Courier capabilities are disabled by default. Tests and successful builds do not deploy the app.

## Architecture

- Next.js 14 static export in `out/` for storefront/admin pages.
- Slim Cloudflare Pages Functions provide signed admin sessions/CSRF and fixed server-only adapters. Parent commerce owns catalog, prices and unpaid order state.
- Independent Lorapok Labs Platform API in `services/lorapok-api/` provides scoped catalog, immutable order snapshots, idempotent intake, status audits and a disabled payment interface.
- Independent, private Lorapok Labs Courier API in `services/pathao-api/`, with its own Fetch/Node runtime and database. BNP consumes a thin server-only SDK.
- Scoped API authentication, encrypted provider/token persistence, dynamic stores and geography, exact-money quote records, one-way booking claims, encrypted webhook inbox and read-only tracking reconciliation.
- Merchant reward evidence is separated from estimates. Missing provider policies/data remain unknown, never invented earnings.

Existing MySQL/payment files are legacy or incomplete paths, not proof of a working production payment system. The actual primary URL, deployment and BNP.live catalog/order/admin sharing still require confirmation. BNP.live is intended as a separate slim frontend, not a redirect.

## Local verification

Use Node 22 or newer:

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
node scripts/run-pathao-local.mjs --smoke
```

The last command starts an independent mock API on `127.0.0.1:8788` and a static-export/admin function adapter on `127.0.0.1:8789`, prints a synthetic demo login, runs smoke checks and stays running until interrupted. It uses in-memory test databases, no real provider credentials, and no external transactions. It is not a production host or complete Cloudflare emulator. `npm run dev` runs the Next frontend but does not by itself emulate Pages Functions.

For the separately configured Node service, `npm start --prefix services/pathao-api` requires its own existing migrated database and encrypted server configuration. No credentials or migrations are provisioned automatically. See the service architecture guide before enabling any gate.

## Documentation

- [Backend provisioning and remaining delivery gaps](docs/BACKEND_PROVISIONING.md)
- [Lorapok Labs parent commerce architecture](docs/LORAPOK_PLATFORM_API.md)
- [BNP prepaid integration and staging checklist](docs/PATHAO_INTEGRATION.md)
- [Independent Lorapok Labs API, security and contracts](docs/LORAPOK_PATHAO_SERVICE.md)
- [Release gates](docs/RELEASE_GATES_2026.md)
- [Historical deployment guide](docs/DEPLOYMENT_GUIDE.md) and [roadmap](docs/NEXT_PLANS.md), which may include superseded plans. Current source and release gates take precedence.

Do not place secrets in browser variables, chat, source control or logs. Product settings are in `.env.example`; independent API settings are in `services/pathao-api/.env.example`. Real persistent credential provisioning, infrastructure changes, migrations and deployment need separate authorization.

## License

Private and proprietary. Copyright © Joy & Arash Enterprise. All rights reserved.
