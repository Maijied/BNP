# BNP D1 Order Foundation — implementation decision (draft)

This branch adds a **staging-first D1 schema only**, not a deployed payment system. Cloudflare Pages Functions are present in the repo and Next is configured with `output: "export"`; the legacy MySQL migration scripts are also present. This does **not** prove which DB is currently active in production. Before binding D1, inspect the actual Cloudflare project settings and existing order data, and prepare an export/rollback.

## Migration and binding
1. Create a NEW staging D1 database under the BNP Cloudflare account; do not modify live bindings.
2. Apply `migrations/d1/0001_orders.sql` to staging, review constraints and index performance.
3. Configure a staging Pages D1 binding named `DB` and test that `env.DB` is present; keep production bindings untouched.
4. Implement the order service with server-generated UUIDs and references, versioned product prices, transactionally inserted order + items + payment attempt, and no simulated paid status.
5. Obtain the authenticated LoraHost payment bridge webhook contract. Verify the signature over raw body, timestamp/replay protection as specified, canonical reference, amount and currency. Deduplicate by unique bridge event ID and perform settlement and status transition transactionally. Return 2xx only after durable processing (or a recognized duplicate); 5xx on transient failures.
6. Implement a least-privilege authenticated admin order API and a customer lookup using a strong opaque tracking token, not a guessable order number alone.
7. Add staging tests for replay, forged webhook, wrong amount, wrong order, duplicate callback, race conditions, cancellation, refunds and transient DB failures.
8. Enable checkout only after integration, security review, backup and rollback are tested. **Never merge the interim fail-closed PR as a standalone production feature.**

## Data handling
Registration numbers and customer address/phone are sensitive. Avoid placing them in LoraHost metadata unless required. Registration documents belong in private object storage, with signed, expiring admin access and a deletion policy. No credentials in GitHub. No actual BRTA-compliance claims without verified current rules.

## Out of scope
This migration does not wire payment webhooks, create a Cloudflare database, configure credentials, or deploy production. The schema is a foundation for the next implementation PR.
