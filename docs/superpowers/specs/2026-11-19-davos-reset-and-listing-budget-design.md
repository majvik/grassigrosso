# Davos Media Reset and Listing Budget — Design

## Problem

The bundled Strapi seed still restored legacy Davos raster media and nine gallery items, although Davos must be refilled from scratch. The listing performance check also measured JavaScript string length instead of the actual UTF-8 response size and exceeded its 28,000-byte budget.

## Root Cause

- The local working database had cleared Davos media, but `database/seed/data.db` had not been synchronized afterward.
- Listing retained `strapiDocumentId` and `isActive`, although browser listing consumers do not use them. Active products are already filtered by Strapi.
- The performance check used `JSON.stringify(payload).length`, which undercounts UTF-8 bytes for Cyrillic text.

## Contract

- Davos has no product media, gallery, characteristics media, materials, or page-cover media until the editor uploads new assets through Strapi.
- Empty media slots use the shared neutral placeholders; no Davos-specific fallback is permitted.
- Full catalog feed retains integration identity and activity fields.
- Listing feed omits `strapiDocumentId` and `isActive` and remains below 28,000 UTF-8 bytes.

## Success Criteria

- Seed and live feeds expose 43 active products and empty Davos media.
- Listing HTTP JSON is below 28,000 UTF-8 bytes.
- Seed, typecheck, API, UI, performance and full build checks pass locally.
