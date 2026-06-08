# Catalog media optimization — design spec

**Date:** 2026-06-01  
**Status:** implemented

## Goal

Reduce catalog page weight and concurrent image loads while keeping Strapi admin workflow unchanged (DB stores original PNG/MP4 only).

## Architecture

```mermaid
flowchart LR
  admin[Strapi admin upload PNG]
  sidecars[optimize-catalog-uploads.mjs]
  git[git uploads sidecars]
  feed[build-product-gallery + resolve-media-sources]
  front[catalog-product-gallery picture + load queue]
  admin --> sidecars --> git --> feed --> front
```

## Contracts

- **Sidecars:** `{basename}.avif`, `{basename}.webp` next to raster; `{basename}.webm` next to video.
- **Feed item (image):** `src` (best format), `fallbackSrc` (DB original), `sources[]` for `<picture>`.
- **Feed item (video):** `src` (webm if exists), `fallbackSrc` (mp4), lazy `data-src` in DOM.
- **Frontend:** slide 0 eager `<picture>`; slides 1–4 deferred via `data-media-payload`; max 2 concurrent image loads; IO `rootMargin: 600px`.

## Admin workflow

1. Upload/edit media in Strapi admin.
2. `npm run catalog:optimize-media`
3. `npm run strapi:sync-seed`
4. Commit `public/uploads/` + seed.

## Out of scope

- Strapi schema changes.
- `<picture>` on hero slides #1…N (AGENTS.md LCP rule).
