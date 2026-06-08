# Catalog perf fixes — GSD execution plan

**Date:** 2026-06-01  
**Spec:** [2026-06-01-catalog-perf-debugging-design.md](../specs/2026-06-01-catalog-perf-debugging-design.md)  
**Method:** Superpowers spec → phased GSD execution → verify after each phase

## Baseline (pre-fix)

| Metric | Value |
|--------|-------|
| Eager images | 43 (37 hidden) |
| Upload requests before scroll | ~46 |
| DOM nodes | ~2252 |
| Lenis on catalog | yes |

## Success criteria (all phases)

1. Hidden eager images = **0**
2. Upload requests before scroll ≤ **10**
3. `npm run check:catalog-ui` passes
4. Gallery swipe + modal still work
5. No Lenis on `/catalog` desktop

---

## Phase 1 — Image loading budget (P0)

**Goal:** Browser loads only visible card covers (~6), not all 43.

| ID | Task | File |
|----|------|------|
| 1.1 | Slide 0 default `loading="lazy"` | `catalog-product-gallery.ts` |
| 1.2 | `syncVisibleCatalogCardMediaLoading()` — eager only first visible card | `catalog-product-gallery.ts` |
| 1.3 | Call sync after every `applyFilters()` | `catalog-listing-controller.ts` |
| 1.4 | IO `rootMargin` 600→200px; skip hidden hosts | `catalog-media-load-queue.ts` |
| 1.5 | Remove forced `loadPictureElement` in gallery init | `catalog-product-gallery.ts` |

**Verify:** CDP count `hiddenEager === 0`, upload requests ≤ 10.

---

## Phase 2 — Main-thread hydrate (P0)

**Goal:** Smaller jank spike when Strapi replaces grid; galleries only on visible cards.

| ID | Task | File |
|----|------|------|
| 2.1 | `requestAnimationFrame` yield before gallery init after `innerHTML` | `catalog-listing-controller.ts` |
| 2.2 | Lazy-bind gallery controllers when card visible | `catalog-product-gallery.ts` |
| 2.3 | Re-init newly visible galleries in `applyFilters()` | `catalog-listing-controller.ts` |
| 2.4 | Remove duplicate `initCatalogProductGalleries(document)` | `catalog-page.js` |

**Verify:** typecheck + catalog-ui smoke.

---

## Phase 3 — Scroll pipeline (P1)

**Goal:** Remove Lenis overhead on catalog; lighter sticky sidebar.

| ID | Task | File |
|----|------|------|
| 3.1 | Skip Lenis when `data-page="catalog"` | `app-shell.js` |
| 3.2 | Debounced scroll-end sync for sticky sidebar | `catalog-sticky-sidebar.ts` |

**Verify:** manual scroll + filter interaction.

---

## Phase 4 — Hero LCP (P2)

**Goal:** Avoid re-downloading hero slide 0 when Strapi URL matches React fallback.

| ID | Task | File |
|----|------|------|
| 4.1 | Preserve slide 0 DOM when feed src matches | `catalog-hero.ts` |

**Verify:** Network — single hero image fetch.

---

## Phase status

| Phase | Status | Result |
|-------|--------|--------|
| 1 | done | eager 43→1, hiddenEager 0, uploads 46→9 |
| 2 | done | rAF hydrate, lazy gallery bind, no duplicate init |
| 3 | done | Lenis off on catalog, sticky scroll-end debounce |
| 4 | done | hero slide 0 preserved when URL matches |

## Post-fix metrics (2026-06-01, local)

| Metric | Before | After |
|--------|--------|-------|
| Eager images | 43 | **1** |
| Hidden eager | 37 | **0** |
| Lazy images | 0 | **42** |
| Upload requests (no scroll) | ~46 | **9** |
| Lenis on catalog | yes | **no** |
| Gallery controllers (visible) | ~43 | **2** (multi-slide only) |
