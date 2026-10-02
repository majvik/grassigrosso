# Catalog stale media sidecar

**Date:** 2026-10-02  
**Status:** implemented

## Problem

Replacing a product image in Strapi keeps the same `/uploads/<hash>.png` URL. `resolveImageMedia` / `preferAvifVariant` then keep serving the older sibling `.avif` (and `.webp`), so the catalog card stays on the original picture.

## Root cause

Sidecar selection checks only that the sibling file exists. It does not compare mtime with the file stored in the DB.

Confirmed locally: `davos_f60728f139.png` was rewritten on 2026-10-02, while `davos_f60728f139.avif` is from 2026-08-04. `GET /api/catalog/products` returned the AVIF for `davos`.

## Gallery order

The catalog cover is the product `media` field. Gallery slides follow it. If `media` is empty, the first gallery item is the cover. A legacy `image_url` is used only when both `media` and `gallery` are empty. Duplicate of the cover inside the gallery is skipped. The combined list stays capped at 5 slides.

## Success criteria

- A sidecar older than its source file is ignored; the feed `src` is the current original.
- A sidecar newer than or equal to the source (within 2s skew) is still preferred.
- The same rule applies to image AVIF/WebP and video WebM.
- `node scripts/check-catalog-media-sidecars.mjs` fails on the old behavior and passes after the fix.
