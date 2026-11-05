# Vespa and BNP: separate local experiences

## Corrected direction

Vespa is the main system containing the reusable APIs. BNP is the separate original woman/rider-photo storefront client. They are not appearance options within one customer journey.

Local preview routes are `/` and `/vespa` for the Vespa flagship, and `/bnp` for the BNP storefront. These routes are review conveniences, not approved final domains. The local preview does not decide production tenants, whether catalogs are shared, or whether real customer records are separated.

The existing `services/lorapok-api` and `services/pathao-api` retain their established internal names and contracts. No backend data, authorization scope, credential handling, prices, payment gates, or dispatch gates were renamed or weakened. BNP still uses server-side adapters; no browser credentials were added.

## Experience ownership

- `VespaExperience.tsx`: restoration-led flagship with original owner images, details, main-system explanation, and an explicit link to the separate BNP client. No plate form or storefront state provider.
- `BNPStorefront.tsx`: original rider photography, plate collection, designer, API catalog prices and the existing unpaid-request flow. Its state provider belongs only to BNP.
- `ExperienceMotion.tsx` and `experiences.css`: composited, decorative entrance/reveal/parallax/progress effects; explicit pause button; reduced-motion behavior; no appearance persistence, order state or forced scrolling.
- The prior `StorefrontTheme`, `MotorsportTheme` and `storefront-theme.mjs` files are dormant historical source. Neither route imports them. Previously saved theme preferences no longer choose the customer's site.

## Original photography

Original supplied bytes are preserved. `docs/bnp-photo-provenance.json` records the three recovered BNP rider images and SHA-256 identities. The studio and tunnel images appear in BNP; the existing original scooter photographs remain in Vespa. No new generative substitution, retouching, badge removal or inferred vehicle model was introduced. Responsive layout may size photographs but does not modify their source bytes.

## Mascots

Existing `lorapok-order-concierge-concept-v2.png` and `classic-rider-proposed.png` designs are used as local preview selections. This does not record approval of a final mascot variant. Original PNG bytes and transparency are retained.

Mascots sit in inline guidance, system/client handoff, request loading/unavailable/recorded states and a brand-credit moment. They do not cover hero imagery, move controls, imply that unpaid requests are paid, or fabricate chat/AI assistance. They are decorative where accompanying text already supplies the meaning.

## Preserved safety boundaries

Payment capture, production and paid dispatch remain disabled. A recorded request is unpaid. The full mock runner uses synthetic in-memory databases and blocks external requests. A static-only visual server deliberately reports API unavailability instead of inventing success. No deployment, source push, live purchase, courier booking, production migration or data remapping occurred.

## Verification

182 automated tests pass, including four new separation/photo/motion contract tests. Type checking and production static export pass. The loopback mock host passed its existing 17 startup smoke checks. Browser review is separately reported; automated source tests alone do not establish mobile visual quality, physical-device or screen-reader acceptance.
