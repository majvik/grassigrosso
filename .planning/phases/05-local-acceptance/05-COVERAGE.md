# Phase 5 — Coverage matrix (QA-01)

**Date:** 2026-08-04
**Status:** Phase C Complete — QA-01…03 closed; aggregator PASS (`05-SUITE-RESULTS.md`)
**Design decisions D1–D4:** Affirmed with Phase 5 design/plan
**Design:** [2026-08-04-pages-cms-local-acceptance-design.md](../../../docs/superpowers/specs/2026-08-04-pages-cms-local-acceptance-design.md)
**Plan:** [2026-08-04-pages-cms-local-acceptance.md](../../../docs/superpowers/plans/2026-08-04-pages-cms-local-acceptance.md)
**Locked decisions:** D1–D4 (disk-first uploads, isolated stack, IPC mutation, degraded media+DOM)

## Status legend

| Status | Meaning |
|--------|---------|
| **covered** | Existing automated owner fully satisfies the row for milestone acceptance |
| **partial** | Automated owner exists but is incomplete for Phase 5 closeout (JSON-only, mocked API, process/locality attestation, etc.) |
| **gap** | Must be implemented in Phase B (or aggregator Phase C) before QA-* Complete |
| **deferred** | Explicitly out of Phase 5 scope (Phase 6+); still has a named owner so the matrix has **zero unowned** rows |

**Owner** = primary npm script / artifact responsible for the assert. Future harness names match the plan (TBD filenames allowed; decision IDs are binding).

## Summary counts (Phase C closeout)

| Status | Count |
|--------|------:|
| covered | 43 |
| partial | 0 |
| gap | 0 |
| deferred | 2 |
| **Total rows** | **45** |
| **unowned / blank** | **0** |

Remaining **deferred** only: LEG-01, LEG-02 (Phase 6).

---

## Requirements — ADM / API / FE

| ID | Topic | Owner | Status | Evidence / notes |
|----|-------|-------|--------|------------------|
| ADM-01 | Shared `page.*` components + RU labels | `check:pages-cms-strict` (+ Phase 1 contract) | covered | Schema/components mode in `check-pages-cms-contract.mjs` |
| ADM-02 | Wave-1 single types RU displayName/fields | `check:pages-cms-strict` | covered | Single-type schemas + strict contract |
| ADM-03 | download-catalog texts/PDF; slides preserved | `check:pages-cms-strict` + `check:pages-cms-hydrate` (`catalogPdf`) + catalog slides checks | covered | Slides stay on download-catalog feed, not pages hydrate |
| ADM-04 | `ru.json` keys for CM + CTB | `check:pages-cms-strict` + Phase 2 evidence `TASK5-RU-ADMIN` | covered | Automated key coverage; Admin UI smoke was Phase 2 supplement |
| ADM-05 | Content-contract matrix CMS vs code-owned | `.planning/phases/02-wave-1-single-types/02-CONTENT-CONTRACT.md` + hydrate behavior-bound asserts | covered | Contract doc + `check:pages-cms-hydrate` behaviorBound |
| ADM-06 | Fixtures schema validation | `check:pages-cms-strict` (fixtures) | covered | Fixtures=6 in strict gate |
| API-01 | Public feed per page slug | `check:pages-cms-phase-c` + `check:pages-api` | covered | Seeded feed integration |
| API-02 | Node `GET /api/pages/:slug` cache + disk snapshot | `check:pages-api` + `check:pages-cms-degraded-media` | covered | JSON + Strapi-down media (D4) |
| API-03 | Export snapshots + manifest | `check:pages-api` (atomic export / N3/N5) + `pages:export-snapshot` | covered | Tracked public clean assert in pages-api |
| API-04 | Idempotent seed from fixtures/React | `check:pages-cms-phase-b` | covered | Seed1/seed2 idempotency + uploads FS snapshot |
| API-05 | Allowlist slug; no snapshot clobber; source field | `check:pages-api` (N1–N5) | covered | 404 unknown; unusable Strapi; corrupt snapshot; late-slug |
| API-06 | Map → allowlisted `map_embed_url` only | `check:pages-cms-phase-a` + hydrate/DOM map asserts | covered | Host allowlist; no raw HTML to React |
| FE-01 | Wave-1 pages hydrate from Node API | `check:pages-cms-hydrate` + `check:pages-cms-hydrate-dom` | covered | Six pages unit + DOM success |
| FE-02 | Layout/slots not invented beyond baseline | `check:pages-cms-hydrate-dom` (slot locks / allowlists) | covered | Index/hotels/… visual slot locks |
| FE-03 | Email `page` / `PAGE_EMAIL_ROUTING` unchanged | `check:routes` + hydrate email-key asserts | covered | `lead-routing.json` ↔ server ↔ client |
| FE-04 | Stable hooks (`data-*`, packages, docs, maps) | `check:pages-cms-hydrate-dom` | covered | catalog/package/document/map hooks |
| FE-05 | First paint = fallback; delayed API geometry | `check:pages-cms-hydrate-dom` (delayed + FE-05 parity) | covered | ≤1px geometry when content-equal |

## Requirements — QA / LEG

| ID | Topic | Owner | Status | Evidence / notes |
|----|-------|-------|--------|------------------|
| QA-01 | Every branch/defect has automated regression | This matrix + Phase B gap fill + Phase C aggregator | covered | Closeout 2026-08-04 — unowned 0; gaps closed |
| QA-02 | Full relevant suite recorded green locally | `check:pages-cms-phase-5` + `05-SUITE-RESULTS.md` | covered | Aggregator PASS 2026-08-04 |
| QA-03 | No push/PR/deploy/remote mutation without ask | Process attestation in `05-SUITE-RESULTS.md`; D2 non-interference | covered | Attested; listeners unchanged |
| LEG-01 | Privacy/terms/cookies single types | Phase 6 plan (TBD) | deferred | Out of Phase 5 |
| LEG-02 | Legal hydrate `legal-content.tsx` | Phase 6 plan (TBD) | deferred | Out of Phase 5 |

## Locked decisions D1–D4

| ID | Topic | Owner | Status | Evidence / notes |
|----|-------|-------|--------|------------------|
| D1 | Disk-first `/uploads` GET/HEAD + path safety + MIME/Cache/HEAD/Range + miss 404 | `check:pages-cms-uploads-disk-first` + `lib/uploads-disk-first.cjs` | covered | Phase B 2026-08-04 |
| D1-neg | Traversal / encoded traversal / directory / leaf+**directory symlink** escape / malformed encoding | `check:pages-cms-uploads-disk-first` | covered | Harden: always `realpath(candidate)` |
| D2 | Isolated dynamic ports; never `:1337`/`:3000`/`:5174`; owned PIDs only; **SIGINT/SIGTERM** sync teardown (Strapi+Node+Vite) | `scripts/lib/pages-cms-isolated-stack.mjs` + `check:pages-cms-stack-signal` | covered | Observe-only grace; emergency kill only in `finally` after FAIL |
| D2-post | Pre/post default listeners + uploads fingerprint + porcelain unchanged | isolated-stack asserts + signal gate (per SIGINT and SIGTERM) | covered | After observe; cleanup does not flip FAIL→PASS |
| D3 | Live mutation via IPC → document service; TTL=0; DOM; restore verified (IPC+Node); **injected post-mutation failure** | `check:pages-cms-live-edit` | covered | Restore failure fails gate |
| D4 | Stop only owned Strapi; snapshot JSON 200; **all** referenced uploads 200 (missing → FAIL); CDP naturalWidth + network; miss 404 | `check:pages-cms-degraded-media` | covered | No `existsSync` hide |

## Known defects / regressions (Phases 3–4 + incident)

| ID | Topic | Owner | Status | Evidence / notes |
|----|-------|-------|--------|------------------|
| DEF-map-html | Raw map iframe HTML must not reach React | `check:pages-cms-phase-a` + contacts DOM (`map_embed_url` / null placeholder) | covered | Phase 4D harden |
| DEF-contacts-hidden | Map tab `[hidden]` + tab switching | `check:pages-cms-hydrate-dom` (contacts map tabs / null-map) | covered | `a7f5816` |
| DEF-hotels-currentsrc | Product CMS image via `currentSrc`, not legacy `<source>` | `check:pages-cms-hydrate-dom` (hotels null-image / currentSrc) | covered | `02d254b` |
| DEF-uploads-drift | Full gate must not leave generated uploads / fingerprint missing/changed | `scripts/lib/pages-cms-uploads-guard.mjs` via `check:pages-cms-phase-e` | covered | `2d7ca10` content fingerprint |
| DEF-uploads-502 | Strapi down → snapshot JSON OK but `/uploads` 502 → broken hero/cards | **D1 + D4** (`check:pages-cms-degraded-media`) | covered | Regression closed Phase B 2026-08-04 |
| DEF-isolation | `src/` must not call Strapi / `:1337` / `VITE_STRAPI_*` | `check:pages-cms-isolation` | covered | Phase 3E / Phase 4 companion |
| DEF-catalog-scope | Pages CMS must not regress catalog schemas/feeds | `check:pages-cms-catalog-scope` + `check:catalog-api` | covered | Scope gate + catalog API |
| DEF-index-slots | Hydrate fills baseline slots only (no invented sections) | `check:pages-cms-hydrate-dom` (index slot lock) | covered | Phase 4B |
| DEF-fe05-cls | Delayed API must not empty first paint / large CLS when content-equal | `check:pages-cms-hydrate-dom` FE-05 | covered | All six pages |

## ROADMAP Phase 5 success criteria

| ID | Criterion | Owner | Status | Evidence / notes |
|----|-----------|-------|--------|------------------|
| R5-1 | Every added branch / fixed defect has automated test | This matrix (QA-01) | covered | Phase C closeout |
| R5-2 | Full suite + typecheck/build/API/UI recorded in plan | `check:pages-cms-phase-5` + `05-SUITE-RESULTS.md` | covered | PASS 2026-08-04 |
| R5-3 | Live Strapi field change → Node → React | **D3** `check:pages-cms-live-edit` | covered | Phase B |
| R5-4 | Strapi down → valid snapshot **and** referenced media usable | **D1 + D4** | covered | Phase B (JSON+media+CDP) |
| R5-5 | Catalog / download-catalog checks do not regress | `check:catalog-api` + `check:catalog-ui` (Phase C suite) | covered | Re-recorded PASS in `05-SUITE-RESULTS.md` |
| R5-6 | Manual browser smoke supplemental only | Process / plan attestation | covered | Policy locked in design |
| R5-7 | No push / PR / remote deploy / remote mutation | QA-03 attestation | covered | Attested in `05-SUITE-RESULTS.md` |
| R5-8 | Degraded gate does not kill foreign processes; restores state | **D2** | covered | Phase B |

## Companion / aggregator owners (reference)

| Script | Role in Phase 5 |
|--------|-----------------|
| `check:pages-cms-phase-e` / `check:pages-cms` | Reuse hydrate/isolation/phase-a/strict/catalog-scope/pages-api + uploads guard |
| `check:pages-cms-hydrate` | Unit merge/lifecycle/parity |
| `check:pages-cms-hydrate-dom` | DOM FE-* (mocked network — not D3/D4) |
| `check:pages-api` | N1–N5 + disk-snapshot JSON |
| `check:routes` | Email routing |
| `check:catalog-api` / `ui` / `perf` | Catalog non-regression |
| `typecheck` / `build` | Record in Phase C |
| Future phase-5 aggregator | Compose above + D2/D3/D4; record results |

## Phase C verify

| Check | Result |
|-------|--------|
| Aggregator `check:pages-cms-phase-5` | **PASS** |
| Suite results artifact | `05-SUITE-RESULTS.md` |
| Listeners / uploads / porcelain | **unchanged** |
| Push / `strapi:sync-seed` | **not performed** |
| QA-01…03 | **covered** |

## Gap freeze (Phase B input) — DONE 2026-08-04

Phase B implemented D1–D4. Phase C closed QA-02 / R5-2 and attested QA-03 / R5-7.

---

*Phase A coverage freeze: 2026-08-04 — 45 rows; unowned 0*
*Phase B update: 2026-08-04 — D1–D4 covered*
*Phase C closeout: 2026-08-04 — aggregator PASS; QA-01…03 Complete*
