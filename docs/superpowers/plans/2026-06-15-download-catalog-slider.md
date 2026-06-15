# Download catalog slider — GSD execution plan

**Date:** 2026-06-15
**Spec:** [2026-06-15-download-catalog-slider-design.md](../specs/2026-06-15-download-catalog-slider-design.md)

## Phase 1 — Images (P0)

| ID | Task | File |
|----|------|------|
| 1.1 | Optimize cover + slide-02..08 → PNG 1840×1035 seed assets | `strapi-catalog/database/seed/download-slides/download-slide-01..08.png` |
| 1.2 | Remove attached source images from repo root | root `slide-0X@2x.png`, `сatalog_cover@2x.png` |

**Verify:** 8 seed PNGs exist at 1840×1035; root cleaned.

## Phase 2 — Strapi content type + feed (P0)

| ID | Task | File |
|----|------|------|
| 2.1 | Single type `download-catalog-page` (slides + slider_autoplay_ms) | `strapi-catalog/src/api/download-catalog-page/content-types/.../schema.json` |
| 2.2 | RU i18n label | `strapi-catalog/src/admin/translations/ru.json` |
| 2.3 | Public feed route + controller | `strapi-catalog/src/api/catalog/routes/download-catalog-feed.js`, `controllers/download-catalog-feed.js` |

**Verify:** `GET /api/download-catalog-feed` responds (empty before seed).

## Phase 3 — Bootstrap auto-seed (P0)

| ID | Task | File |
|----|------|------|
| 3.1 | Idempotent seed: upload 8 imgs, avif sidecars, populate single type | `strapi-catalog/src/index.js` |

**Verify:** after restart, feed returns 8 image slides with `/uploads/...` URLs.

## Phase 4 — Node proxy + snapshot (P0)

| ID | Task | File |
|----|------|------|
| 4.1 | `GET /api/download-catalog/slides` + cache + fallback | `server.cjs` |
| 4.2 | `CATALOG_DISK_SNAPSHOT_FILES` entry | `server.cjs` |
| 4.3 | Snapshot export | `scripts/export-catalog-snapshot.mjs` |

**Verify:** Node endpoint returns 8 slides; snapshot file written.

## Phase 5 — Frontend slider (P0)

| ID | Task | File |
|----|------|------|
| 5.1 | Slider shell (cover #0 + empty slides + dots/nav) | `src/components/pages/DownloadCatalogPage.tsx` |
| 5.2 | `.coverSlider` 16:9/920 CSS | `src/components/pages/download-catalog.module.css` |
| 5.3 | `setupDownloadCatalogHero` + prefetch + fetch | `src/catalog-hero-slider.js`, `src/catalog/catalog-api.ts` |
| 5.4 | `data-page` + main.js branch + preload | `download-catalog.html`, `src/main.js` |

**Verify:** dev `/download-catalog` slider works; slide #0 = cover.

## Phase 6 — Seed/snapshot/verify/commit (P1)

| ID | Task | File |
|----|------|------|
| 6.1 | typecheck + build:web | — |
| 6.2 | local feed + Node smoke + check:catalog-api | — |
| 6.3 | strapi:sync-seed + commit uploads/data.db | `strapi-catalog/...` |
| 6.4 | catalog:export-snapshot + commit | `public/download-catalog-slides.snapshot.json` |

## Phase status

| Phase | Status |
|-------|--------|
| 1 | done |
| 2 | done |
| 3 | done |
| 4 | done |
| 5 | done |
| 6 | done |

## Verify results (2026-06-15)

- `typecheck` + `build:web` — pass.
- Strapi boot: `Download catalog seed: populated single type with 8 slides`.
- `GET /api/download-catalog-feed` (Strapi) and `GET /api/download-catalog/slides` (Node) — 8 image slides, `/uploads/download_slide_0X_*.avif`.
- Browser smoke `/download-catalog`: 1 slider, 8 slides, 8 dots, all filled from feed; active AVIF loads (naturalWidth 1840); next-arrow + autoplay advance correctly.
- `check:catalog-api` — ok.
- Artifacts: `public/download-catalog-slides.snapshot.json`, `strapi-catalog/database/seed/data.db` + `seed-manifest.json`, `strapi-catalog/public/uploads/download_slide_0X_*.avif` (8).

## Commit set (deploy contract)

- `strapi-catalog/database/seed/data.db`, `strapi-catalog/database/seed/seed-manifest.json`
- `strapi-catalog/public/uploads/download_slide_0X_*.avif` (8)
- `strapi-catalog/database/seed/download-slides/*.avif` (bootstrap seed sources)
- `public/download-catalog-slides.snapshot.json`
- code: schema/feed/controller, `server.cjs`, `scripts/export-catalog-snapshot.mjs`, frontend (`DownloadCatalogPage.tsx`, module CSS, `catalog-hero-slider.js`, `catalog-api.ts`, `main.js`), `download-catalog.html`, `ru.json`, docs.
