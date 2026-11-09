# Client product prototype — execution plan

## Phase 1 — Contract tests

- Расширить `scripts/check-product-page-prototype.mjs` контрактами для cover-back, size cards и material details.
- Verify: тест должен фиксировать новые hooks и responsive CSS.

## Phase 2 — React and CSS

- Обновить `ProductPagePrototype.tsx` и CSS Module без изменения соседних секций.
- Verify: `npm run check:product-page-prototype`, `npm run typecheck`.

## Phase 3 — Integration verification

- Production build и локальный browser smoke desktop/mobile.
- Verify: `npm run build`, визуальная проверка `/product-page-prototype`.

## Status

- Phase 1: in progress
- Phase 2: pending
- Phase 3: pending
