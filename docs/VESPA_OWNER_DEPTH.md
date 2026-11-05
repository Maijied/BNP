# Owner-photograph depth study

## Scope

Both Light atelier and Dark Old Soul heroes use the owner's original rear three-quarter scooter photograph. The scooter, cat, helmet, paint, stripes, chrome and Bengali plate retain their original pixels. The original image can be opened from the hero caption. The front-detail, wheel and instrument photographs remain in the story/details sections.

The presentation adds a shallow photographic plane, warm/cool backplate, edge light and contact shadow. Mouse movement tilts the whole photo by at most 1.25 degrees vertically and 2 degrees horizontally. This is a 3D illusion on a photograph, not a rotatable scooter model or isolated-object cutout. The roadside background remains.

A background-extraction candidate was tested using image generation but rejected because it subtly redrew details and reconstructed a bumper edge. It is not referenced by this implementation.

## Framing and motion

The image window shows the bottom 1500 pixels of the 2048-pixel original, trimming 548 pixels of empty upper sky. The highest scooter mirror is below that boundary. No additional scooter geometry is cropped; the tiny bumper edge already clipped by the original photograph remains as photographed. Mobile stacks the complete subject view below the heading instead of squeezing it behind text.

Navigation and the theme switch retain higher stacking priority than the photographic plane. Touch pointers never drive tilt, coarse-pointer devices suppress the transform, and both operating-system reduced motion and the existing Pause motion control remove it. The shallow scroll drift is also suppressed. No controls are hidden behind the photograph.

## State and safety

The stable, unkeyed VintageOrderStudio stays at the same tree position. No API, intake, sample-request, payment, fulfillment, storage or production settings changed. Story and sample-only order behavior remain intact.

## Executed checks

- TypeScript passed.
- 18 focused Vespa depth/theme/commerce tests passed.
- An isolated production export in `/tmp/vespa-depth-qa` passed.
- The owner photo SHA-256 matches the previous untouched shop: `bba19d71ced61889bf4d2c48c7ba068b4e9f7a9d3433554155c0885b91a98cb4`.
- Logs are in the sibling `vespa-depth-verification` directory.

Final integrated browser review is still required at desktop/mobile sizes, in both themes, after concurrent preview edits settle. No deployment was performed for this change.
