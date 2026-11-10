# Site-wide Responsive Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide every raster image with layout-sized AVIF/WebP/PNG `1x/2x` variants and replace missing catalog/product media, including SVG covers, with neutral gray slot-specific placeholders.

**Architecture:** A shared slot registry and Sharp generator own variant dimensions and deterministic names. React and legacy render helpers consume one responsive media contract; catalog feeds preserve source/fallback metadata instead of collapsing to a single AVIF. A static audit prevents new unresponsive raster consumers.

**Tech Stack:** TypeScript, React 19, Vite, Node.js, Sharp, Strapi 5, Node test/check scripts.

**Spec:** `docs/superpowers/specs/2026-11-10-site-responsive-media-design.md`

## Global Constraints

- Work locally only; no push, PR, remote deploy, or Timeweb mutation.
- SVG files are not rasterized.
- Catalog and product-page SVG slots use gray SVG placeholders; Davos media is never a fallback for another product.
- Raster outputs are AVIF, WebP and PNG at `1x/2x` and use real slot dimensions.
- Preserve current page structure, crop behavior and CMS consumer allowlists.
- New behavior requires regression tests that fail before implementation.

## Review Focus

- Missing CMS image: correct slot placeholder appears without layout shift.
- Original smaller than `2x`: generator does not silently upscale.
- Stale sidecar after replacing an upload: regenerated variants win.
- SVG source: remains SVG and uses SVG placeholder only on failure.
- Video poster: receives responsive raster variants without changing video behavior.

---

### Task 1: Media inventory, slot registry and generator

**Files:**
- Create: `src/media/responsive-media-slots.ts`
- Create: `scripts/generate-responsive-media.mjs`
- Create: `scripts/check-responsive-media.mjs`
- Modify: `package.json`
- Test: `scripts/check-responsive-media.test.mjs`

- [x] Write failing tests for slot uniqueness, exact `1x/2x` dimensions, all three formats, no SVG rasterization, no upscale and stale-output regeneration.
- [x] Run `node --test scripts/check-responsive-media.test.mjs` and record the expected failure.
- [x] Implement the slot registry and deterministic Sharp generator for `public/` and `strapi-catalog/public/uploads/`.
- [x] Generate neutral raster placeholders and desktop/mobile SVG placeholders for catalog/product slots.
- [x] Add `media:generate-responsive` and `check:responsive-media` scripts.
- [x] Run the phase test and `npm run check:responsive-media`.

### Task 2: Shared responsive render contract

**Files:**
- Create: `src/media/responsive-media.ts`
- Create: `src/components/ui/ResponsivePicture.tsx`
- Test: `scripts/check-responsive-picture.mjs`

- [x] Write failing contract tests for AVIF/WebP/PNG source order, `1x/2x`, dimensions, `sizes`, loading priority and full-source fallback replacement.
- [x] Run `node scripts/check-responsive-picture.mjs` and record the expected failure.
- [x] Implement URL/manifest resolution, HTML helper and React `ResponsivePicture`.
- [x] Implement catalog-only error fallback that swaps the complete source set.
- [x] Run the phase test and `npm run typecheck`.

### Task 3: Catalog and product page migration

**Files:**
- Modify: `src/catalog/catalog-product-gallery.ts`
- Modify: `src/catalog/catalog-hero.ts`
- Modify: `src/catalog/catalog-card.ts`
- Modify: `src/components/catalog-page/hero.tsx`
- Modify: `src/components/pages/ProductPagePrototype.tsx`
- Modify: `strapi-catalog/src/api/catalog/controllers/catalog-feed.js`
- Modify: `strapi-catalog/src/api/catalog/controllers/catalog-hero-feed.js`
- Modify: relevant catalog CSS modules/styles
- Test: `scripts/check-catalog-product-navigation.mjs`
- Test: `scripts/check-product-page-prototype.mjs`
- Test: `scripts/check-catalog-media-sidecars.mjs`

- [x] Extend tests to require responsive card/hero/slider/characteristics/material/poster media and gray raster/SVG fallbacks.
- [x] Run the affected checks and record expected failures.
- [x] Remove the five-item gallery truncation where still present and preserve single-image no-controls behavior.
- [x] Migrate catalog and product consumers to the shared media contract.
- [x] Replace Davos fallback constants with slot placeholders except for the actual Davos product fixture.
- [ ] Update feed serialization to expose complete variants without changing non-media product fields.
- [x] Run product, navigation and sidecar static checks; API/UI remain in the final running-services gate.

### Task 4: Site-wide raster consumer migration

**Files:**
- Modify: raster consumers under `src/components/pages/*`, `src/components/marketing/*`, `src/components/catalog-page/*`, `src/cookie-consent.ts`
- Modify: raster background declarations under `src/styles/*`
- Test: `scripts/check-responsive-media-consumers.mjs`

- [ ] Write a failing inventory test for raw raster `<img>` and CSS `url()` consumers, with a narrow documented allowlist.
- [ ] Run it and record the expected violations.
- [ ] Replace React consumers with `ResponsivePicture` and legacy consumers with the shared HTML helper.
- [ ] Replace raster CSS backgrounds with generated `image-set()` declarations.
- [ ] Preserve SVG icon consumers unchanged.
- [ ] Run the inventory test, page CMS hydrate tests and routing checks.

### Task 5: Full local verification and artifacts

**Files:**
- Modify: this plan with exact results and post-fix metrics
- Update generated media and local snapshots as required

- [ ] Run `npm run media:generate-responsive` and `npm run catalog:optimize-media`.
- [ ] Run all new/changed tests, `npm run typecheck`, `npm run check:catalog-api`, `npm run check:catalog-ui`, `npm run check:catalog-perf`, `npm run check:site-mode`, `npm run check:showcase-server`, `npm run check:showcase-ui`, and `npm run build`.
- [ ] Run `npm run strapi:sync-seed` and `npm run catalog:export-snapshot` after stopping local Strapi if catalog uploads/feed changed.
- [ ] Inspect `git diff` and generated media inventory for unintended changes.
- [ ] Record every command, exit code and test result below before marking complete.

## Execution Status

- Phase 1: complete
- Phase 2: complete
- Phase 3: complete (API/UI runtime smoke deferred to Phase 5)
- Phase 4: in progress
- Phase 5: pending

## Verification Log

2026-11-10 product/catalog media regression wave:
- Root cause: `ProductCoverPicture` received shorthand `useDavosFallback`, which always passed `true`; changed to `useDavosFallback={useDavosFallback}` and added static plus browser regression coverage.
- Product slider variants changed from `contain` to `cover` and force-regenerated without upscaling.
- Every full-feed gallery image now receives `catalog-card` variants, including deferred card slides.
- `npm run check:responsive-media` — passed, 8 slots.
- `npm run check:responsive-picture` — passed.
- `node scripts/check-product-page-prototype.mjs` — passed.
- `node scripts/check-catalog-product-navigation.mjs` — passed.
- `npm run check:strapi-responsive-upload` — 5/5 passed.
- `npm run typecheck` — passed.
- `CATALOG_API_BASE_URL=http://127.0.0.1:3000 npm run check:catalog-api` — passed.
- `CATALOG_UI_BASE_URL=http://127.0.0.1:5174 CATALOG_UI_TIMEOUT_MS=90000 npm run check:catalog-ui` — passed; now covers neutral non-Davos SVG, cover-fit product media and a real deferred second card image.
- `npm run build` — passed (web and Strapi); Strapi emitted the known non-fatal macOS preferences permission warning.
- Manual clean-browser evidence: Aspect uses `/media-placeholders/product-cover-desktop.svg`; its slider uses the generated AVIF with `object-fit: cover`; Davos card slide 2 loads a generated `catalog-card` AVIF without placeholder fallback.

### Task 6: Automatic Strapi upload variants

**Files:**
- Create: `strapi-catalog/src/extensions/upload/responsive-upload.js`
- Create: `strapi-catalog/src/extensions/upload/strapi-server.js`
- Test: `scripts/check-strapi-responsive-upload.test.cjs`

- [x] Add a failing regression test for automatic raster variant generation.
- [x] Generate all registered AVIF/WebP/PNG `1x/2x` slot variants after upload.
- [x] Regenerate variants after file replacement and remove stale outputs first.
- [x] Leave SVG/video untouched and refuse raster upscaling.
- [x] Run `npm run check:strapi-responsive-upload`, related media checks, typecheck and Strapi build.

Task 6 verification (2026-11-10):
- `npm run check:strapi-responsive-upload` — 5/5 passed.
- `npm run check:responsive-media` — passed, 7 slots.
- `npm run check:responsive-picture` — passed.
- `npm run typecheck` — passed.
- `npm run build --prefix strapi-catalog` — passed; expected sandbox warning for the macOS Strapi preferences file did not fail the build.
- `git diff --check` — passed.
