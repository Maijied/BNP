# Architecture and product intent

## Product boundaries

Vespa is the parent product experience; BNP is its separate rider-photo client storefront. Light/Dark switches belong to Vespa only and must not switch customers between brands. Local routes are preview conveniences, not an approved final domain or tenant map. BNP.live is intended as a separate slim frontend, not an automatic redirect; shared catalog/order/admin scope still needs an explicit decision.

Original supplied rider and owner-scooter imagery is preserved. CSS framing/depth does not make the Vespa photo a rotatable 3D vehicle model. Decorative plate lettering and mounted previews are illustrations, not physical fitment/manufacturing or legal-road-use proof. Existing mascot selections are preview choices, not a newly approved final mascot identity.

Current reference guides:
- `docs/SEPARATE_EXPERIENCES.md`: separate brands, original photos and motion boundaries.
- `docs/VESPA_THEME_RESTORATION.md` and `docs/VESPA_OWNER_DEPTH.md`: current Vespa Light/Dark and owner-photo treatment.
- `docs/REFERENCE_REBUILD_2026.md`: historical desktop/mobile concepts, media provenance and recovery checks. Some theme/tracking descriptions predate later changes.
- `docs/bnp-photo-provenance.json` and `public/images/themes/PHOTO_CREDITS.md`: image provenance/credits; font license is retained under `public/fonts/`.

## Runtime layers

1. **Next.js 14 frontend.** Static export generates `out/`. Vespa and BNP use separate experience components and scoped request adapters. Browser state stores draft/retry/receipt proofs for the same tab; secrets do not belong in browser variables.
2. **Cloudflare Pages Functions.** Thin server-only adapters, signed admin sessions and CSRF protection. `/api/order/status` and `/api/vespa/order/status` expose minimal unpaid receipt status using two private proofs. Order-number-only lookup remains unavailable.
3. **Parent Platform API** (`services/lorapok-api`). Independent Worker and Node entry points, authenticated tenant/environment registration, catalog/price ownership, immutable request snapshots, audit records and disabled payment interface. Tenant isolation does not provide a parent-wide super-admin console.
4. **Private Courier API** (`services/pathao-api`). Independent Worker/Node service, its own database and registry, encrypted tokens/provider data, exact-money quotes, conservative booking/reconciliation and rewards evidence. BNP consumes a thin server-only client. Missing evidence never means delivered, paid or earned.

## Database and configuration boundaries

- Pages `DB`: auth/receipt throttle storage. Relevant tables are migrations `0002_admin_login_attempts.sql` and `0006_receipt_status_attempts.sql`.
- Parent `PLATFORM_DB`: `services/lorapok-api/migrations/0001_commerce.sql`.
- Optional distinct `COURIER_DB`: ordered migrations in `services/pathao-api/migrations/`.
- Legacy MySQL/payment/shipment files are retained source, not proof of a working live payment or production path. Do not reuse an unidentified production database for auth tables.
- Pages deployment alone does not provision the parent API, databases, credentials, registrations, catalog or service bindings. Unconfigured APIs correctly return 503.

`docs/BACKEND_PROVISIONING.md` is the precise provisioning and acceptance runbook. `services/lorapok-api/wrangler.example.jsonc` is intentionally non-deployable without approved identifiers; it defines no custom routes or scheduled trigger and keeps gates false. `.env.example` files contain placeholders/demo defaults only and must never be used as real secrets.

## Deployment boundary

The repository's existing Cloudflare Pages workflow runs on pushes to `main` or explicit manual dispatch. It deploys Pages and Functions, not the parent commerce service. The current requested delivery is a separate branch only. Do not run a production workflow manually or move/merge that branch to `main` without new authorization.
