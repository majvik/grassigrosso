# Pages CMS Phase 4 — React hydrate (execution plan)

**Date:** 2026-08-03
**Status:** Phase A–E accepted (`2d7ca10`); Phase 4 closed locally. No push / no `strapi:sync-seed`.
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
- **Hydrate fills existing baseline slots only** — no new sections/cards from CMS arrays beyond baseline UI.
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
| Design + plan draft v2 | merge/lifecycle/DOM locks | affirmed |
| Phase A | client + merge + unit harness | DONE — accepted |
| Phase B | index + download-catalog texts + DOM slice | DONE — accepted (`a537e6f` + `825deb0`) |
| Phase C | hotels + dealers + DOM slice | DONE — accepted (`97ab57e` + `02d254b`) |
| Phase D | contacts + documents + map + DOM slice | DONE — accepted (`72c3ab9` + `a7f5816`) |
| Phase E | full unit + DOM (all 6) + FE-* docs | DONE — accepted (`2d7ca10`) |

### Phase E harden (uploads drift)

- `scripts/lib/pages-cms-uploads-guard.mjs`: fingerprint = path+size+SHA-256; cleanup deletes additions only; missing/changed → FAIL
- `check-pages-cms.mjs` full mode: probe (sentinel preserved + delete/change negatives); finally cleanup on PASS/FAIL/signal; porcelain postcondition
- Removed leftover 26 untracked generated uploads from prior non-cleaning run
- Verify 2026-08-04: full gate PASS + porcelain match; content fingerprint (path+size+SHA-256) + delete/change negatives PASS; awaiting accept (Phase E/5 not closed)

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

### Post-fix (Phase A)

- Modules: `src/pages/pages-api.ts`, `pages-cms-validate.ts`, `pages-cms-merge.ts`, `pages-cms-descriptors.ts`, `pages-cms-mount-guard.ts`, `use-page-cms.ts`
- Harness: `npm run check:pages-cms-hydrate` — descriptors for content-only items; path-specific media nullability; data-driven behavior-bound negatives (all 7 paths × pages); timeout/abort + invalid JSON + retry
- Wired into `check:pages-cms` companion
- Evidence: hydrate/isolation/typecheck PASS; no `src/components/pages/*` edits
- Harden: schema-derived descriptors from content-contract (component/path); coverage gate + fixture parity×6; no key-based media inference; offices `map_embed_url` public override

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

### Post-verify (Phase B)

- `IndexPage` + `DownloadCatalogPage` texts via `usePageCms`; slides path untouched
- `INDEX_PAGE_DEFAULTS` / `DOWNLOAD_CATALOG_TEXT_DEFAULTS`; critical hooks preserved
- Fixtures + `public/pages-{index,download-catalog}.snapshot.json` synced from defaults (`pages:sync-defaults-fixtures`); unit gate defaults↔fixture↔snapshot
- Code-owned `INDEX_CERTIFICATION_CARDS` (3) are the complete Index certification surface; `index.docs` is merge-only and must not create a DOM consumer (`/documents` owns document cards)
- DOM baseline uses an exact top-level section allowlist and exact certification-card count; extra CMS-driven section/card/grid → FAIL
- `catalog_pdf` → `data-catalog-pdf` → `resolveDocumentDownloadHref` with `/api/download/catalog` fallback
- DOM: delayed baseline counts; failure 404/503/network/invalid; success media/PDF; FE-05 top/left/width parity (section height stable)
- Evidence: hydrate unit + DOM + isolation + typecheck PASS; no hotels/dealers/contacts/documents wiring; no seed/push

### Verify

| Command | Expected |
|---------|----------|
| `check:pages-cms-hydrate` | PASS (incl. defaultsParity + catalogPdf) |
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

| Command | Expected | Result (2026-08-04) |
|---------|----------|---------------------|
| Hydrate unit + DOM (hotels + dealers) | PASS | PASS (unit + DOM 4 pages) |
| Email key assert | unchanged | PASS (hydrate unit) |
| Isolation + typecheck | PASS | PASS |

### Delivered

- `hotels-page-defaults.ts` / `dealers-page-defaults.ts` + `usePageCms` in page components
- Fixtures/snapshots synced from defaults; quality video code-owned
- Slot allowlists: hotels 7 sections, dealers 9; no new cards/sections
- Prefetch hotels/dealers in `main.js`
- DOM: delayed/404/503/network/invalid/success/FE-05 for hotels+dealers (keeps index+download-catalog)

---

## Phase D — Contacts + documents (+ map iframe)

**Goal:** `offices.slug`, document keys, map URL-only.

### Tasks

1. Wire contacts + documents.
2. Iframe when `map_embed_url` non-null; null → placeholder/JS map; never HTML.
3. DOM: map hooks + document hooks; raw HTML absent; FE-05 chrome geometry.

### Verify

| Command | Expected | Result (2026-08-04) |
|---------|----------|---------------------|
| Hydrate unit + DOM (contacts + documents) | PASS | PASS (DOM all 6 pages) |
| Isolation + typecheck | PASS | PASS |

### Delivered

- `contacts-page-defaults.ts` / `documents-page-defaults.ts` + `usePageCms`
- Map: `src={map_embed_url}` only; null → placeholder; `contacts-maps.js` skips embed frames
- Slot allowlists: contacts 4 sections / 4 offices; documents 5 sections / cert+company keys
- Fixtures: contacts seed keeps `map_iframe_html`; snapshot public `map_embed_url`
- DOM: embed marker, null-map placeholders, document hooks, no `map_iframe_html`

---

## Phase E — Full local gate + requirements closeout

**Goal:** All six pages in mandatory DOM gate; FE-01…05 evidence.

### Tasks

1. Run full: isolation, pages-cms companion / phase-e as documented, hydrate unit, **hydrate-dom all six** (delayed/success/failure/HTML/FE-05), typecheck, build.
2. Catalog checks if stack up (no regression).
3. Mark FE-01…05 Complete only after evidence; update STATE/ROADMAP.
4. Local commits only; no push / no sync-seed.

### Verify (final)

| Command | Expected | Result (2026-08-04) |
|---------|----------|---------------------|
| `check:pages-cms-hydrate` | PASS | PASS |
| `check:pages-cms-hydrate-dom` (all 6 pages × scenarios) | PASS | PASS |
| `check:pages-cms-isolation` | PASS | PASS |
| `check:pages-cms-phase-e` (full=yes) | PASS | PASS + uploads self-clean + porcelain match (2026-08-04 harden) |
| `typecheck` / `build` | PASS | PASS |
| `check:routes` | PASS | PASS |
| `check:catalog-api` (:3000) | PASS | PASS |
| `git status --porcelain` vs pre-gate | match | enforced by gate finally |
| Push / `strapi:sync-seed` | **not performed** | **not performed** |

### FE-* evidence

| Req | Evidence |
|-----|----------|
| FE-01 | Six pages `usePageCms` + hydrate unit parity + DOM success hydrate |
| FE-02 | Section allowlists + visual slot locks in hydrate-dom |
| FE-03 | Hydrate email-key asserts + `check:routes` |
| FE-04 | Hooks: catalog/package/document/map/form in DOM gate |
| FE-05 | Delayed first-paint + content-equal geometry ≤1px; failure modes keep fallback |

### Delivered

- Full `check:pages-cms-phase-e` green locally
- REQUIREMENTS FE-01…05 → Complete; ROADMAP Phase 4 → Complete (local)
- No push / no `strapi:sync-seed`

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
