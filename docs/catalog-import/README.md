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

## Тестовый каталог для ручной валидации

Перед загрузкой в Strapi соберите preview:

```bash
npm run catalog-import:preview
```

### Через Vite dev (если уже запущен `npm run dev`)

[http://127.0.0.1:5174/docs/catalog-import/preview.html](http://127.0.0.1:5174/docs/catalog-import/preview.html)

После правок MD пересоберите preview (`npm run catalog-import:preview`) и обновите страницу в браузере.

### Отдельный static-сервер (без Vite)

```bash
npm run catalog-import:preview:serve
```

→ [http://127.0.0.1:8765/preview.html](http://127.0.0.1:8765/preview.html)

На странице для каждого товара:
- изображение 1034×1034;
- slug'и фильтров и их человекочитаемые лейблы;
- **полный список слоёв** (как должно быть в модалке);
- блок «Как в модалке каталога» — текущие slug-лейблы;
- чехол и примечания маппинга.

Фильтр по коллекции и поиск по названию/slug в шапке preview.

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
| `image` | `media` (PNG в `public/uploads/`) |
| `tags` | `tags` |
| `sort_order` | `sort_order` |
| секция «Чехол» | `cover_description` |
| секция «Наполнение» | `layers_catalog` |

## Импорт в Strapi

После проверки preview загрузите товары в локальную Strapi:

```bash
# рабочая БД (если пустая — скопируйте seed)
cp strapi-catalog/database/seed/data.db strapi-catalog/.tmp/data.db

npm run catalog-import:strapi -- --deactivate-others
```

Команда собирает Strapi, upsert'ит 43 товара по `slug` из `products/*.md`, загружает PNG в uploads и (с флагом `--deactivate-others`) отключает старые placeholder-карточки.

**Флаги:**

| Флаг | Действие |
|------|----------|
| `--dry-run` | только лог, без записи в БД |
| `--deactivate-others` | `is_active: false` для Product вне import-set |
| `--force-media` | перезалить PNG даже если `media` уже есть |

Повторный запуск обновляет scalars, relations и текстовые поля из MD; без `--force-media` существующие картинки в админке не трогаются.

**После импорта** (Strapi остановлен):

```bash
npm run strapi:sync-seed
git add strapi-catalog/database/seed/data.db \
        strapi-catalog/database/seed/seed-manifest.json \
        strapi-catalog/public/uploads/
npm run check:catalog-api
```

На prod контент редактируется в админке Strapi; для выкладки изменений — снова `strapi:sync-seed` и commit seed + uploads.

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
