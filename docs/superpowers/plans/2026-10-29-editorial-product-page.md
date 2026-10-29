# Editorial Product Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompose the existing catalogue product route as an editorial, image-led Grassigrosso product page while preserving every existing product control and future commerce placement.

**Architecture:** Keep the existing route, catalogue data and gallery controller. Change only the product-view HTML composition in the listing controller and its scoped CSS, then lock the layout and retained controls with the existing browser smoke tests.

**Tech Stack:** TypeScript, DOM templates, CSS, Node browser smoke scripts, Vite.

**Spec:** `docs/superpowers/specs/2026-10-29-editorial-product-page-design.md`

## Global Constraints

- Work locally only; no push, deploy or remote mutation.
- Preserve current product URLs and all manager/favourite/share controls.
- Never restore a quick-view modal.
- Do not introduce price, cart runtime or new CMS consumer zones in showcase mode.
- Reuse the current gallery controller and catalogue data contract.

## Review Focus

- One-image products must still render a stable wide media stage without broken carousel controls.
- Long product names and long size/spec values must wrap without horizontal overflow.
- Mobile at 390px must remain a single readable flow.
- Gallery interaction and active-index synchronization must survive the DOM reordering.
- Future primary commerce action must have a page-only insertion point without exposing commerce now.

---

### Task 1: Lock the editorial product-page contract

**Files:**
- Modify: `scripts/check-catalog-ui.mjs`
- Modify: `scripts/check-showcase-ui.mjs`

**Interfaces:**
- Consumes: existing `/catalog?product=<slug>` DOM and catalogue browser harness.
- Produces: assertions for masthead, full-width stage, information band, retained controls and responsive layout.

- [x] **Step 1: Add failing browser assertions**

Assert that the product page has `data-product-editorial`, a masthead before the media stage, a separate information band after it, the future action slot, cinematic desktop media, and a single-column mobile information band.

- [x] **Step 2: Run tests to verify RED**

Run: `npm run check:catalog-ui && npm run check:showcase-ui`

Expected: FAIL because the editorial landmarks and cinematic layout do not exist yet.

### Task 2: Implement the editorial composition and responsive styling

**Files:**
- Modify: `src/catalog/catalog-listing-controller.ts`
- Modify: `src/styles/catalog-page.css`

**Interfaces:**
- Consumes: `buildCatalogProductMediaHtml`, `buildSharedProductSpecSegmentsHtml`, existing `data-shared-product-*` hooks.
- Produces: editorial product DOM with `data-product-editorial`, `data-product-media-stage`, `data-product-info-band`, and `data-product-primary-actions`.

- [x] **Step 1: Recompose `renderSharedProductView()`**

Move title/tags into a masthead, keep the existing gallery as a dedicated stage, and move specs/actions into an asymmetric information band. Preserve all existing behavioral hooks and add an empty future-commerce slot inside the primary action region.

- [x] **Step 2: Add scoped desktop/tablet/mobile styles**

Make the media stage cinematic and dominant, constrain text measures, use an asymmetric information grid on desktop, and collapse it to one column at mobile widths without altering catalogue card styling.

- [x] **Step 3: Run focused tests to verify GREEN**

Run: `npm run check:catalog-ui && npm run check:showcase-ui`

Expected: PASS.

### Task 3: Verify the complete local gate

**Files:**
- Update: `docs/superpowers/plans/2026-10-29-editorial-product-page.md`

**Interfaces:**
- Consumes: completed product-page implementation.
- Produces: recorded local verification results.

- [x] **Step 1: Run static and integration gates**

Run: `npm run typecheck && npm run check:catalog-api && npm run check:catalog-ui && npm run check:showcase-ui && npm run build`

Expected: PASS.

- [x] **Step 2: Perform local visual smoke**

Verify desktop and 390px mobile views for `/catalog?product=orient`, including gallery navigation and all retained actions.

- [x] **Step 3: Record exact results in this plan**

Append the commands and observed outcomes; do not claim completion for any skipped or failing gate.

## Verification record

- RED: `npm run check:catalog-ui` failed on the missing editorial desktop and mobile landmarks before implementation.
- GREEN: `npm run check:catalog-ui` — PASS (`Catalog UI smoke ok`).
- Tablet regression: the first 768px run failed on the cramped two-column information band; the breakpoint was moved to a single-column editorial flow and the rerun passed.
- Client correction RED: the first editorial composition failed the required order and content density. The updated contract requires gallery before masthead, zero specification tabs, two always-visible spec groups, no filler action copy and at least three secondary media-wall items; the old implementation failed and the corrected implementation passed.
- Client correction RED 2: the loose asymmetric media wall and multi-column information band failed the clarified bento contract. The final implementation uses explicit `main/top/bottom/wide` bento areas, removes both service labels, and stacks characteristics, filling and actions at full width. Catalogue and showcase UI tests pass, including products with fewer gallery images.
- Browser-note correction: tags now have a dedicated vertical gap; favourite and icon-only share controls moved into the masthead opposite the title; the share-help trigger was removed; characteristic labels use a bounded 140–220px track with flexible wrapped values. Typecheck, API, catalogue UI, showcase UI and full build pass.
- Final visual correction: characteristic/value pairs are compact vertical stacks with no row, section or action dividers; the manager CTA has no underline. The bento wall now promotes a close/detail frame to the dominant tile and applies slot-specific edge-to-edge crops, avoiding the baked-in white margins of the product cut-outs while retaining equal gutters.
- Final spacing correction: characteristics and filling use a two-column desktop grid (single column at the existing responsive breakpoint); the CTA keeps one intentional divider. Bento items stretch to their complete CSS grid rows, so row and column gaps now use the same value with no unused vertical grid space.
- GREEN: `npm run check:showcase-ui` — PASS (`Showcase UI: download CTA present; smart selector and all price surfaces absent`).
- `npm run typecheck` — PASS.
- `npm run check:catalog-api` — PASS (`Catalog API ok`).
- `npm run build` — PASS: Vite production bundle and Strapi TypeScript/admin build completed locally. One repeat hit a transient concurrent `dist/cookie-mascot` cleanup race; after the prior process released the directory, the clean rerun completed.
- Visual smoke: desktop viewport confirmed oversized masthead + cinematic gallery; 390×844 confirmed one-column flow, gallery dots, wrapped specifications, manager CTA, favourite and share controls without horizontal overflow.
- Final gate (after the visual correction): `npm run typecheck` — PASS; `npm run check:catalog-api` — PASS; `npm run check:catalog-ui` — PASS; `npm run check:showcase-ui` — PASS; `npm run build` — PASS; `git diff --check` — PASS. The first integration attempt correctly failed while the local API/Vite processes were stopped; services were restarted and the complete relevant gate was rerun successfully.
- Final gate after two-column/equal-gap correction: the same commands all passed again; catalogue UI regression coverage now asserts two desktop spec columns, equal bento row/column gaps, row-filling tiles and the CTA divider.

---

### Task 4: Separate product-page media contracts

**Files:**
- Modify: `strapi-catalog/src/api/product/content-types/product/schema.json`
- Modify: `strapi-catalog/src/api/catalog/controllers/catalog-feed.js`
- Modify: `strapi-catalog/src/api/catalog/utils/build-product-gallery.js`
- Modify: `src/catalog/catalog-api.ts`
- Test: `scripts/check-catalog-api.mjs`

**Interfaces:**
- Produces `detailGallery` and `bentoGallery` beside the existing card `gallery`.
- Each image may include responsive `srcSet` candidates derived from Strapi formats.

- [x] Add failing feed-contract assertions for three independent galleries and responsive candidates.
- [x] Verify RED with `npm run check:catalog-api`.
- [x] Add `detail_gallery` and `bento_gallery`, populate them in the feed and keep the documented detail-only fallback.
- [x] Verify GREEN with `npm run check:catalog-api` and Strapi build.

### Task 5: Make every API product routable

**Files:**
- Modify: `src/catalog/catalog-listing-controller.ts`
- Modify: `src/catalog/catalog-card.ts`
- Test: `scripts/check-catalog-ui.mjs`

**Interfaces:**
- Product rendering consumes `CatalogProduct` directly from `productCatalog` rather than requiring a rendered card.

- [x] Add a failing browser assertion that opens a product beyond the first nine cards.
- [x] Verify RED with `npm run check:catalog-ui`.
- [x] Render the product from the API model while retaining existing card-dataset helpers where appropriate.
- [x] Verify GREEN with `npm run check:catalog-ui`.

### Task 6: Product slider, independent bento and Retina media

**Files:**
- Modify: `src/catalog/catalog-product-gallery.ts`
- Modify: `src/catalog/catalog-listing-controller.ts`
- Modify: `src/styles/catalog-page.css`
- Test: `scripts/check-catalog-ui.mjs`

**Interfaces:**
- Detail slider uses `detailGallery`; bento uses only `bentoGallery`; `<picture>` emits width-aware `srcset` and `sizes`.

- [x] Add failing assertions for independent sources, hero-style controls and responsive image attributes.
- [x] Verify RED.
- [x] Implement the dedicated product-page hero slider surface and independent bento rendering.
- [x] Verify GREEN at desktop and mobile widths.

### Task 7: Firmness scale and similar-products action

**Files:**
- Create: `src/catalog/catalog-firmness-scale.ts`
- Modify: `src/catalog/catalog-listing-controller.ts`
- Modify: `src/styles/catalog-page.css`
- Test: `scripts/check-catalog-ui.mjs`

**Interfaces:**
- `buildCatalogFirmnessScaleHtml(side1, side2)` renders one unlabeled row for equal/single values and two labeled rows for different values.
- `?similar=<slug>` hydrates catalogue filter state from the source product.

- [x] Add failing single/dual firmness and similar-filter browser assertions.
- [x] Verify RED.
- [x] Implement the scale, CTA and deterministic similar-state mapping.
- [x] Verify GREEN.

### Task 8: Responsive polish and full local gate

**Files:**
- Modify: `src/styles/catalog-page.css`
- Update: `docs/superpowers/plans/2026-10-29-editorial-product-page.md`

- [x] Fix the title cap and enforce square share/favourite controls.
- [x] Visually verify desktop and mobile composition locally.
- [x] Run `npm run typecheck && npm run check:catalog-api && npm run check:catalog-ui && npm run check:showcase-ui && npm run build && git diff --check`.
- [x] Record exact results here; do not push or deploy.

## Verification record — Tasks 4–8

- RED: `npm run check:catalog-api` failed because the feed had no `detailGallery` / `bentoGallery` arrays; the new contract test exposed this before implementation.
- RED: `npm run check:catalog-ui` failed for a direct `/catalog?product=imperio` route outside the initially rendered card batch, for the missing independent media sources, firmness scale and similar-products action.
- GREEN: `npm run typecheck` — PASS.
- GREEN: `npm run check:catalog-api` — PASS (`Catalog API ok: http://127.0.0.1:3000`).
- GREEN: `npm run check:catalog-ui` — PASS (`Catalog UI smoke ok: http://127.0.0.1:5174/catalog`). Coverage now includes direct routing to `imperio`, hero-style product slider, independent bento source, single/dual firmness structure, square title actions, `?similar=` filters, tablet and mobile layout.
- GREEN: `npm run check:showcase-ui` — PASS (`Showcase UI: download CTA present; smart selector and all price surfaces absent`).
- GREEN: `npm run build` — PASS: Vite bundle completed, Strapi TypeScript compiled, admin panel built and runtime assets prepared.
- GREEN: `git diff --check` — PASS.
- Visual smoke: local `/catalog?product=orient` exposes the same navigation/dot pattern as the catalogue hero, the one-sided 4/10 scale has no reserved side-label gap, the title is capped at 112px, and favourite/share controls remain in the masthead. The current Orient source assets top out at 1024–1280px; the runtime now prioritizes AVIF/WebP and emits width-aware `srcset`, but true 2× detail at a ~1200px stage requires future CMS uploads around 2400px wide.
