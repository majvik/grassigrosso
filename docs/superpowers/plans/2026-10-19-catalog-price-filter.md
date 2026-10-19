# Plan: catalog price filter

## Phase 1 — Domain helpers

- [x] `catalog-price.ts`: parse/format input, collect bounds, clamp, active check, match
- [x] Extend `CatalogFilterState` + reset + `matchesCatalogCardMeta`

## Phase 2 — UI + wiring

- [x] Sidebar markup in `filters.tsx` + CSS
- [x] `catalog-price-filter.ts` sync/bind dual-range + inputs
- [x] Listing controller: set bounds from feed, events, reset

## Phase 3 — Verify

- [x] `scripts/check-catalog-price-filter.mjs` + npm script
- [x] `typecheck`, price/list-meta checks still green

### Verify

| Command | Result |
| --- | --- |
| `npm run typecheck` | ok |
| `npm run check:catalog-price-filter` | ok |
| `npm run check:catalog-card-price` | ok |
| `npm run check:catalog-card-list-meta` | ok |
