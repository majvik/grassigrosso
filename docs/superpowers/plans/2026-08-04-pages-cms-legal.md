# Pages CMS Phase 6 — Legal pages (execution plan) v2.1

**Date:** 2026-08-04
**Status:** Phase A **Accepted**; Phase B **Done locally**; Phase C next
**Design:** [2026-08-04-pages-cms-legal-design.md](../specs/2026-08-04-pages-cms-legal-design.md)
**Contract:** [.planning/phases/06-legal-pages/06-CONTENT-CONTRACT.md](../../.planning/phases/06-legal-pages/06-CONTENT-CONTRACT.md)
**Depends on:** Phase 5 accepted (`7d26bcb`)

## Progress

| Phase | Goal | Status |
|-------|------|--------|
| A | Content contract + L1–L18 freeze | **Accepted** (v2.1) |
| B | Schemas + RU + feeds + hard gates | **Done locally** |
| C | Proxy / seed `.tmp` / snapshots (9 slugs) | **next** |
| D | Hydrate + mandatory parity (+ optional generator) | blocked |
| E | `check:pages-cms-phase-6` closeout | blocked |

## Phase B notes

- Schema representability: Strapi 5.42.1 boots with nested DZ + components; public JSON via `canonicalizeLegalPageData` (discriminator `link_label` → `children`).
- Gate: `npm run check:pages-cms-phase-6b` (owned dynamic port; forbidden ports untouched).
- Node `PAGES_CMS_SLUGS` remains 6 until Phase C.

## Later phases

- **C:** extend Node allowlist to 9; fixtures; seed `.tmp` only; snapshots; pages-api non-regression.
- **D:** defaults from `LEGAL_PAGES`; hydrate; **mandatory** parity gate; optional HTML generator.
- **E:** phase-6 closeout (not Phase 5 aggregator).

## Non-goals

Thin shell; CMS `updatedAt`; push/sync-seed/deploy without ask.

---

*Plan v2.1 + Phase B done: 2026-08-04*
