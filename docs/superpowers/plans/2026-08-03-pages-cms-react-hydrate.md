# Pages CMS Phase 4 — React hydrate (execution plan)

**Date:** 2026-08-03
**Status:** draft — awaiting user affirm; **no hydrate application code until affirmed**
**Design:** [2026-08-03-pages-cms-react-hydrate-design.md](../specs/2026-08-03-pages-cms-react-hydrate-design.md)
**GSD phase:** `.planning/phases/04-react-hydrate/`
**Locality:** local commits only; **no push / PR / deploy**; **no `strapi:sync-seed`** unless separately requested

## Objective

Wave-1 React pages (`index`, `hotels`, `dealers`, `contacts`, `documents`, download-catalog **texts**) show CMS content from `GET /api/pages/:slug` while keeping hardcoded TSX as first safe paint, preserving email routing and runtime hooks.

## Locked product decisions

- Architecture Option B: shared pages client + optional prefetch + merge onto defaults.
- Hardcoded-first; never blank-gate the page on API.
- Map: `map_embed_url` → iframe `src` only; no HTML.
- download-catalog texts via pages API; slides unchanged.
- Email / `data-*` / document keys / package values code-owned.
- No hydrate code until this plan is affirmed.

## Global gates

- Work only in the local workspace.
- Every new behavior has an automated test before the phase step is marked complete.
- After each phase: run listed verify; record PASS/FAIL in the progress log.
- Do not start Phase 5 milestone gate as a substitute for Phase 4 verify.
- Isolation must remain green (`check:pages-cms-isolation`).

## Progress log

| Step | Command / artifact | Result |
|------|--------------------|--------|
| Design + plan draft | this file + design spec | awaiting affirm |
| Phase A | client + merge + harness | not started |
| Phase B | index + download-catalog texts | not started |
| Phase C | hotels + dealers | not started |
| Phase D | contacts + documents + map iframe | not started |
| Phase E | full local gate + FE-* docs | not started |

---

## Phase A — Shared client, types, merge, harnesses

**Goal:** Safe plumbing before touching page JSX.

### Tasks

1. Add `src/pages/pages-api.ts` (name flexible): `fetchPageContent(slug)`, `prefetchPageContent(slug)`, typed `{ data, source }`.
2. Pure `mergePageContent(slug, fallback, data)` (or per-slug mergers): apply CMS-owned fields only; reject illegal `document_key` / `package.value`; reject download-catalog `data` containing slides keys.
3. `usePageCms(slug, fallback)` (or equivalent): `useState(fallback)` → await prefetch/fetch → merge or keep fallback on failure.
4. Optional: wire early prefetch in `main.js` for wave-1 `data-page` values (same spirit as catalog/download prefetch).
5. Harness `check:pages-cms-hydrate` (or phase-a script):
   - merge positives from fixtures/snapshots shapes
   - negatives: invalid payload, slides bleed, bad package/document keys
   - assert client module string-contains only `/api/pages/` (not feeds / `:1337`)
6. Do **not** yet switch page components to the hook (or do behind a dead import only if needed for typecheck — prefer no page wiring until B).

### Verify

| Command | Expected |
|---------|----------|
| `npm run check:pages-cms-hydrate` (or phase-a) | PASS incl. negatives |
| `npm run check:pages-cms-isolation` | PASS |
| `npm run typecheck` | PASS |
| Diff | no visual page behavior change yet |

---

## Phase B — Index + download-catalog texts

**Goal:** First two consumers with lowest map/form complexity.

### Tasks

1. Extract/stabilize DEFAULT content for `IndexPage` and `DownloadCatalogPage`.
2. Wire `usePageCms` / merge for CMS-owned fields only.
3. Preserve index hooks (`#heroCommercialOfferLink`, play btn, `data-document="presentation"`, collections chrome).
4. Preserve download `data-download-doc="catalog"`, form ids, slider shells; do **not** hydrate slides from pages API.
5. Harness: after merge with fixture-shaped data, required hooks still present; slides runtime path untouched.

### Verify

| Command | Expected |
|---------|----------|
| Hydrate harness (index + download-catalog cases) | PASS |
| Isolation | PASS |
| `typecheck` | PASS |
| Manual optional: `/` and `/download-catalog` still usable offline API | readable fallback |

---

## Phase C — Hotels + dealers

**Goal:** Forms, packages, catalog/KP triggers.

### Tasks

1. Wire hotels + dealers hydrate.
2. Lock dealer `package.value` / `data-package` allowlist on merge.
3. Preserve hotels `data-open-commercial-offer`, `data-catalog`, `data-open-catalog`, `data-contact-form`.
4. Preserve dealers geography container id, FAQ/contact hooks.
5. Assert `getPageName` outputs for these routes unchanged (static test on `contact-forms.js` / known map).

### Verify

| Command | Expected |
|---------|----------|
| Hydrate harness (hotels + dealers + package allowlist negatives) | PASS |
| Email routing key snapshot / grep assert | unchanged |
| Isolation + typecheck | PASS |

---

## Phase D — Contacts + documents (+ map iframe)

**Goal:** Map URL + document keys.

### Tasks

1. Wire contacts + documents hydrate.
2. Contacts: when `map_embed_url` non-null, render iframe with that `src`; keep `data-map-tab` / `data-map-frame` / `#map-{slug}`; null → existing placeholder / JS map path.
3. **Never** `dangerouslySetInnerHTML` for map (or any CMS HTML blob).
4. Documents: preserve `document_key` allowlist and modal triggers (`data-document-request-trigger`, help).
5. Negatives: HTML in payload ignored; illegal document_key rejected.

### Verify

| Command | Expected |
|---------|----------|
| Hydrate harness (contacts map + documents keys) | PASS |
| Isolation + typecheck | PASS |

---

## Phase E — Full local gate + requirements closeout

**Goal:** Prove FE-01…05 locally; update docs.

### Tasks

1. Run: `check:pages-cms-isolation`, `check:pages-cms` / phase-e companion as appropriate, hydrate harness, `check:pages-api` if needed for live Node, `typecheck`, `build`.
2. Optional `check:catalog-api` / catalog-ui if stack up (no catalog regression from pages work).
3. Mark FE-01…05 Complete in REQUIREMENTS only after evidence.
4. Update STATE / ROADMAP Phase 4 Complete (local).
5. Local commits only; no push / no sync-seed.

### Verify (final)

| Command | Expected |
|---------|----------|
| Hydrate harness full | PASS |
| `npm run check:pages-cms-isolation` | PASS |
| `npm run check:pages-cms-phase-e` (or documented subset) | PASS |
| `npm run typecheck` / `npm run build` | PASS |
| `git diff --check` | PASS |
| Push / `strapi:sync-seed` | **not performed** |

---

## File touch map (expected)

| Area | Files (indicative) |
|------|--------------------|
| Client | `src/pages/pages-api.ts`, merge helpers, `usePageCms` |
| Prefetch | `src/main.js` (wave-1 only) |
| Pages | `src/components/pages/{Index,Hotels,Dealers,Contacts,Documents,DownloadCatalog}Page.tsx` |
| Shared sections | `src/components/marketing/shared-page-sections.tsx` only if props need CMS fields |
| Harness | `scripts/check-pages-cms-hydrate.mjs` (+ npm scripts) |
| Docs | progress log, STATE, REQUIREMENTS FE_* |

## Explicitly out of diff

- `getPageName` / `PAGE_EMAIL_ROUTING` key changes
- Strapi schemas / feeds / Node proxy (unless tiny bugfix discovered)
- Legal pages / catalog listing runtime
- `database/seed/data.db` via sync-seed
- Remote deploy / Timeweb

## Review checklist (user)

- [ ] Option B (shared client + hardcoded-first merge) affirmed
- [ ] download-catalog texts vs slides split affirmed
- [ ] Map iframe URL-only (no HTML) affirmed
- [ ] Email / hooks code-owned affirmed
- [ ] Phase order A→B→C→D→E affirmed
- [ ] No hydrate code until affirm

**Affirm to start Phase A:** user explicit go-ahead after reading this plan + design.
