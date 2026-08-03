# Pages CMS Phase 3 — feeds, proxy & seed (execution plan)

**Date:** 2026-08-03
**Status:** IN PROGRESS — Phase A complete; Phase B next
**Design:** [2026-08-03-pages-cms-feeds-proxy-seed-design.md](../specs/2026-08-03-pages-cms-feeds-proxy-seed-design.md)
**GSD phase:** `.planning/phases/03-feeds-proxy-seed/`
**Locality:** local commits only; **no push / PR / deploy**; **no `strapi:sync-seed`** unless separately requested

## Objective

Deliver Strapi page feeds, allowlisted Node `GET /api/pages/:slug` with fresh TTL + stale retention + disk snapshot fallback, map URL normalization, idempotent fixture+media seed into local `.tmp`, snapshot exporter + manifest, and automated regression gates — without React hydrate.

## Locked product decisions

- Separate download-catalog **texts** feed; slides feed unchanged.
- Strip `map_iframe_html` in Strapi feed; Node re-checks; public field = `map_embed_url` only.
- Envelope: feed `{ data }`; snapshot = canonical `data` only; Node `{ data, source }`.
- `source` ∈ {`strapi`,`memory-cache`,`disk-snapshot`}.
- Env: `PAGES_STRAPI_CACHE_TTL_MS` + `PAGES_STRAPI_CACHE_STALE_MS`.
- Exporter accepts only Node responses with `source=strapi`.
- Seed → `.tmp/data.db` only.

## Global gates

- Work only in the local workspace.
- Every new behavior has an automated test before the phase is marked complete.
- After each phase: run listed verify; record PASS/FAIL in the progress log.
- Do not start Phase 4 hydrate until final verify is green and user accepts Phase 3.

## Progress log

| Step | Command / artifact | Result |
|------|--------------------|--------|
| Spec + plan v1 | `5f76aa0` | superseded by revision |
| Spec + plan revision | `4cf5b13` | affirmed |
| Phase A | `npm run check:pages-cms-phase-a` + strict | PASS — map hosts=`yandex.ru`, path=`/map-widget/`, N8=12, envelopes+populate |
| Phase B+ | — | not started |

---

## Phase A — Contracts, validators, map normalization

**Goal:** Lock shapes and pure functions before DB/API wiring.

### Tasks

1. Define canonical page-content validators per slug (from fixtures + `map_embed_url`).
2. Document envelope rules in harness comments/asserts:
   - feed-shaped `{ data }`
   - snapshot = `data` only
   - node-shaped `{ data, source }`
3. Implement `normalizeMapIframeHtml` with **strict** allowlist (HTTPS, no credentials, no non-443 port, exact hosts, `/map-widget/…`, single iframe, reject `srcdoc` / multi-iframe / malformed).
4. Unit harness: positives from contacts fixtures; negatives for all reject classes → `null`.
5. Deep-populate **descriptor** stubs per single type (used later by feeds + integration harness).

### Verify

- Map/unit + contract harness PASS (incl. N8-style negatives)
- `npm run check:pages-cms-strict` PASS
- Diff: **no** `server.cjs` page route, **no** seed writers, **no** feed controllers yet

---

## Phase B — Idempotent local seed + media resolution

**Goal:** Fill six single types in `.tmp` so feeds can prove fixture parity.

### Tasks

1. Seed script: upsert six fixtures into local Strapi `.tmp/data.db`.
2. Media pipeline:
   - resolve `{url}` → filesystem (`public/` vs `strapi-catalog/public/uploads/`)
   - missing file → **FAIL**
   - idempotent Upload lookup by hash/stable name; no duplicate rows on re-run
   - attach media ids to attributes/components
3. Component arrays: replace/upsert by stable keys; no orphan rows on seed ×2.
4. Catalog guard asserts (product count / sample ids unchanged).
5. Automated seed×2 test recording component + media row counts.

### Verify

- Seed ×2 PASS (N6)
- Missing-file negative FAIL as designed
- Catalog product count unchanged
- **Do not** run `strapi:sync-seed`
- Feeds may still be absent; parity via Admin/entity read or interim entity dump is OK until Phase C

---

## Phase C — Strapi feeds + seeded integration

**Goal:** Six public feeds with deep populate and map strip.

### Tasks

1. Feed routes/controllers for six pages; download-catalog = **texts** only.
2. Apply explicit deep-populate descriptors (not shallow `populate=*` alone).
3. Contacts: normalize map; omit `map_iframe_html` from `data`.
4. `prefer-avif` where applicable.
5. Public permissions for feeds.
6. Integration harness: curl six feeds → `{ data }` validates; nested media/components present; slides feed regression (N7).

### Verify

- Strapi boot PASS
- Six feeds 200 + deep asserts PASS
- `GET /api/download-catalog-feed` slides contract unchanged PASS
- `npm run check:pages-cms-strict` PASS

---

## Phase D — Catalog-scope narrow → Node proxy / cache / snapshots / exporter

**Goal:** Safe `server.cjs` page proxy without false catalog-scope failures; full fallback chain.

### Tasks

1. **First:** update `check:pages-cms-catalog-scope` (or split pages-aware variant):
   - allow additive `/api/pages/:slug` + pages cache/snapshot helpers in `server.cjs`
   - still forbid catalog controller/route/service regressions and `src/catalog` listing breaks
   - keep `check:catalog-api` mandatory
2. Implement `GET /api/pages/:slug`:
   - allowlist → else 404 (N1)
   - fresh TTL / stale retention / disk fallback per design
   - envelope `{ data, source }` + `X-Pages-Source`
   - invalid/empty Strapi → do not update cache (N2)
   - Node re-runs map URL validation before respond
   - corrupted snapshot → 503 (N4)
3. Snapshot files + manifest; exporter requires `source=strapi` only (N3); hash mismatch FAIL (N5).
4. `.env.example`: `PAGES_STRAPI_CACHE_TTL_MS`, `PAGES_STRAPI_CACHE_STALE_MS`.
5. `scripts/check-pages-api.mjs` covering N1–N5 and happy paths for all sources.

### Verify

- Updated catalog-scope harness PASS with page-proxy diff present
- `npm run check:pages-api` PASS
- `npm run check:catalog-api` PASS
- Exporter PASS on live strapi; reject memory-cache/disk-snapshot negatives PASS
- Stop Strapi → `disk-snapshot` (after stale exhausted or with fresh/stale=0 test config)

---

## Phase E — Isolation & full local gate

**Goal:** No frontend→Strapi page fetches; green suite; docs/requirements update.

### Tasks

1. Grep/harness: `src/` must not call Strapi page feeds / `:1337` for page content.
2. Wire pages checks into `npm run check` (or documented companion scripts).
3. Full local: strict, catalog-scope (narrowed), catalog-api, catalog-ui (if stack up), pages-api, typecheck, build, `git diff --check`.
4. Mark API-01…06 in REQUIREMENTS only after evidence; update STATE/ROADMAP.
5. Local commits only.

### Verify (final)

| Command | Expected |
|---------|----------|
| `npm run check:pages-cms-strict` | PASS |
| Catalog-scope (narrowed) | PASS |
| Pages feed/API harnesses + N1–N8 | PASS |
| `npm run check:catalog-api` | PASS |
| `npm run check` | PASS |
| `npm run typecheck` / `npm run build` | PASS |
| Push / `strapi:sync-seed` | **not performed** |

---

## File touch map (expected)

| Area | Files (indicative) |
|------|--------------------|
| Map + validators | shared util, harness scripts |
| Seed + media | `scripts/seed-pages-cms-from-fixtures.mjs` (name TBD), upload helpers |
| Strapi feeds | `*-page-feed` controllers/routes/permissions + populate descriptors |
| Node | `server.cjs` pages block, `.env.example` |
| Scope harness | `scripts/check-pages-cms-catalog-scope.mjs` (narrow before page proxy) |
| Snapshots | `public/pages-*.snapshot.json`, `pages-snapshot.manifest.json` |
| Docs | progress log, STATE, REQUIREMENTS API_* |

## Explicitly out of diff

- React hydrate / `src/components/pages/*` consumers
- `getPageName` / `PAGE_EMAIL_ROUTING`
- Legal types
- Catalog schema runtime attrs
- `database/seed/data.db` via sync-seed (unless user orders)
- Remote deploy / Timeweb

## Review checklist (user)

- [x] download-catalog texts feed separate; slides unchanged
- [x] strip `map_iframe_html` in feed; Node re-check
- [x] `source` vocabulary locked
- [x] seed `.tmp` only; no sync-seed by default
- [x] response envelope `{ data }` / snapshot without source / Node adds source
- [x] fresh TTL + stale retention env vars
- [x] phase order A→B seed→C feeds→D proxy→E
- [x] media seed design (hash idempotency, missing FAIL, no orphans, no catalog mutation)
- [x] deep-populate contract + harness
- [x] strict map allowlist (no `*.yandex.ru`)
- [x] catalog-scope narrowed before page proxy
- [x] negatives N1–N8

**Affirm to start Phase A:** user explicit go-ahead after reading this revision.
