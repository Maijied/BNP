# Decorative nameplate customization v1

This is a versioned opt-in for a separately configured application. It does not
establish a final shop name, Vespa affiliation, vehicle fit, legal registration
use, commercial price, production tenant mapping or permission to deploy.

The fixed browser adapters are GET `/api/vespa/catalog` and POST
`/api/vespa/order`. They use only independently configured server settings:
`VESPA_PLATFORM_API_URL` (or `VESPA_PLATFORM_API_BINDING`),
`VESPA_PLATFORM_STOREFRONT_API_TOKEN`, `VESPA_PLATFORM_MERCHANT_KEY`,
`VESPA_PLATFORM_PRODUCT_KEY`, and `VESPA_PLATFORM_ENVIRONMENT`. There is no BNP
fallback or browser-selected scope. Reusing a configured BNP identity or token
fails closed. The SDK verifies the authenticated scope before any catalog/order
call. The token needs only `catalog:read` and `orders:create`.

Catalog output and order input/output otherwise match the parent API. A product
must have kind `decorative_nameplate` and public metadata
`{"customization_schema":"decorative-display-text/v1"}`. Only a scoped catalog
administrator can opt in. Unknown schema versions and incompatible product kinds
are rejected. The BNP application cannot opt in; its optional
`registration_bangla` contract remains unchanged.

Each decorative item requires exactly:

```json
{"schema":"decorative-display-text/v1","display_text":"DEMO RIDER"}
```

`display_text` is plain decorative text, not a legal vehicle registration number.
It must be a string, nonempty after trimming, no more than 60 JavaScript string
code units, with no C0 or C1 control characters (U+0000–001F, U+007F–009F).
Render it as text, never HTML. No extra customization keys are accepted.
Products without the opt-in cannot accept this schema; opted-in products cannot
accept an unversioned or registration-only customization.

Requests retain the existing UUID, catalog and shipping version guards, exact
integer prices, immutable snapshots, audit and unpaid-only state machine. An
exact retry resolves the original snapshot even if the current product's price,
version or customization metadata later changes. A changed payload with the same
UUID conflicts. Browser totals, customer-selected scope, payment flags and
unrecognized fields remain rejected.

Only `scripts/fixtures/vintage-shop.mjs` and the in-memory local mock seed the four
synthetic examples: `cream-enamel`, `charcoal-brass`, `brushed-aluminium`, and
`oxblood-ivory`. Their titles say DEMO and metadata contains `demo:true`,
`pricing_status:"sample"`, `catalog_status:"synthetic_sample"`, and
`fit_status:"unconfirmed"`. Prices are arbitrary sample integers, not quotes.
The demo shipping code is `demo`; initial product/shipping versions are 1.
No production seed, account, credential, payment, courier booking or deployment
is created. Missing independently configured service settings show unavailable.
