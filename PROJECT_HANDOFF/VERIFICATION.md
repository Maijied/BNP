# Verification and safe local use

## Snapshot checks

Freshly rerun immediately before packaging:
- `npm test`: **221/221 passed**, 0 failed/skipped/cancelled.
- `npm run test:storefront`: **25/25 logic checks passed**.
- `git diff --check`: passed.

Implementation owners additionally reported TypeScript and the production static export passed for their completed edits. Packaging does not treat those reports as a fresh integrated browser check. Earlier documents list smaller historical suites. Full integrated browser layout, playback, keyboard/focus, screen-reader and mobile acceptance remain open.

Archive checks: a per-file SHA-256 manifest and archive integrity test identify the packaged bytes. Source is checked for known private-key/token formats and credential-bearing URLs; expected synthetic test fixtures are reviewed separately. Pattern scans are a bounded safeguard, not a guarantee that arbitrary sensitive data can always be detected.

## Run locally

Use Node.js 22 or newer, including built-in SQLite support required by the synthetic fixtures. From the extracted project root:

```sh
npm ci --no-audit --no-fund
npm test
npm run test:storefront
npm run test:bengali
npm run test:crypto
npx tsc --noEmit
npm run build
```

Dependencies are not bundled. `npm ci` needs access to the configured package registry. The source archive excludes `.git`, dependency folders, generated builds, cache, real environment files, credential files and unrelated internal tooling artifacts.

For a local synthetic end-to-end preview after building:

```sh
node scripts/run-pathao-local.mjs --api-port 8794 --frontend-port 8795 --smoke
```

Open `http://127.0.0.1:8795/` for Vespa or `/bnp` for BNP. The runner prints synthetic local admin-login details. It uses in-memory databases and a fake provider, blocks external requests and stays running until interrupted. Stop it with Ctrl+C. Do not reuse its demo tokens/passwords outside local testing. This is not a production host or full Cloudflare emulator.

`npm run dev` starts the frontend but does not itself implement the Pages Functions/parent API. A missing live catalog is correctly unavailable rather than fabricated.

## Scope not verified

No current remote branch push, branch CI, production deployment, parent binding, live catalog, real provider acceptance, customer shipment tracking, payment settlement or DNS result is established by these checks. Local synthetic requests and HTTP smoke tests do not prove live merchant readiness.
