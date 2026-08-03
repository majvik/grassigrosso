# Task 5 — RU Admin smoke evidence (2026-08-03)

## Automated

| Check | Result |
|-------|--------|
| `npm run check:pages-cms-strict` | PASS — full Wave 1 RU key coverage + negative probe (delete `map_iframe_html` CM key → FAIL) |
| `npm run typecheck` | PASS |
| Strapi boot 5.42.1 | PASS |

RU artifacts:
- `strapi-catalog/src/admin/translations/ru.json` — CM + CTB + enum + displayName keys for all Wave 1 components/single types
- Schema attribute `displayName` (RU) on page components + 6 single types
- Bootstrap sync: `strapi-catalog/src/api/catalog/utils/sync-pages-cms-admin-labels.js` (keeps CM DB metadatas aligned with schema displayName)

## Browser smoke (local Admin, locale `ru`)

Opened Content Manager single types:

| Single type | Sidebar / H1 | Field labels RU | English attr fallback |
|-------------|--------------|-----------------|------------------------|
| `index-page` | Главная | Yes (incl. nested `page.hero-media`) | none observed |
| `hotels-page` | Отелям | Yes | none observed |
| `dealers-page` | Дилерам | Yes (geography/packages) | none observed |
| `contacts-page` | Контакты | Yes; nested `page.office` shows `HTML iframe карты`, `Подпись вкладки`, … | none observed |
| `documents-page` | Документы | Yes | none observed |
| `download-catalog-page` | Страница «Скачать каталог» (sidebar) | Yes (`Отображение`, `Слайды`, `Заголовок`, `Лид`, …) | none on labels |

Screenshot: `evidence/task5-download-catalog-ru.png`

### Notes

- Enumeration **option values** in Select widgets may still show technical keys (`image_only`, `certificate`, …) while labels/translations exist in `ru.json`. Field labels themselves are Russian.
- Unrelated catalog single type `Catalog (new) hero slider` remains English (out of Wave 1 page CMS scope).
