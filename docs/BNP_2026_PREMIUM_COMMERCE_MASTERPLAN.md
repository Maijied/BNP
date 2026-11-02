# BNP 2026 — Motorsport Premium Commerce Rebuild
**Research and implementation backlog | 2 November 2026**

> Status: planning/research only. No live payment activation, infrastructure migration, or production deployment authorized by this document.

## 1. Mission and creative direction
Build BNP (Bike Number Plate), a Joy & Arash Enterprise venture, into Bangladesh's premium front motorcycle registration plate commerce and manufacturing platform. Aim for the visual quality and conversion discipline of world-class motorsport commerce, **without claiming any official Formula 1, FIA, Yamaha or BRTA affiliation**. Proposed brand promise: **PRECISION YOU CAN SEE. COMPLIANCE YOU CAN TRUST.** The provided rider/helmet/motorcycle photography is inspiration only; licensed usage, model release, source resolution, and plate text accuracy must be confirmed before publication.

Audience: motorcycle and scooter owners facing front-plate requirements, dealerships, riding clubs, workshop installers, and fleet buyers. Primary conversion: compliant plate paid order. Secondary: verified B2B quotation. Use Bangla-first copy and an English switch.

### Visual identity
- Dark graphite/carbon base, polished stainless steel highlights, BNP performance red (#E11D2E), restrained warm gold details; blue only as a deliberate contrast in rider campaign imagery.
- No unlicensed F1 or auto manufacturer logos on the commercial interface. Refer to a **motorsport-inspired** visual language, not an endorsement.
- Typographic system: Sora or Space Grotesk for English, Hind Siliguri for Bangla; reserve a condensed display treatment for oversized headlines.
- Image direction: high-gloss reflective product macro shots, actual metal surfaces, studio-to-night-riding storytelling, authentic installation close-ups; no exaggerated or physically impossible fitment.
- Motion: subtle loading/metallic reflection, responsive 3D-like plate tilt, scroll reveals and restrained track-line accents. Support reduced-motion and low-end mobile devices.
- Deliverables: master wordmark and symbol, mono/negative versions, social avatars, favicon/SVG, OGP, six product renders, campaign hero, four ad variants (1:1, 4:5, 9:16, 16:9), email headers, staff cards, proposal/dealer deck.

### Homepage and IA
Home: legal update strip -> full-bleed rider/editorial hero -> prominent **Design your compliant plate** CTA -> product selector -> ultra-realistic configurable plate preview -> proof of dimensions/material -> transparent price -> verification and delivery -> reviews and maker story -> FAQ -> footer.
Routes: /, /shop, /products/motorcycle-front, /products/scooter-front, /design, /checkout, /orders/[reference], /track, /dealers, /about, /faq, /contact, /legal/*; /admin behind strict role-based authorization.
Mobile: sticky configurable CTA, 1-column fast checkout, camera-friendly document upload, easily accessible contact support.

## 2. Legal and compliance launch blocker
Bangladesh Road Transport Act 2018 s.16 requires vehicle registration number plates. News dated 16 October 2026 reports that BRTA directed owners to install manual **front** plates while existing rear BRTA-approved reflective RFID plates remain required. Reports dated 29–30 October indicate deadline extended from **15 November to 31 December 2026**. A 2 November 2026 BSS report describes a subsequent amendment empowering BRTA to specify alternative layouts/dimensions for front motorcycle plates. **Verify the primary circular/gazette with Bangladesh transport counsel or BRTA before freeze and keep all dimensions configurable rather than hard-coded in manufacturing logic.**

Reported baseline constraints (subject to current BRTA specifications): front motorcycle 285 x 50 mm; scooter 200 x 100 mm; stainless steel or aluminum; white background; black Bangla letters/numbers; glyph height at least 20 mm; no decorative graphics/slogans on road-use plates. Do NOT market decorative or mirror-finish products as legal registration plates without verifying they conform to current requirements. Keep “decorative/display-only” products clearly separated and conspicuously labeled as not for road use. Do not replace or imitate official rear RFID plates or claim to issue BRTA registrations. Preserve customer registration document confidentiality; collect only necessary evidence with consent and a retention/deletion policy.

Primary sources and recent coverage:
- Road Transport Act s.16: https://bdlaws.minlaw.gov.bd/act-1262/section-47868.html?lang=bn
- 16 October BRTA instructions: https://www.tbsnews.net/bangladesh/brta-makes-front-number-plates-mandatory-motorcycles-1574591
- 30 October deadline update: https://www.tbsnews.net/bangladesh/transport/brta-extends-deadline-motorcycles-display-front-number-plates-31-dec-1587396
- 2 November revised rules report: https://www.bssnews.net/news-flash/441057
- Validate latest authoritative BRTA notification and gazette as final arbiter.

## 3. Evidence from existing repo — reconcile before code changes
Repository: Maijied/BNP. Current package.json reports Next.js 14.2, React 18, TypeScript, Tailwind 3, Framer Motion, mysql2; scripts include build, Bengali transliteration test and crypto test. Existing `lib/lorahost.ts` creates server-side bridge checkout sessions and verifies HMAC signatures. Existing `docs/NEXT_PLANS.md` points to Cloudflare Pages + D1/R2, but earlier business specification mandates Vercel + cPanel MySQL. **Do not mix persistence implementations**; audit actual deployed Pages Functions, DB schema, admin sessions, order writes and environment before selecting one coherent production architecture.

Potential defects to investigate:
- `lib/lorahost.ts` currently simulates checkout success if client token absent, and signature verification contains mock bypass conditions when HMAC secret absent. Enforce a hard production fail-closed boundary, explicit non-production sandbox mode, tests ensuring mocks cannot activate in production.
- Payment 409 retries mutate the bridge reference; preserve canonical internal order ID and persist all bridge attempt IDs/references for reconciliation and idempotency.
- Split webhook secret naming in documentation: `LORA_WEBHOOK_HMAC_SECRET` vs `LORA_WEBHOOK_HMAC_TOKEN`. Standardize by actual bridge contract; support safe migration, not silent fallback.
- The requested admin payment bridge URL redirects unauthenticated visitors to super-admin login, so its private documentation has NOT been independently inspected. Securely obtain the exact internal contract, never use PayStation's direct merchant gateway.

## 4. Proposed full-stack architecture (decision required after audit)
Preferred **evolution**: Next.js App Router storefront + TypeScript, reusable design tokens/components + isolated checkout orchestration API + persistent database + private registration uploads + admin RBAC. For Cloudflare-compatible runtime, use documented Workers/Pages deployment with D1 and R2; if retaining current Node APIs (crypto, mysql2, Node-specific auth), prefer compatible server hosting + managed MySQL. **Do not assert Cloudflare Pages static export can run all Next server features.** Firebase is optional only if it resolves a demonstrable gap; don't introduce duplicate sources of truth or require a platform migration merely to use it.

Tables/entities:
- users/admins, roles/permissions, products, price_versions, rule_versions, plate_templates, registration_verifications, uploaded_documents, carts, orders, order_items, payment_attempts, payment_events, refunds, shipments, production_jobs, asset_versions, consent_events, audit_logs, notification_deliveries, support_tickets, dealer_accounts, inventory/materials.
- Money stored as integer BDT units; derived authoritative server totals, shipping price snapshot, taxes/discounts explicitly modeled.
- States: cart -> submitted -> awaiting_document -> awaiting_payment -> paid -> document_verified -> queued -> cut -> QC -> packed -> dispatched -> delivered; separate cancellation/refund branches. Every transition authorized, transactional and audit-logged.
- Uploaded registration docs private, short-lived signed download, encrypted storage, access records, admin masking and defined deletion schedule; never send full sensitive docs into public analytics, Discord or promotional automation.
- Product template dimensions/character height/material/legal claim associated with versioned compliance rules.

## 5. Execution backlog — checked means acceptance criteria, not claimed done

### P0 — Safety, legal and infrastructure (block public checkout)
- [ ] Audit deployed runtime, routes, Pages Functions/Next API, MySQL/D1 and existing migrations; produce architecture decision record (ADR) and rollback plan.
- [ ] Verify latest BRTA circular/gazette and dimensions/layouts with primary sources; review by local counsel/BRTA. Store date/version of approved specs.
- [ ] Separate BRTA-style compliant front plates from non-road-use display products and update misleading claims.
- [ ] Obtain scoped bridge sandbox credentials and authenticated LoraHost bridge documentation via authorized access; never expose credentials or scrape login forms.
- [ ] Restrict all mock payment paths to test runtime; production must reject absent or placeholder bridge/HMAC tokens.
- [ ] Implement verified server-side bridge session, canonical order ID -> attempt references, replay prevention, webhook verification on raw bytes, constant-time HMAC, deduplication, settlement reconciliation, timeout/retry handling. Never trust client-return status alone.
- [ ] Strict environment isolation: sandbox hostname, test orders, separate secrets and DB namespace; production checkout explicitly opt-in after gates.
- [ ] Enforce admin session security: cookie settings, CSRF protection where relevant, rate limits, MFA for privileged actors, RBAC, secure secret rotation.
- [ ] Add CI gates for dependencies, typecheck, lint, unit tests, Bengali parsing, HMAC/signatures, webhook spoof/replay, e2e checkout, accessibility and production build. No deploy from failing CI.

### P1 — Premium sales experience
- [ ] Design tokens, accessible component library and production-ready brand kit (Figma/Canva/Adobe source exports).
- [ ] Homepage 3 responsive art directions: Carbon Pit Lane, Silver Precision, Night Circuit. User-test legibility, speed and trust.
- [ ] Build Bengali/English compliant designer with motorcycle/scooter templates, mm-accurate responsive aspect ratios, verified registration typography, validation and print-safe CAD preview.
- [ ] Build product detail pages, transparent tiered pricing, brackets, delivery quotes, stock/lead time, service guarantee and written FAQs.
- [ ] Fast mobile cart/checkout with guest purchase, documented upload alternative, inline form error summaries and accessibility.
- [ ] Payment states: pending, confirmed, failed, expired, duplicate, manual-review; customer order tracking and receipts.
- [ ] Integrate validated courier API (Pathao/Steadfast as supported) and delivery confirmation with idempotency.
- [ ] Add genuine, permissioned testimonials and FAQ structured data; enforce accuracy of reviews and claims.

### P2 — Operations and growth
- [ ] Admin dashboard: sales funnel, payments, order queues, proof verification, maker checklist, stock, daily revenue and audit trail.
- [ ] Secure SVG/DXF 1:1 output; Bengali glyph outline and hole-placement tests against approved physical samples; operator approval before cutting.
- [ ] Service emails/SMS/WhatsApp templates with delivery logs and consent (order received, document needed, payment, QC, shipped, delivered, refund).
- [ ] Dealer/B2B quotation portal with permissioned wholesale pricing and invoicing.
- [ ] SEO technical hygiene, Search Console, image optimizations, performance metrics, consent-respecting analytics and Bengali keyword pages.
- [ ] Influencer/creator outreach with licensing/disclosure and content performance measurement; no fabricated endorsements.
- [ ] Sales materials: master deck, dealer one-pager, company profile, buyer FAQ, compliance explainer, social calendar, reusable design template.

## 6. UX deliverables / acceptance tests
1. User lands on mobile and understands compliant front plates, price, deadline/status and how to order within one viewport.
2. User can type `Dhaka Metro LA 12 3456`, see a correct Bangla registration preview, switch bike/scooter and still validate correctly.
3. User can review a verified material/dimension proof and an accurately calculated final total before paying.
4. Failed or abandoned payments do not cause production jobs; duplicate webhook cannot create duplicate paid transactions; forged returns do not mark paid.
5. Workshop staff can only view assigned order data, verify uploaded document and download correct revisioned cutting files.
6. A customer can track shipment without needing admin access or exposing registration documents.
7. Test on low-end Android, 360px viewport, keyboard only, Bangla screen-reader traversal where possible; target WCAG 2.2 AA and Core Web Vitals.

## 7. CI/CD and release policy
PR previews with dummy records -> integration tests in separate sandbox -> security/BRTA copy approval -> manual staging acceptance -> reviewed production release with database migration backup and rollback. GitHub Actions must use least-privilege OIDC/secrets, protected branches, review checks, concurrency control and pinned actions. Track deployment SHA and feature flags. Verify DNS/domain and credentials outside repo. **Do not deploy or activate charges solely because a design PR passes CI.**

## 8. Brand and campaign asset production
The supplied photos contain a helmeted rider in blue Yamaha-branded apparel with a red bike and held license plates. Use these as mood references, not proof of permission to redistribute trademarks, model likeness or the plate registration numbers. Before public release confirm rights/consent, blur or replace real plate numbers, avoid suggesting official Yamaha endorsement, and distinguish a studio/motorsport campaign from a real compliant front-plate product photograph. For product images, photograph **the actual manufactured compliant plate** and mounting solution with 100% accurate Bengali typography.

Recommended media:
- Landing hero desktop 16:9 and vertical mobile 4:5; carbon-black background, red motion line, real chrome reflections.
- 1:1 plate macro detail, 4:5 comparison, 9:16 short-form, 1200x630 social share.
- High-contrast copy: “YOUR RIDE. OUR PRECISION.” with subcopy in Bangla, clear legal product specifications and CTA.
- Visual sign-off test: Bengali proofreading, source licensing, contrast, file size, mobile crop, negative-space CTA safety.

## 9. Research and tool assignments
- Parallel Search + Firecrawl: changing regulation, competitor and UI references, crawl existing public storefront, payment bridge publicly visible docs only.
- UX Pilot + Product Design: three alternative visual directions, usability maps and key funnel audit. Product Design's complete Work-mode workflow is not runnable from ordinary chat.
- Figma: component library, tokens, responsive layouts; Adobe/Canva: properly licensed photo treatment and campaign variations.
- Tailwind: source-level UI implementation; Template Creator: reusable brand artifacts after a final reference exists.
- Sales/Ahrefs/Heepsy: commercial positioning, discoverable Bangla SEO and real influencer fit. Avoid implying these services certify regulation.
- Send Postcard: optional printed promotional/thank-you postcards, **not** a transactional email or SMS system.
- LibreJustice primarily covers French/European legal research; it is not a substitute for Bangladesh statutes, BRTA guidance or qualified local advice.
- Presentations: deck production; GitHub: backlog and PR workflow.

## 10. Milestones and definition of live
**M0** verify legal + architecture + bridge contract -> **M1** design system and prototype -> **M2** storefront/DB/orders -> **M3** protected payment sandbox and admin -> **M4** production manufacturing/courier -> **M5** UAT, SEO, release. Prioritize legal front-plate conversion and end-to-end verified checkout above decorative animation.

**Production-ready only when:** verified current plate specs and legal claims; migration/rollback tested; no credential leaks or mock-payment success; confirmed webhook settlement and reconciliation; successful test orders/refunds in sandbox; verified admin RBAC; customer data retention and consent; 1:1 sample plate inspection; mobile/Bangla usability and speed; protected CI and monitored production errors.

## 11. Reference inspiration
- F1 website redesign emphasizes improved navigation, personalized experiences and mobile-first story/video: https://www.formula1.com/en/latest/article/formula-1-launches-new-website-and-personalised-mobile-app.1knZbPSCZ2tS2z6ADRn2Gs
- Official F1 ecommerce merchandising example (inspiration only, do not copy trade dress): https://usf1store.formula1.com/en/
