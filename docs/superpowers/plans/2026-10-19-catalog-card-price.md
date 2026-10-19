# Catalog card price — plan

**Date:** 2026-10-19  
**Spec:** [2026-10-19-catalog-card-price-design.md](../specs/2026-10-19-catalog-card-price-design.md)

## Phase 1 — Data contract

- [x] `schema.json`: `price_rub` integer
- [x] RU admin translations
- [x] `catalog-feed.js` → `priceRub`
- [x] Demo `priceRub` written once into seed/snapshots (30–50k); no bootstrap re-randomize
- [x] Inject `priceRub` into catalog product snapshots

**Verify:** schema contains `price_rub`; snapshot items have `priceRub`.

## Phase 2 — UI + tests

- [x] `formatCatalogPriceRub` helper
- [x] `buildCatalogueCardHtml` renders price before tags
- [x] CSS `.catalogue-new-card-price` = sidebar-title metrics
- [x] `scripts/check-catalog-card-price.mjs` + npm script

**Verify:** `node scripts/check-catalog-card-price.mjs`, `npm run typecheck`.

## Post-fix

| Check | Result |
| --- | --- |
| check:catalog-card-price | ok |
| typecheck | ok |
