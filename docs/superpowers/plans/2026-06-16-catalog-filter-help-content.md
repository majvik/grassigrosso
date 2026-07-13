# Catalog filter help content — GSD execution plan

**Date:** 2026-06-16  
**Spec:** [2026-06-16-catalog-filter-help-content-design.md](../specs/2026-06-16-catalog-filter-help-content-design.md)  
**Status:** implemented (2026-06-16)

## Goal-backward verification

| User-visible goal | Must be true after delivery |
|---|---|
| Тексты «Как выбрать» из Figma в модалках | 8 modals, не lorem |
| «Если коротко» как в макете | callout #f9f2dd, list, bold highlight |
| Блок сразу после заголовка | summary первый в body, не в конце |
| Редактируемость в админке | summary + segment variant fields |
| Работает на prod без живого Strapi | snapshot + seed |

## Phase 0 — Decisions ✅ (2026-06-16)

| ID | Decision | Status |
|---|---|---|
| 0.1 | Modal titles fillings/features → Figma («состав», «доп. особенности») + sync aria-label | ✅ |
| 0.2 | «Если коротко» у **всех 8** — генерируем тексты (черновики в spec) | ✅ pending copy OK |
| 0.3 | Пустого контента быть не должно — полный seed + snapshot | ✅ |
| 0.4 | Modal width **560px** — без изменений | ✅ |

**Gate:** пользователь OK на черновики «Если коротко» (7 фильтров) → старт Phase 1.

---

## Phase 1 — Strapi schema & API mapping

| ID | Task | Files |
|---|---|---|
| 1.1 | Component `catalog.filter-help-summary-item` (`lead`, `highlight`) | `strapi-catalog/src/components/catalog/filter-help-summary-item.json` |
| 1.2 | Extend `catalog.filter-help-segment`: `variant` enum, `list_index` | `strapi-catalog/src/components/catalog/filter-help-segment.json` |
| 1.3 | Extend `catalog-filter-help`: `summary_title`, `summary_items` | `schema.json` |
| 1.4 | RU admin labels | `strapi-catalog/src/admin/translations/ru.json` |
| 1.5 | `map-help-rows.js`: map summary + variant + listIndex | `strapi-catalog/src/api/catalog/utils/map-help-rows.js` |
| 1.6 | Populate summary in feed | `catalog-filter-feed.js` |
| 1.7 | Regenerate TS types | `strapi-catalog/types/generated/*.d.ts` |

**Verify:**

```bash
npm run develop --prefix strapi-catalog   # schema loads
curl -s http://127.0.0.1:1337/api/catalog-filter-feed | jq '.filterHelp.collection'
```

---

## Phase 2 — Figma content seed (all 8 modals)

| ID | Task | Files |
|---|---|---|
| 2.1 | Idempotent seed module with full Figma copy | `strapi-catalog/src/api/catalog/utils/seed-catalog-filter-help-content.js` |
| 2.2 | Wire bootstrap in `index.js` (skip if segments already filled) | `strapi-catalog/src/index.js` |
| 2.3 | Summary all 8 filters (collection from Figma + 7 generated drafts from spec) | seed data |
| 2.4 | Segment breakdown per modal (intro, headings, paragraphs, lists, numbered) | seed data |
| 2.5 | Update modal titles per Phase 0.1 | seed + bootstrap titles |

**Verify:**

- Strapi admin → 8 entries, collection has summary + ~15 segments; firmness has numbered list.
- `curl …/catalog-filter-feed` → `filterHelp.collection.summary.items | length == 4`.

---

## Phase 3 — Frontend types & renderer

| ID | Task | Files |
|---|---|---|
| 3.1 | Extend TS types: `summary`, `variant`, `listIndex` | `src/catalog/catalog-api.ts` |
| 3.2 | `parseHelpInlineBold()` utility | `src/catalog/catalog-filter-help-inline.ts` (new, small) |
| 3.3 | Rewrite `renderHelpBody()`: summary first, variant CSS, list grouping | `src/catalog/catalog-filter-help-modal.ts` |
| 3.4 | Replace lorem defaults | same file |
| 3.5 | CSS: summary callout, variants, spacing (width 560px unchanged) | `src/styles/catalog-page.css` |
| 3.6 | Sync modal titles + aria-labels for fillings/features | `catalog-page-data.ts`, `catalog.html`, defaults |

**Verify:**

```bash
npm run typecheck
CATALOG_UI_BASE_URL=http://127.0.0.1:5174 npm run check:catalog-ui   # if stack up
```

Manual: `/catalog` → каждый «Как выбрать?» → collection summary **под заголовком**, bold/headings/lists OK.

---

## Phase 4 — Snapshot, seed sync, smoke

| ID | Task | Files |
|---|---|---|
| 4.1 | Export snapshot | `npm run catalog:export-snapshot` |
| 4.2 | Sync seed DB | `npm run strapi:sync-seed` |
| 4.3 | Optional: assert filterHelp segments non-empty in API check | `scripts/check-catalog-api.mjs` |
| 4.4 | Commit `public/catalog-filters.snapshot.json`, `database/seed/data.db` | git |

**Verify:**

```bash
npm run check:catalog-api
# Strapi stopped → filters still return filterHelp from snapshot
```

---

## Phase 5 — Post-deploy smoke

| ID | Task |
|---|---|
| 5.1 | Push → Timeweb dev |
| 5.2 | Browser MCP: open `/catalog`, spot-check 2–3 modals + collection summary position |
| 5.3 | Update plan status + spec status → done |

---

## Risk register

| Risk | Mitigation |
|---|---|
| Большой объём seed-текста (~800 строк) | отдельный seed-модуль, не inline в index.js |
| Inline bold XSS | только `**…**` → `createElement('strong')`, без HTML |
| Старые сегменты без `variant` | default `paragraph` в mapper |
| Редакторы перепутают variant | RU labels + порядок полей в админке |
| Modal scroll на mobile | сохранить max-height + overflow-y |

## Estimate

| Phase | Effort |
|---|---|
| 1 Schema/API | ~2h |
| 2 Content seed | ~3h (copy-paste from Figma + structuring) |
| 3 Frontend/CSS | ~2h |
| 4 Snapshot/smoke | ~1h |
| **Total** | **~1 day** |

## Phase status

| Phase | Status |
|---|---|
| 0 Decisions | done |
| 1 Schema | done |
| 2 Seed | done |
| 3 Frontend | done |
| 4 Snapshot | done |
| 5 Deploy smoke | pending push |
