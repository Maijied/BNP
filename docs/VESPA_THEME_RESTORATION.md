# Vespa: two looks, one nameplate shop

## Source of truth

The restored Dark design comes from the earlier `bnp-vespa-separated/components/VespaExperience.tsx` and the corresponding `app/experiences.css`, verified against `vespa-separated-desktop.png`. Its original “OLD SOUL. NEW ENERGY.” hero, red accents, navy owner-scooter photography, story and three-photo detail gallery are retained. The former system-only destination has become a clear collection and personalization path inside the Vespa shop.

Light keeps the current cream/olive “Old soul. Your signature.” atelier layout and story. BNP remains a separate route and shop; these two modes do not switch between brands.

## State and safety

- The Light/Dark radios change Vespa appearance only. Light is the initial/default layout. The validated preference lives at `vespa.storefront.theme.v1`, separate from BNP.
- Both themes mount the same, unkeyed `VintageOrderStudio` at the same React-tree position. Catalog, selected finish, lettering, quantity, recipient, review, consent, pending request and receipt state therefore survive repeated appearance changes.
- The existing pending-request session storage and byte-identical retry behavior are unchanged. No new customer or draft data is written by the theme switch.
- Live lettering uses the entered text in the CSS specimen, exposes a polite accessible output, and uses subtle motion that stops under either reduced-motion preference or the existing Pause motion control. It is explicitly an illustration, not a physical proof or fitment confirmation.
- Existing Lorapok rider mascots remain inline in the studio and restored story. No testimonials were added. Owner photo bytes are unchanged.
- No API, payment, dispatch, production or intake configuration changed. A missing catalog stays unavailable; the existing configured demonstration flow permits only an unpaid sample record. Real orders are not enabled.

## Checks completed

- TypeScript: passed.
- All repository Node tests: 202/202 passed at this checkpoint.
- Focused Vespa theme and commerce checks: 15/15 passed.
- All existing Vintage flow logic checks passed, including interrupted requests, double clicks, malformed storage, catalog failures and immutable replay.
- Isolated production static build: passed in `/tmp/vespa-theme-qa`; the currently served review build was not touched.
- Original owner photographs match the earlier source byte-for-byte.

## Remaining visual review

The user was actively controlling the review browser, so no tab, focus, viewport or current preview was changed. Before publishing or replacing that preview, check both modes at desktop and mobile widths, native radio keyboard controls, repeated switches after entering lettering/quantity and during review, on-scooter mode, reduced motion and Pause motion. Verify no overflow and no focus loss. Then run the final integrated aggregate checks after concurrent BNP edits settle.
