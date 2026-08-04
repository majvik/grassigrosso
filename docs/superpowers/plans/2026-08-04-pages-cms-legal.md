# Pages CMS Phase 6 — Legal pages (execution plan) v2.1

**Date:** 2026-08-04
**Status:** Phase A **Accepted**; Phase B+C **Done locally**; Phase D next
**Design:** [2026-08-04-pages-cms-legal-design.md](../specs/2026-08-04-pages-cms-legal-design.md)
**Contract:** [.planning/phases/06-legal-pages/06-CONTENT-CONTRACT.md](../../.planning/phases/06-legal-pages/06-CONTENT-CONTRACT.md)
**Depends on:** Phase 5 accepted (`7d26bcb`)

## Progress

| Phase | Goal | Status |
|-------|------|--------|
| A | Content contract + L1–L18 freeze | **Accepted** (v2.1) |
| B | Schemas + RU + feeds + hard gates | **Done locally** |
| C | Proxy / seed `.tmp` / snapshots (9 slugs) | **Done locally** |
| D | Hydrate + mandatory parity (+ optional generator) | **next** |
| E | `check:pages-cms-phase-6` closeout | blocked |

## Phase C notes

- Fixtures: `scripts/fixtures/pages-cms/{privacy,terms,cookies}.json` — counts **55 / 37 / 17**; parity via `pages-cms:check-legal-fixtures`.
- Seed: `pages-cms:seed` / `pages-cms:seed:preflight` → local `.tmp` only; inject-after-legal rollback; no media for legal; no `strapi:sync-seed`.
- Node: `PAGES_CMS_SLUGS` = 9; `/api/pages/{privacy,terms,cookies}`; runtime `canonicalizeLegalPageData`; sources `strapi` | `memory-cache` | `disk-snapshot`.
- Snapshots: `public/pages-{privacy,terms,cookies}.snapshot.json` + 9-slug manifest; atomic exporter refuse non-`strapi`.
- Gate: `npm run check:pages-cms-phase-6c` (owned dynamic ports; self-cleaning uploads/porcelain).

## Phase B notes

- Schema representability: Strapi 5.42.1 boots with nested DZ + components; public JSON via `canonicalizeLegalPageData` (discriminator `link_label` → `children`).
- Gate: `npm run check:pages-cms-phase-6b` (owned dynamic port; forbidden ports untouched).

## Later phases

- **D:** defaults from `LEGAL_PAGES`; hydrate; **mandatory** parity gate; optional HTML generator.
- **E:** phase-6 closeout (not Phase 5 aggregator).

## Non-goals

Thin shell; CMS `updatedAt`; push/sync-seed/deploy without ask; Phase D hydrate in this commit set.

---

*Plan v2.1 + Phase C done: 2026-08-04*
