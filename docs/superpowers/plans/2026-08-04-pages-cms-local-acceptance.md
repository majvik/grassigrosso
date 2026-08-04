# Pages CMS Phase 5 — Local acceptance gate (execution plan)

**Date:** 2026-08-04
**Status:** Phase C Complete — aggregator PASS; QA-01…03 closeout recorded; Phase 5 local Complete; no push / no sync-seed
**Design:** [2026-08-04-pages-cms-local-acceptance-design.md](../specs/2026-08-04-pages-cms-local-acceptance-design.md)
**GSD phase:** `.planning/phases/05-local-acceptance/`
**Locality:** local commits only when asked; **no push / PR / deploy**; **no `strapi:sync-seed`** unless separately requested
**Depends on:** Phase 4 closed locally (`2d7ca10` uploads harden accepted)

## Objective

Prove milestone v1.1 wave-1 Pages CMS is locally acceptable: coverage matrix (QA-01), recorded full green suite (QA-02), live Strapi→Node→React edit via harness IPC (D3), truthful Strapi-down degraded mode with **disk-first `/uploads`** (D1+D4), fully isolated harness stack (D2), catalog non-regression, locality (QA-03).

## Locked decisions (see design D1–D4)

| ID | Summary |
|----|---------|
| **D1** | `/uploads` = deterministic **disk-first** GET/HEAD from `strapi-catalog/public/uploads/`; safe path; miss → 404 never Strapi; MIME/Cache-Control/HEAD/Range-206; traversal/symlink/malformed negatives |
| **D2** | Harness **isolated** Strapi+Node+Vite on **dynamic free ports**; never use/stop `:1337`/`:3000`/`:5174`; only owned PIDs; `finally` + listeners/porcelain unchanged |
| **D3** | Live mutation via **IPC → document service** on owned Strapi; no prod test endpoint / Admin JWT / public permission changes; TTL=0; restore in `finally` |
| **D4** | Degraded: owned Strapi up+valid → stop **only** owned Strapi → Node/Vite stay up → snapshot+all referenced uploads 200 → CDP naturalWidth **and** no failed `/uploads` network → missing 404 non-empty |

Rejected: proxy-on-error uploads; restart-Strapi-as-fix; foreign process kill.

## Global gates

- Work only in the local workspace.
- Design/plan D1–D4 affirmed; **Phase A–C executed**; Phase B accepted (`dd0825e`+`8beedda`+`26b15d4`).
- Do not commit planning unless user asks.
- After each phase step: run listed verify; record PASS/FAIL here.
- QA-01…03 Complete — Phase C aggregator green and attested (`05-SUITE-RESULTS.md`).

## Progress log

| Step | Command / artifact | Result |
|------|--------------------|--------|
| Design + plan draft | initial | superseded |
| Design amend | uploads-502 incident | superseded by D1–D4 lock |
| Design + plan lock D1–D4 | design/plan | Affirmed (user) |
| Phase A | `05-COVERAGE.md` matrix | DONE — accepted |
| Phase B | D1 code + D2/D3/D4 harnesses | DONE — accepted (`dd0825e` + `8beedda` + `26b15d4`) |
| Phase C | aggregator + closeout | DONE — `check:pages-cms-phase-5` PASS; `05-SUITE-RESULTS.md` |

### Phase map

| Phase | Goal | Status |
|-------|------|--------|
| A | Coverage matrix + gap freeze (D1–D4 rows) | DONE — accepted |
| B | Implement D1 + harnesses D2/D3/D4 | DONE — accepted |
| C | Aggregator + recorded suite + closeout | DONE — aggregator PASS |

---

## Phase A — Coverage matrix + gap freeze

**Goal:** QA-01 auditable; map every in-scope row to an owner script / future harness.

### Tasks

1. Matrix: ADM-*, API-*, FE-*, Phase 3/4 defect regressions → owning script → evidence.
2. Mandatory rows owned by Phase 5:
   - uploads-502 visual break → **D1 + D4**
   - live editor loop → **D3**
   - isolated stack / no foreign kill → **D2**
   - disk-first path negatives → **D1**
3. Mark ROADMAP §5.4 **partial** until D1+D4 green.
4. Write `.planning/phases/05-local-acceptance/05-COVERAGE.md`.

### Verify

| Check | Expected | Result (2026-08-04) |
|-------|----------|---------------------|
| No blank owners for in-scope rows | TRUE | TRUE (unowned 0) |
| D1–D4 rows present | TRUE | TRUE |
| No production code in Phase A | TRUE | TRUE |

---

## Phase B — Implement D1 + gap harnesses

**Goal:** Ship disk-first uploads and automated proofs on an isolated stack.

### Tasks

1. **D1 — `server.cjs` (or extracted helper) disk-first `/uploads`:**
   - GET/HEAD only; decode + canonical path under uploads root; reject traversal / NUL / directory / symlink escape.
   - File hit → disk serve with MIME, Cache-Control, HEAD, Range/206.
   - Miss → 404 non-empty controlled body; **no Strapi call**.
   - Automated negatives: plain/encoded traversal, directory, symlink escape, malformed encoding.
2. **D2 — isolated stack helper** (shared by live-edit + degraded):
   - Allocate free ports; spawn owned Strapi, Node, Vite; never bind/stop `:1337`/`:3000`/`:5174`.
   - Track process group; `finally` on PASS/FAIL/SIGINT/SIGTERM; assert listeners + porcelain.
3. **D3 — live mutation harness:**
   - IPC into owned Strapi → document service update/publish unique scalar.
   - Node TTL=0; assert API; CDP DOM; restore previous value in `finally` (even if DOM fails); re-check baseline.
4. **D4 — degraded harness:**
   - Owned Strapi up → validate snapshots/feeds → stop only owned Strapi → Node/Vite continue.
   - Assert all referenced uploads from pages snapshots + catalog listing/hero → 200.
   - CDP: naturalWidth broken=0 **and** no failed `/uploads/*` network responses.
   - Missing upload → 404 non-empty.
5. Wire npm scripts; isolation gate stays green.

### Verify

| Check | Expected | Result (2026-08-04) |
|-------|----------|---------------------|
| D1 disk-first positives + path negatives | PASS | PASS (`check:pages-cms-uploads-disk-first`) |
| D2: default ports untouched; porcelain match | PASS | PASS (live-edit + degraded) |
| D3 live-edit + finally restore | PASS | PASS (`check:pages-cms-live-edit`) |
| D4 snapshot JSON 200 after owned Strapi stop | PASS | PASS |
| D4 referenced uploads 200 | PASS | PASS |
| D4 CDP naturalWidth + network | PASS | PASS |
| D4 missing → 404 non-empty | PASS | PASS |
| `check:pages-cms-isolation` | PASS | (unchanged; no src/ Strapi) |

---

## Phase C — Milestone aggregator + closeout

**Goal:** Recorded QA-02 green bar + QA-03 attestation.

### Tasks

1. `check:pages-cms-phase-5`: fingerprint finally + Phase E children (without fighting D2 ports) + D3 + D4 + routes/typecheck/build + catalog checks as applicable.
2. Fill final verify table; update STATE/ROADMAP/REQUIREMENTS only after user accept.
3. Attest: push / `strapi:sync-seed` not performed.

### Verify (final — recorded 2026-08-04)

| Command | Expected | Result |
|---------|----------|--------|
| Coverage matrix complete | no gaps unowned | PASS — QA-01…03 / R5-1/2/7 covered |
| D1 disk-first + negatives | PASS | PASS |
| D2 isolated stack safety | PASS | PASS (SIGINT+SIGTERM observe-only) |
| D3 live-edit + restore | PASS | PASS |
| D4 degraded JSON+media+CDP+404 | PASS | PASS |
| Phase E / embedded suite | PASS + uploads self-clean | PASS (`pages-api` isolated ports when `:1337` busy) |
| Isolation / routes / typecheck / build | PASS | PASS |
| Catalog API (+ UI + perf on owned stack) | PASS | PASS (`catalog-api`/`ui`/`perf` via owned ports) |
| Porcelain / default listeners | unchanged | PASS (normal mode; record writes evidence then commit) |
| Push / `strapi:sync-seed` | **not performed** | **not performed** |
| Aggregator | PASS | **`check:pages-cms-phase-5:record`** then **`check:pages-cms-phase-5`** → `05-SUITE-RESULTS.md` |

---

## File touch map (expected after affirm)

| Path | Role |
|------|------|
| Design / this plan / `05-01-PLAN.md` | Already drafted |
| `05-COVERAGE.md` | Phase A |
| `server.cjs` (+ helper if extracted) | **D1** disk-first `/uploads` |
| `scripts/lib/*-isolated-stack*` (name TBD) | **D2** |
| `scripts/check-pages-cms-live-edit.mjs` (name TBD) | **D3** |
| `scripts/check-pages-cms-degraded-media.mjs` (name TBD) | **D4** |
| `scripts/check-pages-cms-phase-5.mjs` (name TBD) | Aggregator |
| Strapi harness IPC bridge (dev-only, not public HTTP) | **D3** |
| `package.json` | scripts |

## Non-goals

- Phase 6 legal
- Proxy-on-error `/uploads`
- Admin JWT / public permission widening
- Touching `:1337` / `:3000` / `:5174`
- Committing planning without ask; implementing before affirm

---

*Plan: 2026-08-04 — D1–D4 locked; ready for Phase A affirm*
