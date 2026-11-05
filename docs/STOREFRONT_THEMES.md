> Historical implementation, superseded by [separate Vespa and BNP experiences](SEPARATE_EXPERIENCES.md). The customer routes no longer import or expose the appearance switch.

# Storefront themes

Classic Carbon remains the initial/default theme. Motorsport is selectable from the appearance bar and follows the previously reviewed editorial motorsport concept: oversized italic typography, performance red, angular calls to action, steel-format cards and restrained motion. It is an independent BNP design, not an official Formula 1 theme or affiliation.

## Behavior

- Theme selection affects only storefront appearance, not the admin/API, product model, draft order or payment capabilities.
- Browser preference is stored under `bnp.storefront.theme.v1`. Unknown values or unavailable storage fall back safely to Classic. A selection still works for the current visit if persistence is blocked.
- The provider surrounds shared designer, pricing and order components without keying/remounting them. Changing appearance must not reset input.
- `lib/storefront-theme.mjs` owns the registry/default. `components/StorefrontTheme.tsx` owns selection. `components/MotorsportTheme.tsx` owns alternate navigation, hero, collection and editorial sections. `app/motorsport.css` scopes visual overrides to Motorsport.
- Core Classic component structure remains, with misleading payment, compliance, timing and fixed-discount claims corrected. Prices display only from a valid versioned `/api/catalog` product; an unavailable/ambiguous catalog is not replaced with an invented selling price.
- Payment integration is explicitly deferred. Neither theme may enable capture, mark a draft paid, authorize production or dispatch.

## Image and brand provenance

All original uploaded photographs remain unchanged. No generative edits, removal of creator marks, invented manufacturer branding or new mascot selection are used.

- `own-scooter-front.jpg`: uploaded `1000086741.jpg`, Library `libfile_6bcf3d4d33cc8191824d8f541776f2d7`.
- `own-scooter-wheel.jpg`: uploaded `1000086747.jpg`, Library `libfile_5608c1f3e7f88191a5f8b8eb5f1ac8b5`.
- `own-scooter-speedometer.jpg`: uploaded `1000086745.jpg`, Library `libfile_3aedd30b07cc819180eb621761a5d28e`.
- `own-vespa.jpg`: earlier owner-uploaded `1000086692.jpg`, Library `libfile_8dfb3684cf088191b342f8eef34dc83e`, showing the scooter and cat. The filename is historical; customer-facing copy does not misidentify visible Bajaj/Chetak branding.
- Owner portraits/details are fitted inside panels to preserve creator marks. The hero uses the new original front portrait. The cat photograph remains in the owner's restoration story.
- Supporting ivory/headlight imagery: Zooarman, Wikimedia Commons, CC0 1.0. Green Arcobaleno image: Corvettec6r, Wikimedia Commons, CC BY 4.0. Full source/license links and responsive-crop disclosures are present in the visible photo credits. These are editorial inspiration, not inventory or the owner's scooter.
- Lorapok logo and established caterpillar mascot use supplied original brand files, with dedicated clearspace. Unselected proposed mascot concepts are not included.

## Verification

Run `npm test`, `npx tsc --noEmit`, and `npm run build` after integration. If another local preview is serving `out/`, build in an isolated copy, not over the running preview.

Browser acceptance: default Classic; keyboard/radio switching; Motorsport hero and all image loads; original uploaded creator marks; mobile 360/375/768 px with no horizontal overflow; desktop 1440 px; change model/text/quantity/customer details then switch themes twice and confirm values persist; refresh persistence; denied storage; cross-tab updates; reduced motion; anchor scroll; repeated selections; no real payment or delivery activation. Inspect any later backend-adapter integration separately.

The local build is not a publication or deployment. Public source/image sharing remains subject to explicit approval.
