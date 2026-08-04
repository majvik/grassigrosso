# Contacts map visual regression — design

## Problem

After contacts CMS hydration, `map_embed_url` replaces the baseline JS Yandex map container with a cross-origin iframe. The baseline applied `grayscale(1)` to Yandex's internal `ground-pane`; that DOM is inaccessible inside the iframe, so the visual treatment disappears.

## Root cause

The hydrate gate verifies map count, tab switching, geometry, safety and URL isolation, but not the computed visual treatment. The iframe therefore preserved layout while silently losing the baseline map appearance.

## Scope

- Preserve the existing URL-only iframe security contract.
- Apply the baseline grayscale treatment to CMS iframe maps at the iframe boundary.
- Keep JS-map placeholders unchanged; they retain their internal ground-pane treatment.
- Audit contacts baseline slots, hooks, media and map tabs for adjacent regressions.

## Success criteria

- Every visible CMS map iframe computes to `filter: grayscale(1)`.
- Four tabs still select exactly one map within the existing container.
- Border radius, geometry, form/copy hooks, four office cards and all images remain intact.
- The hydrate DOM gate fails if iframe grayscale is removed.
