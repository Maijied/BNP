# BNP / Vespa complete-source handoff

Snapshot prepared 5 November 2026 (UTC). This folder is the current handoff index; older design and test documents are historical checkpoints and may describe superseded layouts or lower test counts.

## Delivery scope and status

The requested delivery is **one separate review branch containing all completed source, assets, this summary and remaining tasks**. Do not push this work to `main`, merge it, trigger production deployment, or change DNS as part of that handoff. A downloadable source archive is a fallback, not evidence that a branch was pushed.

- Reported remote `main` baseline: `8d08831be185c8dabe5dc72a5b8c36780ff16265` (`8d08831`). This was independently observed by the deployment review, not fetched by the packaging step.
- Local checkout HEAD: `c800a4204e399bc77ad6ebba86d8bf0754454e65` (`Snapshot PR 23 source for local validation`). Completed staged and unstaged work is included as current working-tree bytes, including previously untracked source/assets. This is not a Git-history export or proof that the local HEAD descends from the remote baseline.
- Remote branch publication, exact remote commit identity and CI must be verified separately. No main/deployment success is claimed here.
- The source snapshot is a point in time. Work continuing after packaging will not appear in this archive; its manifest identifies the exact packaged bytes.

## Completed work

- Separate Vespa flagship/nameplate experience at `/` and `/vespa`, with BNP's original rider-photo storefront at `/bnp`.
- Vespa Light atelier and restored Dark “OLD SOUL. NEW ENERGY.” appearances, stable shared personalization/request state, owner-photo depth presentation, original scooter details and decorative lettering preview.
- BNP guided Plate → Details → Total → Order flow, original photography, cinematic material video/poster, mounted-plate illustration, bilingual guidance and inline mascots.
- Honest sample-only confirmation, clear next steps and a private receipt-status refresh. A saved receipt is unpaid and is not courier tracking or a payment confirmation.
- Interrupted-request recovery with exact idempotency payload/reference replay, duplicate-click protection, unavailable-catalog handling and safe storage failures. Integer-poisha totals remain exact.
- Server-owned catalog, versioned prices, immutable unpaid request snapshots and authenticated admin review/cancellation through the scoped parent commerce API.
- Independently scoped Courier API, merchant/store/geography and quote contracts, encrypted provider/token persistence, dispatch claims, webhook admission, read-only reconciliation and separate rewards evidence. Live provider acceptance is not established.
- Private receipt lookup requires both original request UUID and server-generated order reference, isolated by merchant/application/environment, expiring after 30 days. Pages applies a durable atomic 20-attempt/15-minute/IP/shop limit and fails closed if configuration or schema is absent.
- Deployment templates, provisioning runbook, release gates and automated regression/flow checks.

## Safety boundaries

**No real customer orders, payment capture, settlement, production, courier booking/dispatch, remote migrations, provider calls or DNS changes were performed for this package.** Production readiness is not established. Intake and courier capabilities remain disabled unless separately configured. Local smoke fixtures are synthetic and in-memory. Do not turn on payment or dispatch gates to make a demonstration appear complete.

See [architecture](ARCHITECTURE.md), [verification and local run instructions](VERIFICATION.md), and [remaining work](REMAINING_TASKS.md). Detailed implementation references remain under `docs/` and `services/`.
