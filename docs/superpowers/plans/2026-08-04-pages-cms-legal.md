# Pages CMS Phase 6 — Legal pages (execution plan) v2.1

**Date:** 2026-08-04
**Status:** Phase 6 **Complete locally, pending review**
**Design:** [2026-08-04-pages-cms-legal-design.md](../specs/2026-08-04-pages-cms-legal-design.md)
**Contract:** [.planning/phases/06-legal-pages/06-CONTENT-CONTRACT.md](../../.planning/phases/06-legal-pages/06-CONTENT-CONTRACT.md)
**Depends on:** Phase 5 accepted (`7d26bcb`)

## Progress

| Phase | Goal | Status |
|-------|------|--------|
| A | Content contract + L1–L18 freeze | **Accepted** (v2.1) |
| B | Schemas + RU + feeds + hard gates | **Done locally** |
| C | Proxy / seed `.tmp` / snapshots (9 slugs) | **Done locally** |
| D | Hydrate + mandatory parity (+ SSR generator) | **Done locally** |
| E | `check:pages-cms-phase-6` closeout | **Done locally** |

## Phase D notes

- Structured defaults: `src/pages/legal-defaults/*.json` (55/37/17)
- Renderer: `legal-renderer.tsx` — no `dangerouslySetInnerHTML`
- Hydrate: `LegalPage` + `usePageCms`
- SSR strategy: **build-time generator** (`pages-cms:generate-legal-ssr`) with markers
- Gates: `check:pages-cms-phase-6d`, hydrate unit/DOM legal slice

## Phase E notes

- Aggregator: `npm run check:pages-cms-phase-6` / `:record`
- Evidence: `.planning/phases/06-legal-pages/06-SUITE-RESULTS.md`
- Phase 5 aggregator unchanged

## Non-goals

Thin shell; CMS `updatedAt`; push/sync-seed/deploy without ask.

---

*Plan v2.1 + Phase 6 complete locally: 2026-08-04*
