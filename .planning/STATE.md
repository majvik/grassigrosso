# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-03)

**Core value:** Редактор меняет тексты/медиа публичных страниц в Strapi Admin на русском без деплоя фронта и без прямого доступа сайта к Strapi.
**Current focus:** Phase 2 Task 2 closed — 16 components + reserved `document_id` regression; ready for Task 3 single types

## Current Position

Phase: 2 of 6 (Wave 1 Single Types)
Plan: 02-01 in progress (Tasks 1–2 done; Task 3 next)
Status: Components gate PASS 16/16; Strapi 5.42.1 boots; strict FAIL until single types
Last activity: 2026-08-03 — Task 2 commit prep: reserved-attr harness regression + local verify

Progress: [███░░░░░░░] 33%

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Phase 2 Task 1: contract + harness (accepted)
- Phase 2 Task 2: 16 components + components gate

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Shared Page Components | 1/1 | Complete |
| 2. Wave 1 Single Types | 0/1 | Task 2/6 done |

## Accumulated Context

### Decisions

- Schema from render inputs (content contract), not section names alone
- Start Phase 2 with contract + automated harness before Strapi schemas
- Contacts: CMS `map_iframe_html` per office; current Yandex lat/lng is migration/seed source; API-06 normalizes URL
- Harness gates: `contract` → `components` (Task 2) → `strict-schemas` (Task 3+)
- Local-only: no push/PR/deploy

### Pending Todos

- Phase 2 Task 3: five Wave 1 single types (+ fixtures already in scripts/fixtures)
- Task 4: extend download-catalog-page
- Task 5: full RU Admin labels
- Task 6: regression / scope guard

### Blockers/Concerns

None for Task 2. Do not skip to feeds/frontend.

## Session Continuity

Last session: 2026-08-03
Stopped at: Task 2 complete (components + document_key + reserved regression + Strapi boot)
Next: Task 3 single types (`index-page` … `documents-page`) under strict gate
