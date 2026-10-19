# Catalog card price — design spec

**Date:** 2026-10-19  
**Status:** implemented (2026-10-19)

## Problem

В карточке каталога (`.catalogue-new-card-body`) нет цены. По вайрфрейму цена стоит перед тегами и набрана крупно — кегль как у заголовка «Фильтры» (`.catalogue-new-sidebar-title`: 32px, Bounded).

## Constraints

- Фронт не ходит в Strapi напрямую — только `GET /api/catalog/products` (+ snapshot fallback).
- Цена опциональна: если `priceRub` отсутствует / ≤ 0 — блок цены не рендерится.
- Формат отображения: `100 000 ₽` (пробел как разделитель тысяч, символ рубля).

## Approach

1. Strapi `Product.price_rub` (integer, optional) → feed `priceRub`.
2. Bootstrap: идемпотентный backfill `100000` для активных товаров без цены (стартовый placeholder).
3. Карточка: `.catalogue-new-card-price` перед `.catalogue-new-tags-row`.
4. CSS: зеркало `.catalogue-new-sidebar-title` (32px / Bounded / primary).
5. Snapshot + unit check скрипт.

## Success criteria

- Карточка с `priceRub: 100000` показывает `100 000 ₽` перед тегами.
- Размер шрифта цены = 32px (как «Фильтры»).
- Без `priceRub` разметка цены отсутствует.
- `typecheck` + `check:catalog-card-price` зелёные.
