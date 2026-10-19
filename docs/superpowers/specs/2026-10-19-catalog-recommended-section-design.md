# Catalog recommended section — design spec

**Date:** 2026-10-19  
**Status:** implemented (2026-10-19)

## Problem

Выдача каталога должна начинаться с блока **«Мы рекомендуем»** (отмеченные товары), затем **«Все товары»** с остальными. Заголовки редактируются в админке; у каждого Product есть галочка «Мы рекомендуем».

## Constraints

- Фронт → только backend `/api/catalog/products` (+ snapshot).
- Рекомендованные **не дублируются** в «Все товары».
- Демо: ровно 6 отмеченных в seed; bootstrap **не** переназначает флаги при каждом старте.
- Shared favourites / product view — плоский список без секций.

## Approach

1. `Product.is_recommended` (boolean, default false).
2. Single type `catalog-listing`: `recommended_section_title`, `all_products_section_title`.
3. `catalog-feed` → `isRecommended` + `sections: { recommendedTitle, allProductsTitle }`.
4. Listing: под toolbar секции с `.catalogue-new-section-title` + grid карточек.
5. Сортировка/фильтры — внутри каждой секции; infinite scroll — по блоку «Все товары».

## Success criteria

- Под toolbar виден CMS-заголовок «Мы рекомендуем» и до 6 рекомендованных.
- Ниже — «Все товары» и остальные.
- Галочка в админке управляет попаданием в первую секцию.
- Тесты + typecheck зелёные.
