# Pages CMS Phase 3 — feeds, proxy & seed (design)

**Date:** 2026-08-03
**Status:** ready for approval — open points locked; eight mandatory revisions applied; **no application code until user affirms this revision**
**Depends on:** Phase 2 accepted (`9fc8711` + `cbf1230`)
**Requirements:** API-01 … API-06 (+ QA-01/02/03 locality)
**Non-goals this phase:** React hydrate (Phase 4), legal pages (Phase 6), push/deploy, `strapi:sync-seed` unless separately requested

## Problem

Wave 1 page content now lives in Strapi single types + fixtures, but the public site still cannot safely read it:

1. There is no public Strapi feed contract for the six pages.
2. The browser must never call Strapi directly (AGENTS.md / milestone invariant).
3. Without Node cache + disk snapshots, cold start / Strapi outage would 502 page content (same class of failure catalog already solved).
4. Contacts stores editor `map_iframe_html`; raw HTML must never reach React.
5. Fixtures validate schemas, but production-like seed + committed snapshots are not yet a repeatable local pipeline.
6. Fixture media is `{ url }` paths; Strapi media fields need Upload entities — seed must resolve that gap without duplicates or catalog mutation.

## Hypotheses

| # | Hypothesis | Measurement |
|---|------------|-------------|
| H1 | Per-page Strapi feeds mirror fixture shapes (plus `map_embed_url`) once single types are seeded | Seed → curl six feeds → deep-populate harness |
| H2 | Single allowlisted Node route `GET /api/pages/:slug` is safer than six public Node routes | Unknown slug → 404; only six slugs succeed |
| H3 | Fresh TTL + stale retention + disk snapshot covers outage without infinite memory age | Assert `source` transitions under controlled TTL/stale windows |
| H4 | Strict map allowlist removes XSS/HTML injection | Malicious/malformed iframe → null `map_embed_url`; no HTML in public JSON |
| H5 | Idempotent seed + media import fills Admin without wiping catalog or orphaning components | Seed ×2; stable component/media row counts; product count unchanged |

## Root cause (planning)

Phase 2 deferred feeds/proxy/seed. Catalog has the operational pattern; Phase 3 reuses it for pages with page-specific contracts: response envelope, dual TTL/stale cache, slug allowlist, deep populate, media seed, and `source` vocabulary locked to `strapi | memory-cache | disk-snapshot`.

## Locked decisions (including approved open points)

1. **download-catalog:** separate **texts** feed; existing slides feed (`GET /api/download-catalog-feed` / Node `/api/download-catalog/slides`) **unchanged**.
2. **`map_iframe_html`:** stripped in **Strapi feed** output; Node re-validates boundary (defense in depth). Public payload exposes only `map_embed_url`.
3. **`source`:** only `strapi | memory-cache | disk-snapshot` (never `stale-cache` on the pages API).
4. **Seed:** writes **only** local `strapi-catalog/.tmp/data.db`. Do **not** run `strapi:sync-seed` in Phase 3 unless the user explicitly requests it later.

---

### Response envelope

Canonical **page content** is the CMS/fixture-shaped object (after map normalization and media URL shaping).

| Layer | Shape |
|-------|--------|
| Strapi feed | `{ "data": { /* canonical page content */ } }` — **no** `source` |
| Disk snapshot file | **only** canonical page content (the inner `data` object), **no** `source` |
| Node `GET /api/pages/:slug` | `{ "data": { /* canonical */ }, "source": "strapi" \| "memory-cache" \| "disk-snapshot" }` |
| Header | `X-Pages-Source: <same as body.source>` |

Rules:

- Node adds the **current** `source` at respond time; never persists `source` into snapshot files.
- Memory cache stores **canonical `data` only** (not a previous envelope’s `source`).
- Exporter calls Node (or equivalent) and **accepts a slug only when `source === "strapi"`**. Responses with `memory-cache` or `disk-snapshot` → **FAIL** that export (prevent accidental re-export of degraded content).
- Snapshot write = serialize canonical `data` from that strapi-sourced response.

### Slugs (allowlist)

| Slug | Strapi single type | Fixture | Texts feed (indicative path) |
|------|--------------------|---------|------------------------------|
| `index` | `index-page` | `scripts/fixtures/pages-cms/index.json` | `/api/index-page-feed` |
| `hotels` | `hotels-page` | `…/hotels.json` | `/api/hotels-page-feed` |
| `dealers` | `dealers-page` | `…/dealers.json` | `/api/dealers-page-feed` |
| `contacts` | `contacts-page` | `…/contacts.json` | `/api/contacts-page-feed` |
| `documents` | `documents-page` | `…/documents.json` | `/api/documents-page-feed` |
| `download-catalog` | `download-catalog-page` | `…/download-catalog.json` | `/api/download-catalog-page-feed` (texts/PDF; **not** slides) |

Any other `:slug` → **404** JSON.

### Strapi feeds (API-01, API-06)

- One public read-only feed per page (permissions pattern as catalog feeds).
- Feed returns envelope `{ data }` where `data` matches public canonical shape.
- **Deep populate contract** (explicit, not relying on shallow `populate=*` alone): every nested component and media attribute required by the six fixtures must be listed in a shared populate descriptor; harness fails if any nested media/component is missing after seed.
- Contacts: normalize map → `map_embed_url`; **remove** `map_iframe_html` from `data`.
- Prefer AVIF via existing `prefer-avif` where sibling files exist.
- download-catalog **texts** feed must not alter slides feed payload/behavior.

### Node proxy & cache lifecycle (API-02, API-05)

`GET /api/pages/:slug` only.

**Env (document in `.env.example`):**

| Variable | Role | Default sketch |
|----------|------|----------------|
| `PAGES_STRAPI_CACHE_TTL_MS` | Fresh window: within this age, Node may answer immediately with `source: memory-cache` without calling Strapi | Prod ~45000; local `0` unless set |
| `PAGES_STRAPI_CACHE_STALE_MS` | Additional retention after fresh expiry: on Strapi failure/unusable body, still serve memory as `memory-cache`; after this limit, memory entry is not usable → try disk | Prod e.g. 24h; local `0` unless set |

**Lifecycle:**

```
1. Allowlist slug else 404
2. If memory entry age ≤ fresh TTL → return { data, source: "memory-cache" }
3. Else try Strapi feed:
   - usable → update memory; return { data, source: "strapi" }
   - unusable / error → if memory age ≤ fresh+stale → { data, source: "memory-cache" }
                     → else disk snapshot → { data, source: "disk-snapshot" }
                     → else diagnostic 503
```

**Usable Strapi body:** HTTP 2xx, `data` object present, passes per-slug validators (required roots, non-empty where defined). Invalid/empty → **do not** update memory cache.

**Corrupted / unreadable disk snapshot** → diagnostic **503** (do not return empty 200). Manifest hash mismatch on verify/export → **FAIL**.

### Disk snapshots (API-03)

- `public/pages-<slug>.snapshot.json` = canonical `data` only.
- `public/pages-snapshot.manifest.json`: `syncedAt`, per-slug sha256 of file bytes, list of slugs.
- Exporter: `npm run pages:export-snapshot`; requires all six Node responses `source=strapi` and valid `data`; refuse empty/invalid; refuse non-strapi sources.
- Read order: `dist/` then `public/` (catalog parity).

### Map allowlist (API-06) — strict

Shared util used by Strapi feed **and** re-run at Node boundary before respond.

Accept only if **all** hold:

1. Input string parses to **exactly one** `<iframe>` (no extras).
2. No `srcdoc` (reject if present).
3. `src` is a well-formed absolute URL.
4. Scheme **https** only.
5. **No** username/password (credentials) in URL.
6. **No** non-default port (reject explicit port ≠ 443).
7. Host is an **exact** allowlisted hostname (no wildcard `*.yandex.ru`). Initial allowlist locked to hosts used by fixtures, e.g. `yandex.ru` and `yandex.com` **only if** fixtures/need require them — prefer the minimal set proven by fixtures (`yandex.ru` for current contacts fixtures).
8. Pathname matches exact prefix/pattern **`/map-widget/`** (and allowed suffix under that tree); reject other paths.
9. Malformed HTML/URL, multiple iframes, wrong host/path → `map_embed_url: null` (and still no HTML field in public payload).

Public canonical `data` contains **only** `map_embed_url` for map (string or null), never `map_iframe_html`.

### Media seed (API-04) — required design

Fixtures use `{ "url": "/…" }` for media. Strapi media attributes need Upload plugin file entities.

**Resolution rules:**

1. Classify URL:
   - `/uploads/<file>` → file under `strapi-catalog/public/uploads/`
   - other root paths (`/dealers-hero.png`, `/documents/…`, …) → file under project `public/` (or documented static root used by the site)
2. If the filesystem file is **missing** → seed **FAIL** (hard stop for that run).
3. Compute content hash (e.g. sha256 of bytes). Look up existing Upload row by stable key (hash and/or normalized filename + folder). If found → **reuse** id (no duplicate file row).
4. If not found → create Upload entity once, pointing at the existing file path (or copy into uploads with deterministic name — implementation chooses one strategy and tests it; prefer reuse-in-place for `/uploads/` already in Strapi public).
5. Wire media attributes on single types/components to those ids.
6. **Component arrays:** upsert by stable identity (fixture order + slug/key fields such as office `slug`, document `document_key`, package `value`). Second seed must **not** append duplicates or leave orphan component rows; assert component-row counts stable (or explicitly replaced set equal).
7. **Catalog guard:** seed touches only the six page single types (+ upload files they reference). Product/collection/filter catalog rows must be unchanged (count + sample identity asserts).
8. Seed target DB: **`strapi-catalog/.tmp/data.db` only**. No `strapi:sync-seed` in this phase.

### Feed population

- Shared deep-populate descriptor per single type covering all nested components/media used by fixtures.
- Integration harness after seed curls each feed and asserts nested media URLs/ids and nested component arrays for all six pages.
- `populate=*` alone is **not** accepted as the populate contract.

### Catalog scope gate (conflict resolution)

Current `check:pages-cms-catalog-scope` forbids **any** `server.cjs` change (Task 6 Admin RU window). Phase 3 **will** add `/api/pages/:slug` to `server.cjs`.

**Before Phase D (Node proxy):**

- Narrow the harness so that:
  - **Allowed:** additive page-proxy / pages-cache / pages-snapshot helpers and `GET /api/pages/:slug` in `server.cjs`.
  - **Still forbidden / compared:** catalog feed route/controller/service runtime contracts; catalog disk snapshot filenames; catalog cache key behavior; `src/catalog/**` listing runtime; accidental edits to catalog handlers.
- Prefer extracting shared cache helpers or scoping diff assertions to catalog blocks / behavioral regression via `check:catalog-api` (mandatory every phase after Node changes).
- Claiming “catalog-scope still green” without this narrowing is invalid.

### Negative scenarios (must be automated)

| # | Scenario | Expected |
|---|----------|----------|
| N1 | Unknown slug | 404 |
| N2 | Invalid/empty Strapi response | Memory cache **not** updated; fallback per lifecycle |
| N3 | Exporter sees `memory-cache` or `disk-snapshot` | Reject / FAIL |
| N4 | Corrupted snapshot JSON | Diagnostic 503 |
| N5 | Manifest sha256 mismatch vs file | FAIL |
| N6 | Seed ×2 | Same logical content; stable component/media row counts; no catalog product drift |
| N7 | download texts feed change | Slides feed payload/contract unchanged |
| N8 | Map reject cases | `srcdoc`, multi-iframe, bad host/path/port/credentials → `map_embed_url` null; no HTML in `data` |

## Success criteria

1. Envelope contract held at feed / snapshot / Node layers.
2. Six feeds return canonical `data` with deep nested media/components after seed.
3. Node allowlist + dual TTL/stale cache + disk fallback with correct `source`.
4. Exporter only persists strapi-sourced canonical `data`; refuse degraded sources and empty bodies.
5. Strict map allowlist; public JSON has only `map_embed_url`.
6. Media seed idempotent; missing file FAIL; no catalog mutation.
7. Catalog API regression PASS; catalog-scope harness updated before page proxy lands.
8. All negatives N1–N8 covered by automated tests.
9. Local commits only; no push/PR/deploy; no `strapi:sync-seed` unless separately ordered.

## Execution order (locked)

| Phase | Focus |
|-------|--------|
| **A** | Contracts, validators, map normalization (+ unit negatives) |
| **B** | Idempotent local seed + media resolution |
| **C** | Strapi feeds + seeded integration / deep-populate tests |
| **D** | Narrow catalog-scope harness → Node proxy / cache / snapshots / exporter |
| **E** | Frontend isolation + full local regression |

## Non-goals

- React hydrate / changing page TSX consumers
- Email routing / `getPageName` changes
- Legal single types
- Changing catalog snapshot filenames or catalog `source` string vocabulary
- `strapi:sync-seed` / committing `database/seed/data.db` without explicit user request
- Push, Timeweb env mutation, remote smoke
