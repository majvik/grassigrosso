# Catalog perf wave 2 — GSD execution plan

**Date:** 2026-06-08  
**Spec:** [2026-06-08-catalog-perf-wave2-design.md](../specs/2026-06-08-catalog-perf-wave2-design.md)

## Phase 1 — DOM windowing (P0)

| ID | Task | File |
|----|------|------|
| 1.1 | Meta from `CatalogProduct` in memory | `catalog-product-meta.ts` |
| 1.2 | Product store by slug for modal | `catalog-product-store.ts` |
| 1.3 | Render only `slice(0, limit)` cards to DOM | `catalog-listing-controller.ts` |
| 1.4 | Modal reads full gallery from store | `catalog-image-modal.ts` |
| 1.5 | Infinite scroll IO margin 600→200px | `catalog-listing-controller.ts` |

**Verify:** DOM `.catalogue-new-card` count ≤6 before scroll; `check:catalog-ui` pass.

## Phase 2 — Code split (P1)

| ID | Task | File |
|----|------|------|
| 2.1 | Dynamic import catalog runtime on `data-page=catalog` | `main.js` |
| 2.2 | Prefetch feeds from split modules | `main.js` |

**Verify:** non-catalog pages don't load catalog listing chunk; catalog still works.

## Phase 3 — Backend slim feed (P2, optional)

| ID | Task | File |
|----|------|------|
| 3.1 | `GET /api/catalog/products?view=listing` — gallery[0] only | `catalog-feed.js`, `catalog-api.ts` |

## Phase status

| Phase | Status |
|-------|--------|
| 1 | done |
| 2 | done |
| 3 | pending |
