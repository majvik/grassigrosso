# Pages CMS Phase 4 — React hydrate (execution plan)

**Date:** 2026-08-03
**Status:** draft v2 — awaiting affirm of merge/lifecycle/DOM locks; **no hydrate application code until affirmed**
**Design:** [2026-08-03-pages-cms-react-hydrate-design.md](../specs/2026-08-03-pages-cms-react-hydrate-design.md)
**GSD phase:** `.planning/phases/04-react-hydrate/`
**Locality:** local commits only; **no push / PR / deploy**; **no `strapi:sync-seed`** unless separately requested

## Objective

Wave-1 React pages (`index`, `hotels`, `dealers`, `contacts`, `documents`, download-catalog **texts**) show CMS content from `GET /api/pages/:slug` while keeping hardcoded TSX as first safe paint, preserving email routing and runtime hooks.

## Locked product decisions

- Architecture Option B: shared pages client + hardcoded-first merge.
- Merge semantics, repeatable categories, client lifecycle, and **mandatory** DOM gate — see design §1–§4 (not optional).
- Map: `map_embed_url` → iframe `src` only; no HTML.
- download-catalog texts via pages API; slides unchanged.
- Email / behavioral keys code-owned.
- No hydrate code until this plan is affirmed.

## Global gates

- Work only in the local workspace.
- Every new behavior has an automated test before the phase step is marked complete.
- After each phase: run listed verify; record PASS/FAIL in the progress log.
- Isolation must remain green (`check:pages-cms-isolation`).
- Browser/DOM hydrate gate is **required** for Phase E and for each page once wired (B–D).

## Progress log

| Step | Command / artifact | Result |
|------|--------------------|--------|
| Design + plan draft v1 | Option B sketch | superseded by v2 |
| Design + plan draft v2 | merge/lifecycle/DOM locks | awaiting affirm |
| Phase A | client + merge + unit harness | not started |
| Phase B | index + download-catalog texts + DOM slice | not started |
| Phase C | hotels + dealers + DOM slice | not started |
| Phase D | contacts + documents + map + DOM slice | not started |
| Phase E | full unit + DOM (all 6) + FE-* docs | not started |

---

## Phase A — Shared client, typed merge, unit harnesses

**Goal:** Safe plumbing before touching page JSX. Encode design §1–§3 in code + tests.

### Tasks

1. `src/pages/pages-api.ts`: allowlisted slugs; **one in-flight Promise per slug**; timeout; runtime envelope + required-roots validator; success-only session cache; clear map entry on failure/reject so retry works.
2. Pure `mergePageContent(slug, fallback, data)` implementing:
   - absence → fallback; atomic reject; null/empty string rules; media rules;
   - content-only vs behavior-bound arrays per design table (`packages.value`, `document_key`, `offices.slug`, `catalog_key`, `contact_info.icon_key`, etc.).
3. `usePageCms(slug, fallback)`: `useState(fallback)`; await shared promise; merge or keep fallback; **no setState after unmount**.
4. Optional early prefetch wiring in `main.js` (same lifecycle) — may land in A or with first page in B.
5. Harness `check:pages-cms-hydrate` (unit / node):
   - merge positives (fixtures/snapshots shapes)
   - negatives: empty string on required text; illegal `null`; empty `[]` on behavior-bound; unknown/duplicate stable keys; slides bleed; partial-apply impossible (assert full fallback identity on reject)
   - client lifecycle: single in-flight; failed promise cleared; invalid not cached
   - client source only `/api/pages/`
6. **No page component wiring yet.**

### Verify

| Command | Expected |
|---------|----------|
| `npm run check:pages-cms-hydrate` | PASS (merge + lifecycle negatives) |
| `npm run check:pages-cms-isolation` | PASS |
| `npm run typecheck` | PASS |
| Diff | no page visual behavior change |

---

## Phase B — Index + download-catalog texts

**Goal:** First consumers + first DOM gate slice.

### Tasks

1. DEFAULT extraction + `usePageCms` for Index + DownloadCatalog texts.
2. Preserve code hooks (design critical selectors).
3. Slides path untouched.
4. DOM harness cases for these two pages: delayed / success / failure / no raw HTML; FE-05 parity geometry on index (and download chrome left/width).

### Verify

| Command | Expected |
|---------|----------|
| `check:pages-cms-hydrate` | PASS |
| `check:pages-cms-hydrate-dom` (index + download-catalog) | PASS |
| Isolation + typecheck | PASS |

---

## Phase C — Hotels + dealers

**Goal:** behavior-bound `catalog_key` / `packages.value` / `contact_info.icon_key`.

### Tasks

1. Wire hotels + dealers.
2. Merge negatives already in unit harness; DOM asserts `data-catalog`, `data-package`, form hooks.
3. Static assert `getPageName` / routing keys unchanged.

### Verify

| Command | Expected |
|---------|----------|
| Hydrate unit + DOM (hotels + dealers) | PASS |
| Email key assert | unchanged |
| Isolation + typecheck | PASS |

---

## Phase D — Contacts + documents (+ map iframe)

**Goal:** `offices.slug`, document keys, map URL-only.

### Tasks

1. Wire contacts + documents.
2. Iframe when `map_embed_url` non-null; null → placeholder/JS map; never HTML.
3. DOM: map hooks + document hooks; raw HTML absent; FE-05 chrome geometry.

### Verify

| Command | Expected |
|---------|----------|
| Hydrate unit + DOM (contacts + documents) | PASS |
| Isolation + typecheck | PASS |

---

## Phase E — Full local gate + requirements closeout

**Goal:** All six pages in mandatory DOM gate; FE-01…05 evidence.

### Tasks

1. Run full: isolation, pages-cms companion / phase-e as documented, hydrate unit, **hydrate-dom all six** (delayed/success/failure/HTML/FE-05), typecheck, build.
2. Catalog checks if stack up (no regression).
3. Mark FE-01…05 Complete only after evidence; update STATE/ROADMAP.
4. Local commits only; no push / no sync-seed.

### Verify (final)

| Command | Expected |
|---------|----------|
| `check:pages-cms-hydrate` | PASS |
| `check:pages-cms-hydrate-dom` (all 6 pages × scenarios) | PASS |
| `check:pages-cms-isolation` | PASS |
| `check:pages-cms-phase-e` (or documented subset) | PASS |
| `typecheck` / `build` | PASS |
| `git diff --check` | PASS |
| Push / `strapi:sync-seed` | **not performed** |

---

## File touch map (expected)

| Area | Files (indicative) |
|------|--------------------|
| Client | `src/pages/pages-api.ts`, merge module, `usePageCms` |
| Prefetch | `src/main.js` |
| Pages | six wave-1 `src/components/pages/*Page.tsx` |
| Harness | `scripts/check-pages-cms-hydrate.mjs`, `scripts/check-pages-cms-hydrate-dom.mjs` |
| Docs | progress log, STATE, REQUIREMENTS FE_* |

## Explicitly out of diff

- `getPageName` / `PAGE_EMAIL_ROUTING` key changes
- Strapi schemas / feeds / Node proxy (unless tiny bugfix)
- Legal / catalog listing
- sync-seed / remote deploy

## Review checklist (user)

- [x] Option B direction (prior accept)
- [x] Node-only API, map URL-only, texts≠slides, email/behavioral code-owned, A→E, local-only (prior accept)
- [ ] Merge semantics §1 (absence / null / empty string / empty array / atomic reject)
- [ ] Repeatable table §2 (content-only vs behavior-bound paths)
- [ ] Client lifecycle §3 (in-flight, no poison cache, clear on reject, no setState after unmount, runtime validator)
- [ ] Mandatory DOM gate §4 (six pages, scenarios, hooks, FE-05 geometry)
- [ ] No hydrate code until affirm

**Affirm to start Phase A:** user explicit go-ahead after reading design v2 + this plan.
