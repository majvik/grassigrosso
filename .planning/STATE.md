# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-03)

**Core value:** Редактор меняет тексты/медиа публичных страниц в Strapi Admin на русском без деплоя фронта и без прямого доступа сайта к Strapi.
**Current focus:** Phase 3 E isolation harden (untracked scan + negatives), then Phase 4 hydrate. No `strapi:sync-seed` / no push unless asked.

## Current Position

Phase: 3 of 6 (Feeds, Proxy & Seed) — Phase E re-accept
Plan: 03-01 IN PROGRESS (isolation hole fix)
Status: Isolation scans filesystem (incl. untracked); negatives for `:1337` / page-feed / `VITE_STRAPI_*`
Last activity: 2026-08-03 — fixed isolation `git ls-files` hole; awaiting Phase E re-accept

Progress: [█████████░] Phase 3 pending E re-accept

## Performance Metrics

**Velocity:**
- Phase 1–3 complete locally (no push)

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Shared Page Components | 1/1 | Complete |
| 2. Wave 1 Single Types | 1/1 | Complete (accepted) |
| 3. Feeds, Proxy & Seed | 1/1 | Pending Phase E re-accept |
| 4. React Hydrate | 0/TBD | Not started |

## Accumulated Context

### Decisions

- Page content only via Node `GET /api/pages/:slug` (`strapi|memory-cache|disk-snapshot`)
- Frontend `src/` must not call Strapi page feeds / `:1337` (`check:pages-cms-isolation`)
- Seed writes `.tmp` only; snapshots in `public/pages-*.snapshot.json`
- Local-only: no push/PR/deploy; no sync-seed unless asked

### Pending Todos

- Phase 4: React hydrate for wave-1 pages from Node pages API

### Blockers/Concerns

None for Phase 3.

## Session Continuity

Last session: 2026-08-03
Stopped at: Phase E isolation harden (fs walk + negatives) — awaiting re-accept
Next: Phase E re-accept → close Phase 3 → Phase 4 hydrate
