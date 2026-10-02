# Catalog filter help copy (2026-09-07) — GSD execution plan

**Date:** 2026-10-02  
**Spec:** [2026-10-02-catalog-filter-help-copy-design.md](../specs/2026-10-02-catalog-filter-help-copy-design.md)  
**Status:** complete locally

## Goal-backward verification

| User-visible goal | Must be true after delivery |
|---|---|
| Тексты модалок = утверждённая редакция 07.09.2026 | 8 ключей, без `ЗАКОНЧИЛИ ТУТ` |
| Уже заполненная локальная БД обновляется | one-shot upsert + core store marker |
| Повторный старт Strapi не затирает админку | marker присутствует → skip rewrite |
| Prod fallback | snapshot JSON содержит ту же редакцию |
| Нет регрессии каталога | api/ui/perf + typecheck/build |

## Phase 1 — Regression harness ✅

| ID | Task | Files |
|---|---|---|
| 1.1 | Скрипт контракта канона, mapper, идемпотентности миграции, snapshot | `scripts/check-catalog-filter-help-copy.mjs` |
| 1.2 | npm script | `package.json` |

**Verify:** `npm run check:catalog-filter-help-copy` — PASS after copy + snapshot.

## Phase 2 — Canonical copy ✅

| ID | Task | Files |
|---|---|---|
| 2.1 | Обновить 8 модалок в data-файле | `strapi-catalog/src/api/catalog/utils/seed-catalog-filter-help-content-data.js` |

**Verify:** канон + mapper зелёные в том же скрипте.

## Phase 3 — Versioned upsert ✅

| ID | Task | Files |
|---|---|---|
| 3.1 | Marker `catalog.catalog-filter-help.copy.v2-20260907.1` + upsert 8 ключей | `strapi-catalog/src/api/catalog/utils/seed-catalog-filter-help-content.js` |
| 3.2 | Сохранить v1 fill-empty для отсутствующих строк | тот же файл |

**Verify:** mock в `check:catalog-filter-help-copy` — первый прогон updated=8 + marker, второй no-op и сохраняет admin edit.

Первый live-apply (`v2-20260907`) случился на неполном каноне; повтор — `.1`.

## Phase 4 — Local apply + snapshot + catalog gates ✅

| ID | Task | Result |
|---|---|---|
| 4.1 | Strapi bootstrap | `copy revision (...v2-20260907.1): created=0, updated=8` |
| 4.2 | `npm run catalog:export-snapshot` | PASS, 43 products |
| 4.3 | `npm run strapi:sync-seed` | PASS (WAL checkpoint, seed 3152 KiB) |
| 4.4 | catalog gates | see below |

## Tests added

- `npm run check:catalog-filter-help-copy`

## Local commands / results

```text
npm run check:catalog-filter-help-copy
PASS

npm run typecheck
PASS — tsc --noEmit

npm run build
PASS — Vite build + Strapi build + prepare-dist

npm run check:catalog-api
PASS — Catalog API ok: http://127.0.0.1:3000

CATALOG_UI_BASE_URL=http://127.0.0.1:5174 npm run check:catalog-ui
PASS — Catalog UI smoke ok

CATALOG_PERF_BASE_URL=http://127.0.0.1:5174 npm run check:catalog-perf
PASS — Catalog perf ok
```

`public/download-catalog-slides.snapshot.json` после export откатили: это чужой слайдер, не часть модалок.
