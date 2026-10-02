# Catalog filter help copy (2026-09-07) — design spec

**Date:** 2026-10-02  
**Status:** in progress  
**Source package:** `client-documents/catalog-modal-copy-2026-09-07/` (gitignored)  
**Client copy:** `client-copy.md` extracted from `GRASSIGROSSO_HOW_TO_CHOOSE_FINAL_SEP_07_2026.docx`

## Problem

Восемь модалок «Как выбрать?» уже живут в Strapi `catalog-filter-help` и в `public/catalog-filters.snapshot.json`. Клиент утвердил новую редакцию от 07.09.2026. Правки только data-файла недостаточно: `seedCatalogFilterHelpContent` пропускает строки с уже заполненными `segments` и синхронизирует лишь `modal_title`. Локальная и seed-БД останутся на старом тексте.

## Constraints / invariants

- Ключи без изменений: `collection`, `size`, `firmness`, `type`, `loadRange`, `heightRange`, `fillings`, `features`.
- UI/DOM/CSS/`catalog-filter-help-modal.ts` не менять, пока текст укладывается в `intro | heading | paragraph | listItem | numberedListItem`.
- Markdown-bold (`**…**`) в `body` сохраняется; HTML не вставлять.
- Фронт по-прежнему только через `GET /api/catalog/filters`.
- Bootstrap не должен безусловно перезаписывать админские правки при каждом старте.
- Тесты не читают `client-documents/`.
- Локально: без push/PR/deploy.

## Summary policy

«Если коротко» в клиентском файле явно дано только для **Коллекции**. Для остальных семи ключей существующий `summary_items` **сохраняется без изменений**.

Collection summary совпадает с текущим seed (4 пункта Classic / Flexi / Relax / Trend).

## Bold policy

Клиентский Markdown не содержит `**`. Смысловое выделение берём из текущего seed-паттерна:

- имена коллекций и префиксы списков (`**90×200**`, `**Спите на спине**`, виды блоков);
- уже выделенные термины (`**уровень комфорта**`, `**на одно спальное место**`, `**трём критериям**` и т.п.), если фраза осталась в новой редакции.

Новый bold в середину абзацев не добавляем.

## Editorial leftover (не публикуем)

В извлечённом тексте заголовок:

`Двусторонние и односторонние матрасы - ЗАКОНЧИЛИ ТУТ`

`ЗАКОНЧИЛИ ТУТ` — пометка редактора, не клиентский UI-текст. В seed уходит заголовок `Двусторонние и односторонние матрасы`.

## Client typos kept (не правим молча)

| Место | Как в клиентском тексте | Вероятная норма |
|---|---|---|
| firmness / здоровье | `опорно-дигательного` | опорно-двигательного |
| firmness / п.2 | `на время Предпочитают` | предпочитают |
| height / <20 см | `подверженны` | подвержены |
| fillings heading | `Форплит` | Фурплит |
| load / скрип | `нектарного полотна` | нетканого полотна |

Лишние пробелы в исходнике схлопываются до одного (в HTML они всё равно не видны).

## Root cause

Idempotent seed v1 (`catalog-filter-help-content-v1`) считает заполненные `segments` «уже посеянными» и больше не трогает copy. Нужен **версионированный one-shot upsert** с marker в `strapi_core_store_settings`, по образцу `catalog.mattress-size.current-list-cleanup.v1`.

## Proposed delivery

1. Обновить канон `seed-catalog-filter-help-content-data.js` дословно по `client-copy.md` + политики выше.
2. В `seed-catalog-filter-help-content.js`:
- marker `catalog.catalog-filter-help.copy.v2-20260907.1` (`.1` потому что первый apply наткнулся на ещё неполный канон);
   - если marker нет — upsert `modal_title`, `summary_title`, `summary_items`, `segments` ровно у 8 ключей, без дубликатов;
   - записать marker;
   - если marker есть — не перезаписывать copy; v1-поведение остаётся для пустых/отсутствующих строк.
3. После применения: `catalog:export-snapshot` (и `strapi:sync-seed`, если менялась рабочая SQLite).
4. Regression script `scripts/check-catalog-filter-help-copy.mjs`.

## Success criteria

1. Восемь модалок в каноне, feed mapper и snapshot совпадают по ключам, заголовкам и новой редакции (с задокументированными summary/bold/ЗАКОНЧИЛИ ТУТ).
2. Повторный bootstrap не меняет данные и не создаёт дубликаты.
3. После появления marker ручные правки в админке не затираются.
4. `check:catalog-filter-help-copy`, `typecheck`, `build`, `check:catalog-api`, `check:catalog-ui`, `check:catalog-perf` зелёные локально.
5. Нет push/deploy.
