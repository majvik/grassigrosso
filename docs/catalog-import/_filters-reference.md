# Справочник фильтров каталога (канон)

Источник истины для импорта товаров из [`docs/catalog-import/products/`](products/). **Slug'и не менять** без синхронного обновления Strapi bootstrap ([`strapi-catalog/src/index.js`](../../strapi-catalog/src/index.js)), UI ([`src/components/pages/catalog-page-data.ts`](../../src/components/pages/catalog-page-data.ts)) и [`scripts/check-catalog-api.mjs`](../../scripts/check-catalog-api.mjs).

## collection

| Slug | Название в UI |
|------|---------------|
| `classic` | Classic |
| `flexi` | Flexi |
| `relax` | Relax |
| `trend` | Trend |
| `topper` | Топеры (фильтр UI; в Strapi — `mattress_type: topper`, collection может быть пустой) |

## size

Все товары получают полный набор:

- `140x190`, `140x200`, `160x190`, `160x200`, `180x190`, `180x200`

## firmness

| Slug | Название |
|------|----------|
| `soft` | Мягкий |
| `medium` | Средний |
| `hard` | Жесткий |
| `dualFirmness` | Разная жесткость сторон |

## type (тип конструкции)

| Slug | Название |
|------|----------|
| `spring` | Пружинный |
| `nospring` | Беспружинный |
| `topper` | Топер |
| `doubleSided` | Двухсторонние |
| `singleSided` | Односторонние |

Для импорта из печатного каталога используются в основном `spring`, `nospring`, `topper`.

## loadRange

| Slug | Название | max_load_kg |
|------|----------|-------------|
| `upTo120` | до 120 кг | ≤ 120 |
| `upTo160` | до 160 кг | 121–160 |
| `upTo180` | до 180 кг | 161–180 |
| `over160` | Без ограничений | > 180 |

## heightRange

| Slug | Название | height_cm |
|------|----------|-----------|
| `low` | Компактные до 16 см | ≤ 16 |
| `mid` | Средние 16–22 см | 17–22 |
| `high` | Высокие от 23 см | ≥ 23 |

Топеры с высотой ≤ 16 см → `low`.

## fillings

| Slug | Название |
|------|----------|
| `coir` | Кокосовая койра |
| `latex` | Латекс / neolatex |
| `orthoFoam` | Орто-пена (flexi, elax, высокоэластичная пена, карбон и т.п.) |
| `memoryEffect` | С эффектом памяти |
| `nanoFoam` | Нано-пена |
| `forplit` | Форплит |

В MD: `filling_slugs` — для Strapi `filling_options`; секция «Наполнение» — полный текст слоёв для модалки.

## features

| Slug | Название |
|------|----------|
| `removableCover` | Съемный чехол |
| `winterSummer` | Эффект зима-лето |
| `edgeSupport` | Усиленный периметр (еврокаркас, татами борт) |
