# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-03)

**Core value:** Редактор меняет тексты/медиа публичных страниц в Strapi Admin на русском без деплоя фронта и без прямого доступа сайта к Strapi.
**Current focus:** Phase 4 — React hydrate. Design/plan **v2** locks merge semantics, repeatable categories, client lifecycle, mandatory DOM gate. **No hydrate code until user affirms.** No `strapi:sync-seed` / no push unless asked.

## Current Position

Phase: 4 of 6 (React Hydrate) — awaiting plan affirm (v2)
Plan: 04-01 DRAFT v2
Status: Phase 3 Complete; Phase 4 spec/plan revised for four ambiguities
Last activity: 2026-08-03 — Phase 4 design v2 (merge / repeatables / lifecycle / DOM)

Progress: [██████████] Phase 3 done; Phase 4 planning v2

## Performance Metrics

**Velocity:**
- Phase 1–3 complete locally (no push)

**By Phase:**

| Phase | Plans | Status |
|-------|-------|--------|
| 1. Shared Page Components | 1/1 | Complete |
| 2. Wave 1 Single Types | 1/1 | Complete (accepted) |
| 3. Feeds, Proxy & Seed | 1/1 | Complete (local; no push) |
| 4. React Hydrate | 0/1 | Spec/plan draft v2 — awaiting affirm |

## Accumulated Context

### Decisions

- Page content only via Node `GET /api/pages/:slug` (`strapi|memory-cache|disk-snapshot`)
- Frontend `src/` must not call Strapi page feeds / `:1337` (`check:pages-cms-isolation`)
- Seed writes `.tmp` only; snapshots in `public/pages-*.snapshot.json`
- Local-only: no push/PR/deploy; no sync-seed unless asked
- Phase 4 proposed: Option B + explicit merge/repeatable/lifecycle/DOM locks (design v2)

### Pending Todos

- User affirms Phase 4 design/plan **v2** → start Phase A (client/merge/unit harness only)

### Blockers/Concerns

None — blocked only on affirm before code.

## Session Continuity

Last session: 2026-08-03
Stopped at: Phase 4 design/plan v2 — awaiting affirm
Next: Affirm v2 → Phase A (typed merge + client lifecycle; no page wiring until B)
