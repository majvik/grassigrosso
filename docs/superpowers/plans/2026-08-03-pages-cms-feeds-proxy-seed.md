# Pages CMS Phase 3 — feeds, proxy & seed (execution plan)

**Date:** 2026-08-03
**Status:** AWAITING REVIEW — do not implement until approved
**Design:** [2026-08-03-pages-cms-feeds-proxy-seed-design.md](../specs/2026-08-03-pages-cms-feeds-proxy-seed-design.md)
**GSD phase:** `.planning/phases/03-feeds-proxy-seed/`
**Locality:** local commits only; **no push / PR / deploy**

## Objective

Deliver Strapi page feeds, allowlisted Node `GET /api/pages/:slug` with memory cache + disk snapshot fallback, map URL normalization, idempotent fixture seed, snapshot exporter + manifest, and automated regression gates — without React hydrate.

## Global gates

- Work only in the local workspace.
- Every new behavior has an automated test before the phase is marked complete.
- After each phase below: run listed verify commands; record PASS/FAIL in this file’s progress log.
- Do not start Phase 4 hydrate until this plan’s final verify is green and user accepts Phase 3.

## Progress log

| Step | Command / artifact | Result |
|------|--------------------|--------|
| Spec + plan authored | `docs/superpowers/specs|plans/2026-08-03-pages-cms-feeds-proxy-seed*` | DRAFT — awaiting review |
| Implementation | — | BLOCKED until review |

---

## Phase A — Feed contract & harness (no server wiring yet)

**Goal:** Lock JSON shapes and negative cases before controllers land.

### Tasks

1. Document per-slug response schema (TypeScript types or JSON Schema / assert helpers) derived from `scripts/fixtures/pages-cms/*.json` + `map_embed_url` on contacts offices.
2. Add harness module (e.g. `scripts/check-pages-cms-feeds-contract.mjs` or extend pages-cms contract) that:
   - lists allowlist slugs
   - asserts fixture → expected public shape rules (strip `map_iframe_html`, require `map_embed_url` when input valid)
   - negative: bad iframe host → `map_embed_url` null / omitted
3. Implement shared util `normalizeMapIframeHtml(html) → string | null` under `strapi-catalog` (or `lib/`) with unit tests via node assert script — **no** React.

### Verify

- `node <harness>` PASS including negatives
- `npm run check:pages-cms-strict` PASS (unchanged)
- No `server.cjs` page route yet (diff limited to util + harness + types/docs)

---

## Phase B — Strapi public feeds (API-01, API-06)

**Goal:** Six readable feeds from single types.

### Tasks

1. Add feed routes/controllers for: index, hotels, dealers, contacts, documents, download-catalog **texts** (keep `download-catalog-feed` slides intact).
2. Controllers load published/draft policy consistent with existing catalog feeds; map media URLs through `prefer-avif` where files exist.
3. Contacts feed applies map normalization; public payload excludes raw iframe HTML.
4. Public permissions for new feed routes (same pattern as existing catalog feeds).

### Verify

- Strapi develop boot PASS
- Curl each feed → 200, shape assertions via harness
- `GET /api/download-catalog-feed` still returns slides (`displayMode`, `slides`) — regression
- `npm run check:pages-cms-strict` PASS

---

## Phase C — Node proxy, cache, snapshots (API-02, API-03, API-05)

**Goal:** Allowlisted `/api/pages/:slug` with catalog-like fallback.

### Tasks

1. Implement `GET /api/pages/:slug` in `server.cjs`:
   - allowlist → else 404
   - fetch matching Strapi feed(s)
   - memory cache keyed by slug; TTL via `PAGES_STRAPI_CACHE_TTL_MS`
   - on Strapi failure / unusable body → memory-cache then disk-snapshot
   - set body `source` + `X-Pages-Source`
2. Disk map: `pages-<slug>.snapshot.json` + read order `dist/` then `public/`.
3. Exporter `scripts/export-pages-snapshot.mjs` + `npm run pages:export-snapshot`; refuse empty/invalid; write `pages-snapshot.manifest.json`.
4. `.env.example` entries for pages cache TTL.
5. Automated API tests (`scripts/check-pages-api.mjs` or extend existing):
   - six slugs 200 + source in {strapi, memory-cache, disk-snapshot}
   - unknown slug 404
   - with snapshot present and Strapi stopped / mocked failure → `disk-snapshot`
   - empty Strapi response does not clear cache (inject/mock)

### Verify

- `npm run check:pages-api` (new) PASS
- `npm run check:catalog-api` PASS
- Exporter dry-run against local stack PASS; refuse-empty negative PASS
- Manual: stop Strapi → curl page slug → disk-snapshot

---

## Phase D — Idempotent seed (API-04)

**Goal:** Load six fixtures into local Strapi single types safely.

### Tasks

1. Seed script (e.g. `scripts/seed-pages-cms-from-fixtures.mjs`) upserts six single types from fixtures.
2. Document run order: Strapi up → seed → verify feeds → `pages:export-snapshot`.
3. Idempotency test: run twice; second run no duplicate components / same field values.
4. Guard: do not delete/recreate catalog products; assert product count stable if catalog API up.

### Verify

- Seed ×2 PASS
- Feeds match fixture expectations (harness)
- Catalog product count unchanged
- `pages:export-snapshot` PASS

---

## Phase E — Frontend isolation & full local gate

**Goal:** Prove browser never talks to Strapi for pages; green suite.

### Tasks

1. Static grep/harness: no `1337`, no `*-page-feed`, no Strapi origin in `src/` for page content (allow existing catalog Node paths only).
2. Wire `npm run check` (or dedicated script) to include pages API + feed contract checks.
3. Run: `check:pages-cms-strict`, `check:pages-cms-catalog-scope` (still green), `check:catalog-api`, `check:catalog-ui` (if stack up), `typecheck`, `build`.
4. Update `.planning` progress + REQUIREMENTS API-01…06 checkboxes only after evidence recorded.
5. Local commits only.

### Verify (final)

| Command | Expected |
|---------|----------|
| `npm run check:pages-cms-strict` | PASS |
| `npm run check:pages-cms-catalog-scope` | PASS |
| New pages feed/API harnesses | PASS |
| `npm run check:catalog-api` | PASS |
| `npm run check` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `git diff --check` on new commits | PASS |
| Push | **not performed** |

---

## File touch map (expected)

| Area | Files (indicative) |
|------|--------------------|
| Strapi feeds | `strapi-catalog/src/api/**/…-feed.js`, routes, permissions |
| Map util | shared normalize helper + tests |
| Node | `server.cjs`, `.env.example` |
| Snapshots | `public/pages-*.snapshot.json`, `public/pages-snapshot.manifest.json` |
| Scripts | `export-pages-snapshot.mjs`, seed script, `check-pages-api.mjs`, package.json scripts |
| Docs | this plan progress log, `.planning/STATE.md`, REQUIREMENTS API_* |

## Explicitly out of diff

- `src/components/pages/*` hydrate
- `getPageName` / `PAGE_EMAIL_ROUTING`
- Legal types
- Catalog schema runtime attrs
- Remote deploy / Timeweb env

## Review checklist (user)

- [ ] Approve locked slug allowlist and `source` vocabulary
- [ ] Approve download-catalog texts feed separate from slides
- [ ] Approve strip `map_iframe_html` from public JSON
- [ ] Approve seed scope (local `.tmp` first; sync-seed optional)
- [ ] Then authorize Phase A implementation
