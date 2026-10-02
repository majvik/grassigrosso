# Catalog stale media sidecar

**Date:** 2026-10-02  
**Spec:** docs/superpowers/specs/2026-10-02-catalog-stale-media-sidecar-design.md

## Phase 1 — ignore stale sidecars

- [x] `isCurrentUploadSidecar` in `prefer-avif.js` (mtime + 2s skew)
- [x] Use it from `preferAvifVariant`, `resolveImageMedia`, `resolveVideoMedia`
- [x] Regression: `scripts/check-catalog-media-sidecars.mjs`

**Verify:** `npm run check:catalog-media-sidecars` → `check:catalog-media-sidecars ok`

## Phase 2 — live catalog

- [x] Strapi reloaded the util
- [x] `davos` image URL in `GET /api/catalog/products` is `/uploads/davos_f60728f139.png`
- [x] `aspect` still uses its current `.avif`
- [x] Catalog card in the browser loads the Davos PNG (`naturalWidth` 1254)

**Verify:** curl `http://127.0.0.1:3000/api/catalog/products` source `strapi-catalog-feed`; browser `/catalog` card `davos` src is the PNG.

## Phase 3 — media is the first slide

- [x] `buildProductGallery` puts `media` first, then gallery slides
- [x] Empty `media` keeps the first gallery item as the cover
- [x] Regression: `scripts/check-catalog-gallery-order.mjs`

**Verify:** `npm run check:catalog-gallery-order` → ok. `davos-2` feed and `/catalog` card start with `/uploads/davos_product_closeup_pilot_02_649b6aaf25.png`, gallery PNG follows. Image loaded (`naturalWidth` 1254).
