# Импорт каталога из печатного PDF

Артефакты для занесения товаров в Strapi на основе клиентского каталога в [`pdf/`](../pdf/).

## Структура

```
docs/catalog-import/
  _inventory.md           # все страницы PDF: ref / cover / product
  _filters-reference.md   # канон slug'ов фильтров (не менять)
  _mapping-rules.md       # правила маппинга каталог → slug
  products/*.md           # одна карточка = один товар
  images/*.png            # embedded 1034×1034 из PDF
```

## Пересборка

```bash
python3 -m venv .venv-catalog
.venv-catalog/bin/pip install pymupdf pyyaml pillow
.venv-catalog/bin/python3 scripts/build-catalog-import.py
node scripts/validate-catalog-import.mjs
```

## Формат MD

Каждый файл в `products/` содержит:

- **YAML frontmatter** — поля для Strapi / API (slug'и фильтров, размеры, медиа).
- **## Чехол** — описание чехла из каталога.
- **## Наполнение** — полный нумерованный список слоёв для модалки.
- **## Примечания маппинга** — как значения каталога переведены в slug'и.

### Соответствие frontmatter → Strapi Product

| Поле MD | Поле Strapi / relation |
|---------|-------------------------|
| `name` | `name` |
| `slug` | `slug` |
| `collection` | `collection` (classic/flexi/relax/trend; topper → `mattress_type: topper`) |
| `firmness` | `firmness_option` slug |
| `mattress_type` | `mattress_type_option` slug |
| `height_cm` | `height_cm` |
| `max_load_kg` | `max_load_kg` |
| `load_range` | `load_range_option` slug |
| `height_range` | `height_range_option` slug |
| `sizes` | `sizes` (все 6 стандартных) |
| `filling_slugs` | `filling_options` |
| `features` | `features` |
| `image` | `media` / `gallery` (загрузить PNG в uploads) |
| `tags` | `tags` |
| `sort_order` | `sort_order` |

Секция «Наполнение» — текст для модалки; отдельного поля в Strapi пока нет (следующий шаг миграции).

## Изображения

- Источник: **embedded XObject 1034×1034** из `source_pdf` (не рендер страницы).
- Имя файла: `images/{slug}.png`.
- Обложки коллекций (`pdf/5`, `12`, `19`, `33`, `45`) **не извлекаются**.
- При загрузке в Strapi можно положить `.avif` рядом с `.png` (см. AGENTS.md).

## Размеры

В печатном каталоге размеров нет — для всех моделей указан полный стандартный набор:

`140x190`, `140x200`, `160x190`, `160x200`, `180x190`, `180x200`

## Товаров

43 product-страницы (см. `_inventory.md`).
