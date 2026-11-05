# Reference-led local rebuild, 5 November 2026

This work stays in a separate working copy. It does not alter the earlier user-controlled preview or mistakes snapshot. No publishing, merge, infrastructure provisioning, payment or courier transaction is included.

## Source of truth

- BNP first cinematic desktop concept: `exec-a6b5ef4f-4016-4077-896a-4bc90dfb2c27.png`.
- Revised Bangla desktop: `exec-762c8488-ed9a-45ec-8560-7108ea5e9eae.png`.
- Mobile discovery/customization/review: `exec-22b7748c-81cc-4fa7-9497-627a77a48110.png`.
- All are design references, not verified manufacturing specifications, prices, payment receipts or proof of a completed site. Later front-only labeling supersedes the first image's rear-plate label.
- Original HeyGen material study: video `93923561fca14c88a35e8f2c1d90bcac`, 1344×768,24fps, approximately5.26s. The original MP4 is preserved exactly; SHA256 `6f54e4685c8aee9cb781a5a7c8a5f4b8012defe3c3404acfdfcc166704401168`.
- Static original-frame poster is always available. The small Firefly rendition remains an archived material reference, not an upscaled hero substitute.

## BNP experience

The rider/tunnel photograph remains original bytes. Motorsport is the initial appearance for a new visitor; saved existing appearance preferences are honored. Classic Carbon reuses the earlier Hero presentation, with unsupported factual claims removed. Both appearances share the same guided shopping state and safe order logic. The classic hero retains historical English wording; the guided flow is Bangla/English.

The four visual stages are Plate → Details → Total → Order. The offline prototype's five screens map as follows: Product → Plate; registration and options → Details; delivery and price → Total; final review → Order. This preserves all fields without silently dropping the prototype's options or delivery step.

The integrated studio owns canonical registration fields, live preview, quantity/bracket, sample delivery, exact-price summary and editable review. Typing preserves the existing scale/blur stamp feedback. Total transitions animate only the exact current value, never fabricated intermediate payable values. A mobile sticky total/action uses the same handler as the ordinary form controls.

Collection and external studio actions lock when a request is pending, uncertain, conflicted or recorded. Language and appearance do not remount the studio. Pending requests retain their exact UUID/body in tab storage before sending. Storage failure prevents sending; a failed retry does not erase an earlier uncertain request. Current prices are not displayed as the original request's total. Malformed or inaccessible stored requests block submission rather than silently starting over. Catalog reads time out after 10 seconds; order requests after 15 seconds retain their exact payload and reference for retry. Paused/reduced motion is passed explicitly to Framer-driven hero, stamp and total animations, not only CSS. Stage navigation and validation errors scroll the studio into view before heading focus.

The actual cinematic clip is a separate material chapter supporting the rider story. It plays when visible without a continuous loop, is muted, supports pause/replay, keeps the poster on loading/error/autoplay failure, and does not load a video element for reduced-motion users. This is an implementation choice, not a claimed previously approved shot-by-shot storyboard. The clip is not looped because seamless looping has not been established.

## Vintage shop

The separate shop has its own cream/charcoal/brass visual identity, original owner's scooter as primary photo, four finish concepts, live decorative lettering, customer/delivery review and unpaid sample intake. A descriptive working title is used, not a claimed selected brand. All source concepts are retained unchanged. Materials, dimensions, mounting, model fit and road suitability remain unverified.

The sample vintage catalog uses an independent local application scope and fixed server-side adapter credentials. It never falls back to BNP. This demonstrates a safe local boundary, not the final production merchant/tenant/domain decision. See `services/lorapok-api/DECORATIVE_CUSTOMIZATION.md`.

## Preserved service boundaries

Existing catalog versioning, integer-poisha arithmetic, immutable order snapshots, audit records, server-only credentials, idempotency, admin sessions and versioned review/cancellation are preserved. The admin exposes truthful Pathao readiness; payment and paid dispatch remain unavailable. Courier provider code, zero-COD rules, proof checks, claims, location hierarchy, quotes and uncertainty rules are unchanged.

Customer tracking is not implemented. Its UI explicitly says so and does not send the entered reference or invent status. Legacy payment-success now shows unavailable rather than a fabricated verified payment/invoice. Real catalog prices, production scopes, live provider acceptance, legal specifications, document handling and release hosting remain separate gates.

## Verification

Run `npm test`, `npm run test:storefront`, `npm run test:bengali`, `npm run test:crypto`, `npx tsc --noEmit`, `npm run build`, and `node scripts/run-pathao-local.mjs --api-port 8794 --frontend-port 8795 --smoke`.

The hook-flow harness verifies state and request handlers using mocked React hooks, storage and network. It does not replace browser focus, viewport, playback, accessibility or visual comparison. Full desktop/mobile/browser acceptance must remain explicitly pending until an authorized usable browser is available.

Fonts: local condensed display font is DejaVu Sans Condensed Bold Oblique. Its redistribution notice is retained in `public/fonts/LICENSE-DejaVu.txt`. It is a practical local font choice, not a claim that the concept specifies that exact family.

### Earlier verified local build

- Build ID: `J6lKTFfDMReW2am0qMQ2M`.
- 196/196 Node regression tests passed, including commerce, scope boundaries, Pathao and payment deferral.
- 13/13 mocked-hook interaction checks passed, including four stages, draft preservation, duplicate clicks, reload retry, corrupt/denied storage, timeout, motion controls and stage focus requests.
- Bengali parser: 5/5 cases; cryptographic signature checks: 4/4.
- TypeScript and production static export passed (12 generated pages).
- 31 local HTTP smoke checks passed. These include both storefront routes, media MIME types, both unpaid sample order creations and exact retries, changed-payload conflict, cross-scope admin isolation, and unauthenticated/authenticated dispatch rejection.
- The complete Pathao service tree and shipment adapter/storage files match the preserved earlier preview byte for byte. No provider calls or real customer records were used.

### Still open

The new build has not received desktop/mobile visual or real-browser acceptance. Isolated Chromium startup failed with OS socket/ptrace restrictions; the shared browser remains under the user's control and was not touched. Static markup, hooks and HTTP checks do not establish actual viewport fit, animation playback, focus, keyboard/screen-reader behavior or final visual resemblance. Compare the new export against both heart-reacted desktop references and the mobile reference when the browser is released.

The user's new cute Lorapok-wide login request remains separate and unimplemented pending its target/layout. The existing protected BNP admin login/authentication remains intact. Production brand selection, catalog/specifications, final domains and tenant mapping, live Pathao/provider setup, customer tracking, payment, legal verification and publishing also remain open. This deliverable is a local unpaid preview, not a production launch.


### Independent recovery checks, 5 November 2026

Current local build ID: `RcTR1aLYj2sF6_twwHa8C`. The earlier delivery archive remains unchanged; this working copy now includes four small corrections found by additional logic checks:

- BNP verifies that its pending request can be read back exactly before sending. Storage denial or a silently dropped write now stops submission and requests a reload after storage is enabled.
- Vintage validates every saved request field needed for rendering and replay. Malformed references, customer fields, quantities, customization or catalog versions remain preserved in storage but block submission rather than entering the interface.
- Vintage formats integer-poisha totals exactly with integer arithmetic, including the safe-integer boundary, without losing a poisha to floating-point conversion.
- Vintage applies the API's five-character minimum sample-address length and 100-character district limit before review.

The four added interaction checks failed against the prior source and pass with these corrections. Final results: 196/196 regression tests, 17/17 mocked interaction checks, 5/5 Bengali cases, 4/4 cryptographic checks, TypeScript and the production export pass. All 31 synthetic HTTP smoke checks pass. All 217 statically exported internal asset/link references resolve locally. Original photos, concept assets, video, server functions and both API service trees still match the prior manifest byte for byte.

This remains logic, source, export and loopback-HTTP verification. It does not close the browser/viewport/animation/accessibility acceptance gate, the separate Lorapok login request or any production gate. No shared browser, deployment, public upload or external provider transaction was used.
