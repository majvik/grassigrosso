# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-03)

**Core value:** Редактор меняет тексты/медиа публичных страниц в Strapi Admin на русском без деплоя фронта и без прямого доступа сайта к Strapi.
**Current focus:** Phase 4B harden delivered (parity fixtures/snapshots, certification baseline, catalog_pdf download). Awaiting accept before C. No `strapi:sync-seed` / no push unless asked.

## Current Position

Phase: 4 of 6 (React Hydrate) — Phase B harden complete, awaiting accept
Plan: 04-01 Phase B harden DONE
Status: hydrate unit (defaultsParity+catalogPdf) + hydrate-dom + isolation + typecheck green; section height stable on parity
Last activity: 2026-08-03 — Phase B harden

Progress: [██████████] Phase 3 done; Phase 4A accepted; Phase 4B harden local done

## Performance Metrics

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Shared Page Components | 1/1 | Complete |
| 2. Wave 1 Single Types | 1/1 | Complete (accepted) |
| 3. Feeds, Proxy & Seed | 1/1 | Complete (local; no push) |
| 4. React Hydrate | 0/1 | Phase B harden — awaiting accept |

## Accumulated Context

### Decisions

- Page content only via Node `GET /api/pages/:slug`
- Index fixtures/snapshots must match React CMS defaults (content-equal parity)
- Index certification marketing cards are code-owned; CMS `docs` separate
- download-catalog: texts via pages API; slides unchanged; `catalog_pdf` preferred for download with `/api/download/catalog` fallback
- Local-only: no push/PR/deploy; no sync-seed unless asked

### Pending Todos

- User affirms Phase 4B harden → start Phase C (hotels + dealers + DOM slice)
- Optional later: re-seed local Strapi `.tmp` from updated fixtures (no sync-seed unless asked)

### Blockers/Concerns

None — blocked only on Phase B accept before C.

## Session Continuity

Last session: 2026-08-03
Stopped at: Phase 4B harden complete — awaiting accept
Next: Phase C after accept (still no push / sync-seed)
