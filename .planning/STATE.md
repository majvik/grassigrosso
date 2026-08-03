# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-03)

**Core value:** Редактор меняет тексты/медиа публичных страниц в Strapi Admin на русском без деплоя фронта и без прямого доступа сайта к Strapi.
**Current focus:** Phase 3 — Phase C harness PASS (pending accept); Phase D Node proxy next. No `server.cjs` page proxy yet. No `strapi:sync-seed`.

## Current Position

Phase: 3 of 6 (Feeds, Proxy & Seed) — IN PROGRESS
Plan: 03-01 Phase A+B accepted; Phase C harness green
Status: `check:pages-cms-phase-c` PASS (6 feeds + deep-populate + N7)
Last activity: 2026-08-03 — Phase C Strapi page feeds + integration harness

Progress: [████████▓░] 90%

## Performance Metrics

**Velocity:**
- Phase 1–2 complete locally (no push)
- Phase 3A–3C complete locally (no push)

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Shared Page Components | 1/1 | Complete |
| 2. Wave 1 Single Types | 1/1 | Complete (accepted) |
| 3. Feeds, Proxy & Seed | 0/1 | A+B accepted; C harness green; D next |

## Accumulated Context

### Decisions

- Phase 3 envelope + map allowlist locked in Phase A
- download-catalog page canonical = texts/PDF only
- Seed writes `.tmp` only; backup under `.tmp/pages-cms-seed-backups/`; restore on failure
- SQLite backup via better-sqlite3 `backup()` + WAL/SHM clear on restore; upload FS prune on failure
- Harness never kills `:1337` — refuses with instruction if busy
- Media aliases map fixture URLs to existing public assets (Cyrillic PDFs, partners logos, etc.)
- Logical digests are content-addressed (strip surrogate ids; include component trees + media file identities) for seed×2 and inject rollback
- Six page feeds live under `api/pages-cms` (not `catalog/`) to keep catalog-scope clean
- Local-only: no push/PR/deploy; no sync-seed unless asked

### Pending Todos

- User accept Phase C
- Phase D: narrow catalog-scope → Node `GET /api/pages/:slug` + cache/snapshots/exporter

### Blockers/Concerns

None for Phase C harness (green locally).

## Session Continuity

Last session: 2026-08-03
Stopped at: Phase C harness PASS — awaiting accept
Next: Phase D after Phase C acceptance
