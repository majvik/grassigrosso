# Davos Media Reset and Listing Budget — Plan

**Spec:** `docs/superpowers/specs/2026-11-19-davos-reset-and-listing-budget-design.md`

## Phase 1 — Data contract

- [x] Compare Davos relations in working and bundled seed databases with WAL-aware reads.
- [x] Synchronize the cleared working Strapi database into the bundled seed.
- [x] Add a regression assertion that Davos seed media and media components remain empty.

## Phase 2 — Listing contract

- [x] Verify listing consumers do not use `strapiDocumentId` or `isActive`.
- [x] Remove those fields from listing only; preserve them in the full feed.
- [x] Measure the compact response with `Buffer.byteLength(..., 'utf8')`.

## Phase 3 — Snapshots and verification

- [x] Export catalog snapshots from the local Strapi/API chain.
- [x] Verify Davos has empty gallery, covers, characteristics and materials.
- [x] Run all relevant local gates.

## Results

- Davos full feed: empty gallery, null desktop/mobile covers, empty characteristics and materials.
- Listing: 43 products, 27,249 UTF-8 bytes.
- `python3 scripts/check-catalog-seed.py` — pass.
- `npm run typecheck` — pass.
- `npm run check:catalog-api` — pass.
- `npm run check:catalog-ui` — pass.
- `npm run check:catalog-perf` — pass (12 cards, 1,179 DOM nodes, 9 upload requests).
- `STRAPI_TELEMETRY_DISABLED=true npm run build` — pass.
