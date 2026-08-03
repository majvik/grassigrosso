# Pages CMS Phase 5 — Local acceptance gate (design)

**Date:** 2026-08-04
**Status:** Draft for Phase A affirm — **implementation decisions locked below; no code until affirm**
**Depends on:** Phase 4 Complete (A–E accepted; HEAD includes `2d7ca10` uploads harden)
**Requirements:** QA-01, QA-02, QA-03
**Non-goals this phase:** Legal pages (Phase 6), catalog product/filter schema changes, email routing CMS, push / PR / deploy, `strapi:sync-seed` unless separately requested, inventing new product UX

## Problem

Phases 1–4 delivered schema, feeds/proxy/seed, and React hydrate with local gates. Milestone closeout still needs a **single Phase 5 acceptance story** that:

1. Proves every new/changed branch and every known defect has an automated regression (QA-01).
2. Runs and **records** the full relevant local suite (QA-02) — not a subset that was green once in Phase 4E.
3. Proves the **editor loop** end-to-end: change in Strapi → Node `GET /api/pages/:slug` → React page (ROADMAP §5.3).
4. Proves Strapi-down still serves a **valid disk snapshot** through Node **and** that referenced media remain loadable so pages are not visually broken (ROADMAP §5.4 — extended by incident below).
5. Proves catalog / download-catalog automation does not regress (ROADMAP §5.5).
6. Treats manual Admin/browser smoke as **supplement only** (ROADMAP §5.6).
7. Never performs remote mutation / push / deploy (QA-03 / ROADMAP §5.7).

Without this phase, FE-* can be “complete” while the milestone still lacks a recorded, self-cleaning, content-aware acceptance gate that includes the live CMS edit path **and** a truthful degraded-mode story.

## Incident / root cause (2026-08-04) — mandatory Phase 5 QA input

**Symptom:** On local `/catalog`, hero and early product cards showed missing images (“пропали изображения в начале”), while listing JSON still returned 43 models.

**Observed facts:**
- Files existed on disk under `strapi-catalog/public/uploads/` (`missingFiles: 0` vs listing gallery `src` / `fallbackSrc`).
- Node `GET /api/catalog/products` could answer from **disk-snapshot** / feed cache without live Strapi.
- `GET /uploads/*` was proxied to Strapi (`server.cjs` → `STRAPI_URL`). With Strapi stopped, those requests returned **502**.
- Restarting Strapi restored images — that is **dependency recovery**, not a degraded-mode fix.

**Root cause:** Snapshot/API fallback for JSON was treated as “Strapi-down OK”, but public pages still depend on `/uploads/*`. Proxy-only media means **JSON-up + media-down = visually broken pages**. Claiming “snapshot fallback works” is **incomplete** until referenced media also succeed locally without Strapi.

**Phase 5 mandate:** this incident is a first-class QA gap. Closeout requires disk-first `/uploads` (locked §D1) plus an automated Strapi-stopped media+DOM gate on an isolated harness stack (locked §D2–§D4).

## Hypotheses

| # | Hypothesis | Measurement |
|---|------------|-------------|
| H1 | Most QA-01 surface is already covered by Phase 1–4 scripts; Phase 5 is primarily **inventory + gap fill** | Coverage matrix; only net-new harnesses for proven gaps |
| H2 | Live edit must use harness IPC into document service — not Admin JWT / public permissions | Live-edit harness + isolation asserts |
| H3 | Disk-first `/uploads` + Strapi-down CDP (naturalWidth + network) closes the 2026-08-04 gap | Degraded-mode harness PASS |
| H4 | Fully isolated dynamic ports avoid touching developer `:1337` / `:3000` / `:5174` | Pre/post listener + porcelain asserts |
| H5 | Milestone aggregator can compose Phase E + new harnesses under uploads fingerprint + porcelain | Phase 5 aggregator recorded table |

## Root cause (planning)

Phase 4E closed hydrate + companion suite. Missing: (1) editor loop without production auth holes; (2) recorded milestone green bar; (3) truthful Strapi-down mode where snapshot JSON **and** disk-served `/uploads` both work.

---

## Locked implementation decisions (closed — not open points)

These four decisions are **fixed** for Phase A affirm and subsequent implementation. Do not re-open as “proxy-on-error vs disk-first” or “reuse :1337” variants.

### D1 — `/uploads` is deterministic **disk-first** (not proxy-on-error)

Node serves media from disk **before** any Strapi proxy attempt.

| Rule | Contract |
|------|----------|
| Methods | Only **`GET`** and **`HEAD`**. Other methods are not served by the disk handler (existing non-GET behavior unchanged / rejected as today). |
| Root | Canonical files only under `strapi-catalog/public/uploads/` (resolved realpath). |
| Path safety | Safe URL decode; reject `..`, encoded traversal (`%2e%2e` etc.), NUL bytes, directory targets, and **symlink escape** outside the uploads root. |
| Hit | Existing regular file → serve **directly from disk**. |
| Miss | Missing path → **404** with non-empty controlled body — **never** forward to Strapi, **never** 502 for absence. |
| Headers | Preserve current media contract: correct **MIME** (incl. forced `image/avif` where applicable), **Cache-Control** long-media, **HEAD** semantics, **Range / 206** for video. |
| Negatives (automated) | Plain traversal, encoded traversal, directory request, symlink escape, malformed encoding → safe reject / 404 (not 200, not 502 via Strapi). |

**Rejected alternative:** proxy-to-Strapi-first or proxy-on-error fallback. That recreates the incident class (502 when Strapi is down; ambiguous miss path).

### D2 — Harness owns a fully **isolated stack**

| Rule | Contract |
|------|----------|
| Ports | Bind Strapi, Node (`server.cjs`), and Vite to **free dynamic ports** chosen at runtime. |
| Forbidden defaults | Must **not** use or stop listeners on developer defaults **`:1337`**, **`:3000`**, **`:5174`**. |
| Process control | Manage **only** PIDs / process groups the harness created. No broad `pkill`, no killing foreign Strapi/Node/Vite. |
| Lifecycle | `finally` on PASS, FAIL, **SIGINT**, **SIGTERM** tears down owned children and restores entry conditions. |
| Postconditions | Pre-gate **listeners** on the forbidden default ports (and any other recorded baseline) unchanged; `git status --porcelain` matches pre-gate (plus only intentional harness artifacts that the suite itself cleans). |

### D3 — Live mutation via **harness-owned Strapi IPC** (no public auth holes)

| Rule | Contract |
|------|----------|
| Stack | Mutation runs only against the **harness-owned** Strapi child from D2. |
| Write path | IPC command into that child that calls Strapi **document service** (update + publish as required). |
| Forbidden | Production/test HTTP mutation endpoint; Admin JWT in the gate; widening public Content API permissions for tests. |
| Flow | Unique scalar token → update/publish → Node with **pages/catalog TTL=0** for the harness → assert Node JSON → CDP React DOM shows token → **restore** previous value → assert baseline again. |
| Restore | Restore is mandatory in **`finally`**, including when the DOM assertion fails mid-run. |

### D4 — Degraded-mode test sequence (owned Strapi stop only)

| Step | Contract |
|------|----------|
| 1 | Start isolated stack (D2). Owned Strapi **up**; prove snapshots/feeds valid (pages + catalog). |
| 2 | Stop **only** owned Strapi (process group). Node + Vite **keep running**. |
| 3 | Snapshot/disk page + catalog APIs still **200**. |
| 4 | Collect **all** `/uploads/*` referenced by page snapshots under test **and** catalog listing + hero; each **200** via Node (disk-first D1). |
| 5 | CDP: `broken images = 0` (**`naturalWidth`**) **and** zero failed network responses for `/uploads/*`. |
| 6 | Missing upload path → **404** with **non-empty controlled** body (not 502, not empty). |
| 7 | `finally`: tear down owned stack per D2; default-port listeners + porcelain unchanged. |

Restarting Strapi to “fix” images is **not** evidence for D4.

---

## Locked process decisions (unchanged intent)

1. **Reuse first.** Do not duplicate Phase 3/4 assertions. Phase 5 adds coverage matrix, milestone aggregator, and gap harnesses implementing D1–D4.
2. **Coverage matrix mandatory** for QA-01; must include 2026-08-04 uploads-502 row → owned by degraded harness (D4) + disk-first (D1).
3. **Catalog non-regression:** record `check:catalog-api`; `check:catalog-ui` / `check:catalog-perf` (API/HTML) when applicable — on harness ports or documented local stack, never by mutating foreign defaults.
4. **Aggregator:** `check:pages-cms-phase-5` composes Phase E suite + live-edit (D3) + degraded (D4) + typecheck/build/routes/catalog as planned; uploads fingerprint path+size+SHA-256; porcelain match.
5. **Locality (QA-03):** no push / PR / deploy / `strapi:sync-seed` unless asked.
6. **No implementation until Phase A affirm** of this design + plan. Planning commit only if/when user asks.

## Existing coverage (inventory seed — finalize in Phase A)

| Area | Primary evidence today | Phase 5 role |
|------|------------------------|--------------|
| Feeds + proxy N1–N5 + disk-snapshot JSON | `check:pages-api` | Reuse; insufficient alone for media |
| Phase E + uploads self-clean | `check:pages-cms-phase-e` | Embed in aggregator |
| DOM hydrate (mocked API) | `check:pages-cms-hydrate-dom` | Reuse; not live edit / not Strapi-down media |
| Catalog API/UI | `check:catalog-*` | Record; today assumes Strapi for uploads until D1 ships |
| Live Strapi edit → React | Missing | **D3 harness** |
| Strapi-down media + visual integrity | Broken (proxy 502) | **D1 + D4** |
| Isolated stack / no foreign kill | Missing | **D2** |

## Success criteria (must be TRUE to close Phase 5)

1. Coverage matrix: zero unowned QA-01 rows, including uploads-502 → D1/D4.
2. Aggregator green; every command/result recorded in the plan.
3. Live mutation (D3) PASS including `finally` restore.
4. Degraded (D4) PASS: snapshot JSON 200, referenced uploads 200, CDP naturalWidth + no failed `/uploads` network, missing → controlled 404.
5. Disk-first `/uploads` negatives (D1) PASS.
6. Isolated stack (D2): default ports untouched; porcelain restored.
7. Catalog checks recorded PASS; isolation green.
8. Attestation: push / `strapi:sync-seed` not performed.
9. Manual smoke, if any, supplemental only.

## Open questions

**None for Phase A affirm.** D1–D4 close the previous open points (mutation auth, cache strategy → TTL=0 in harness, uploads shape, Strapi control, DOM strength).

Residual naming only (script filenames) may be chosen at implement time without changing contracts.

## Out of scope

- Phase 6 / legal
- Email routing CMS
- Proxy-on-error `/uploads`
- Admin JWT / public permission widening for tests
- Using or stopping `:1337` / `:3000` / `:5174`
- Declaring QA-* Complete before affirm + green recorded gate

---

*Design: 2026-08-04 — D1–D4 locked for Phase A affirm; no implementation until affirm; do not commit planning until asked*
