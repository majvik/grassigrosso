# Pages CMS Phase 3 — feeds, proxy & seed (design)

**Date:** 2026-08-03
**Status:** draft — awaiting review (no application code until approved)
**Depends on:** Phase 2 accepted (`9fc8711` + `cbf1230`)
**Requirements:** API-01 … API-06 (+ QA-01/02/03 locality)
**Non-goals this phase:** React hydrate (Phase 4), legal pages (Phase 6), push/deploy

## Problem

Wave 1 page content now lives in Strapi single types + fixtures, but the public site still cannot safely read it:

1. There is no public Strapi feed contract for the six pages.
2. The browser must never call Strapi directly (AGENTS.md / milestone invariant).
3. Without Node cache + disk snapshots, cold start / Strapi outage would 502 page content (same class of failure catalog already solved).
4. Contacts stores editor `map_iframe_html`; raw HTML must never reach React.
5. Fixtures validate schemas, but production-like seed + committed snapshots are not yet a repeatable local pipeline.

## Hypotheses

| # | Hypothesis | Measurement |
|---|------------|-------------|
| H1 | Per-page Strapi feeds mirror fixture shapes (plus normalized map URL) and are enough for Node to assemble one JSON per slug | Curl six Strapi feed URLs; schema/fixture parity harness |
| H2 | Single allowlisted Node route `GET /api/pages/:slug` is safer than six public Node routes | Unknown slug → 404; only six slugs succeed |
| H3 | Catalog fallback chain ports cleanly: live Strapi → memory cache → disk snapshot; empty/404 must not overwrite last-good | Stop Strapi / force empty feed; assert source + body |
| H4 | Map normalization at feed/proxy boundary removes XSS/HTML injection path | Malicious iframe fixture → omit or null `map_embed_url`; never raw HTML in Node response |
| H5 | Idempotent seed from six fixtures fills Admin to fixture parity without wiping catalog | Re-run seed twice; page fields match; catalog product count unchanged |

## Root cause (planning)

Phase 2 correctly deferred feeds/proxy/seed. Catalog already has the operational pattern (`server.cjs` cache + `catalog:export-snapshot` + refuse-empty export). Phase 3 must **reuse that pattern for pages**, not invent a second fallback model — with page-specific differences: slug allowlist, map URL normalization, and `source` vocabulary locked to `strapi | memory-cache | disk-snapshot` (API-05; no `stale-cache` alias in the public page contract).

## Locked decisions

### Slugs (allowlist)

Exactly six:

| Slug | Strapi single type | Fixture |
|------|--------------------|---------|
| `index` | `index-page` | `scripts/fixtures/pages-cms/index.json` |
| `hotels` | `hotels-page` | `…/hotels.json` |
| `dealers` | `dealers-page` | `…/dealers.json` |
| `contacts` | `contacts-page` | `…/contacts.json` |
| `documents` | `documents-page` | `…/documents.json` |
| `download-catalog` | `download-catalog-page` | `…/download-catalog.json` |

Any other `:slug` → **404** JSON (not catalog fallback, not empty 200).

### Strapi feeds (API-01)

- One public feed endpoint per page (preferred for clarity and permissions), e.g. `GET /api/index-page-feed`, …, or a single internal router that still exposes six stable paths.
- Feeds are **read-only**, public (same permission style as `download-catalog-feed` / `catalog-feed`).
- Response body = CMS content shaped for consumers: fixture field names as the baseline, plus feed-only derived fields where required (`map_embed_url` per office).
- `download-catalog` feed for **page texts/PDF** is distinct from existing `GET /api/download-catalog-feed` (slides). Do not break slides feed/proxy. Page proxy may either call a new texts feed or compose slides + texts; composition must be documented in the plan and covered by tests.
- Prefer AVIF substitution for media URLs using existing `prefer-avif` util where applicable (parity with catalog feeds).

### Node proxy (API-02, API-05)

- `GET /api/pages/:slug` in `server.cjs` only.
- Allowlist gate first.
- Fallback chain:

```
Strapi live (fresh) → memory-cache (TTL) → disk-snapshot → 502/503 with diagnostic body
```

- Response always includes `source`: `strapi` | `memory-cache` | `disk-snapshot` when a body is served.
- Mirror catalog header pattern with `X-Pages-Source` (or reuse a shared helper; name locked in implementation plan verify).
- **Never** replace a valid in-memory entry or disk snapshot with empty payload / Strapi 404 / HTTP error body.
- Cache TTL: reuse env pattern — e.g. `PAGES_STRAPI_CACHE_TTL_MS` (default prod 45s like catalog; local 0 unless set). Document in `.env.example`.
- Fresh Strapi success with non-empty validated payload updates memory cache.

### Disk snapshots (API-03)

- Files under `public/`, e.g. `pages-<slug>.snapshot.json` (six files) + `pages-snapshot.manifest.json`.
- Exporter: `npm run pages:export-snapshot` (Node hits **local** `GET /api/pages/:slug` with Strapi up, same idea as `catalog:export-snapshot`).
- Refuse export if any allowlisted slug returns empty/invalid payload.
- Manifest: `syncedAt`, per-slug sha256, optional content hashes; committed with snapshots.
- Vite/build already copies `public/` → `dist/`; Node reads `dist/` then `public/` like catalog.

### Empty / 404 protection

Treat as unusable Strapi results (do not write cache, do not overwrite snapshot on export):

- HTTP non-2xx
- `data: null` / missing required root keys for that slug
- Explicit empty sentinel (define per type: e.g. missing `hero` where required)

Automated tests must cover: with seeded snapshot present, forced Strapi failure still returns disk body with `source: disk-snapshot`.

### Map iframe normalization (API-06)

- Input: `page.office.map_iframe_html` (CMS / fixture).
- Feed (or shared util used by feed **and** asserted at Node boundary) extracts `src` from a single iframe.
- Allow only **HTTPS** URLs whose host is on an explicit allowlist (start with Yandex map widget hosts already used in fixtures, e.g. `yandex.ru` / `*.yandex.ru` map-widget paths — finalize list in implementation; reject everything else).
- Output field for consumers: `map_embed_url` (string | null). **Omit** raw `map_iframe_html` from public Node JSON (or strip before send) so React never sees HTML.
- No `dangerouslySetInnerHTML` in Phase 3 (no React work); contract is for Phase 4.

### Seed (API-04)

- Idempotent script: load six fixtures into the six single types (local Strapi `.tmp/data.db`).
- Does **not** replace catalog collections/products.
- Re-run produces same logical content (update-in-place / upsert single types).
- After seed: optional path documents `strapi:sync-seed` for DB commit **only when user asks**; Phase 3 default is local verify + page snapshot export, not remote deploy.
- Media in fixtures that reference `/uploads/…` must exist or be documented as public static paths; seed must not invent broken media contracts.

### Frontend invariant (regression)

- No new `VITE_STRAPI_*` and no browser fetch to `:1337` / `/api/*-feed` for pages.
- Grep/harness: `src/` must not call Strapi page feeds directly; only future Phase 4 may call Node `/api/pages/:slug`.

## Success criteria

1. Six public Strapi page feeds return fixture-parity JSON (plus `map_embed_url` where applicable).
2. `GET /api/pages/:slug` allowlist works; unknown slug → 404.
3. Live / memory-cache / disk-snapshot sources observed and asserted in automated tests.
4. Empty/404 Strapi cannot wipe memory cache or exporter overwrite of good snapshots.
5. Map HTML never appears in Node page JSON; only allowlisted HTTPS embed URLs.
6. Idempotent seed from six fixtures verified twice locally.
7. `pages:export-snapshot` writes six snapshots + manifest; refuse-empty.
8. Regression suite: pages API + fallback + allowlist + no direct frontend→Strapi; existing `check:catalog-api` / pages-cms-strict still PASS.
9. Local commits only; no push/PR/deploy.

## Open points for review (must resolve before coding)

1. **download-catalog composition:** separate texts feed vs extend slides feed vs Node merges two Strapi calls — recommend **separate texts feed** + keep slides feed unchanged; Node `/api/pages/download-catalog` returns texts (+ optional slides reference) without breaking `/api/download-catalog/slides`.
2. **Public JSON: strip vs keep `map_iframe_html`:** recommend **strip** on feed output.
3. **`source: memory-cache` vs catalog `stale-cache`:** API-05 locks page vocabulary to `memory-cache`; implement page path with that name even if catalog keeps `stale-cache`.
4. Seed writes into local `.tmp` only vs also updating `database/seed/data.db` in the same phase — recommend **local `.tmp` + tests first**; `strapi:sync-seed` as explicit optional Task when content is accepted.

## Non-goals

- React hydrate / changing page TSX consumers
- Email routing / `getPageName` changes
- Legal single types
- Changing catalog snapshot filenames or catalog `source` strings
- Push, Timeweb env mutation, remote smoke
