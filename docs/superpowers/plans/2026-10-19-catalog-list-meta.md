# Plan: catalog list-view layers + price by tags

## Phase 1 — Meta list + footer layout

- [x] Parse numbered `layersCatalog` in `catalog-modal.ts`; render `<ul>` for Наполнение
- [x] Wrap price + tags in `.catalogue-new-card-footer` (`catalog-card.ts`)
- [x] CSS: footer `margin-top: auto`; layers list styles; list-view `--layers` stays `display: flex`

### Verify

| Command | Result |
| --- | --- |
| `npm run typecheck` | ok |
| `npm run check:catalog-card-list-meta` | ok |
| `npm run check:catalog-card-price` | ok |

### Tests added

- `scripts/check-catalog-card-list-meta.mjs` (+ `check:catalog-card-list-meta` in `package.json`)
- Extended footer assertion in `scripts/check-catalog-card-price.mjs`
