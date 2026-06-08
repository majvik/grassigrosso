# Catalog admin fallback — GSD execution plan

**Date:** 2026-06-08  
**Spec:** [2026-06-08-catalog-admin-fallback-design.md](../specs/2026-06-08-catalog-admin-fallback-design.md)  
**Deploy note:** Timeweb App Platform собирает Docker-образ из последнего commit; snapshot JSON в `public/` попадает в образ без running Strapi.

## Phase 1 — Server stale-if-error + disk snapshot (P0)

| ID | Task | File |
|----|------|------|
| 1.1 | Cache entry `{ body, expires, staleUntil }`, env `CATALOG_STRAPI_STALE_MS` | `server.cjs` |
| 1.2 | `getCatalogStrapiCache(key, { allowStale })` | `server.cjs` |
| 1.3 | On Strapi error: stale → read `public/catalog-*.snapshot.json` → 502 | `server.cjs` |
| 1.4 | Skip caching empty `items: []` for products | `server.cjs` |
| 1.5 | Response header `X-Catalog-Source` | `server.cjs` |

**Verify:** Strapi stopped → `GET /api/catalog/products` → 200, items ≥43, `X-Catalog-Source: disk-snapshot` (after snapshot committed)

## Phase 2 — Export snapshot script (P0)

| ID | Task | File |
|----|------|------|
| 2.1 | Export products (full + listing), filters, hero from API | `scripts/export-catalog-snapshot.mjs` |
| 2.2 | Write manifest with productCount + sha256 | `public/catalog-snapshot.manifest.json` |
| 2.3 | npm script `catalog:export-snapshot` | `package.json` |

**Verify:** `npm run catalog:export-snapshot` → manifest productCount ≥43

## Phase 3 — Client fallback chain (P0)

| ID | Task | File |
|----|------|------|
| 3.1 | `fetchCatalogProductsWithFallback()` — API → sessionStorage → snapshot | `src/catalog/catalog-api.ts` |
| 3.2 | Retry + error UI, remove silent static fallback | `src/catalog/catalog-listing-controller.ts` |

**Verify:** Strapi down → orient visible in UI

## Phase 4 — SSR/HTML cleanup (P1)

| ID | Task | File |
|----|------|------|
| 4.1 | Loading skeleton instead of `CatalogFallbackCardsGrid` | `src/components/catalog-page/cards.tsx`, `layout.tsx` |
| 4.2 | Empty `.catalogue-new-cards` in legacy HTML | `catalog.html` |
| 4.3 | Load error block styles | `src/styles/catalog-page.css` |

**Verify:** view-source — no collection product cards in SSR

## Phase 5 — Smoke + docs (P1)

| ID | Task | File |
|----|------|------|
| 5.1 | Snapshot manifest checks in smoke | `scripts/check-catalog-api.mjs` |
| 5.2 | Workflow in AGENTS.md | `AGENTS.md` |

**Verify:** `npm run check:catalog-api` pass

## Phase status

| Phase | Status |
|-------|--------|
| 1 | done |
| 2 | done |
| 3 | done |
| 4 | done |
| 5 | done |
