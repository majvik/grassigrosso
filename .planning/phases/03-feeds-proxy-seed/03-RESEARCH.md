# Phase 3 research — Feeds, Proxy & Seed

**Status:** Planning — Superpowers revision applied; awaiting final affirm before Phase A
**Design:** [docs/superpowers/specs/2026-08-03-pages-cms-feeds-proxy-seed-design.md](../../../docs/superpowers/specs/2026-08-03-pages-cms-feeds-proxy-seed-design.md)
**Execution plan:** [docs/superpowers/plans/2026-08-03-pages-cms-feeds-proxy-seed.md](../../../docs/superpowers/plans/2026-08-03-pages-cms-feeds-proxy-seed.md)

## Context

Phase 2 delivered Wave 1 single types, fixtures, RU Admin, and catalog-scope regression. Phase 3 exposes that content safely to the site via Strapi feeds + Node proxy — **no React hydrate**.

## Pattern to reuse

Catalog already implements:

- Strapi feed → Node `GET /api/catalog/*`
- Memory TTL + stale/disk fallback in `server.cjs`
- `npm run catalog:export-snapshot` with refuse-empty
- `source` + `X-Catalog-Source`

Pages must mirror this with slug allowlist and API-05 `source` names: `strapi | memory-cache | disk-snapshot`.

## Inputs (frozen)

- Six fixtures: `scripts/fixtures/pages-cms/{index,hotels,dealers,contacts,documents,download-catalog}.json`
- Content contract: `.planning/phases/02-wave-1-single-types/02-CONTENT-CONTRACT.md`
- Map: CMS `map_iframe_html` → feed `map_embed_url` (API-06)

## Out of scope

React hydrate, legal, email routing, push/deploy.
