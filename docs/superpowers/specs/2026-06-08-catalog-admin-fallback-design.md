# Catalog admin fallback — design spec (Superpowers)

**Date:** 2026-06-08  
**Status:** done  
**Deploy:** Timeweb App Platform — push в `catalogue` → CI/CD → dev URL

## Problem

При сбое Strapi, cold start контейнера или пустом feed клиент **молча остаётся** на SSR/HTML fallback — 4 demo-карточки коллекций (`Classic`, `Flexi`, `Relax`, `Trend`). Пользователь видит не 43 товара из админки, а устаревший marketing demo.

## Hypothesis tree (GSD)

| # | Hypothesis | Test | Result |
|---|------------|------|--------|
| H1 | API 502 → client catch → static SSR остаётся | Stop Strapi, reload `/catalog` | Confirmed — 4 collection cards |
| H2 | Server не отдаёт stale при ошибке | `curl /api/catalog/products` with Strapi down | 502, no body |
| H3 | Empty `items: []` treated as success | Feed returns empty array | Cache/static kept |
| H4 | Cold start: no memory cache, no disk snapshot | Fresh container restart | 502 + static cards |

## Root cause

1. [`src/catalog/catalog-listing-controller.ts`](../../../src/catalog/catalog-listing-controller.ts) — silent catch «using static fallback»
2. [`src/components/pages/catalog-page-data.ts`](../../../src/components/pages/catalog-page-data.ts) `CATALOG_FALLBACK_CARDS` — 4 collections as product cards
3. [`catalog.html`](../../../catalog.html) — same 4 cards in SSR
4. [`server.cjs`](../../../server.cjs) — in-memory cache TTL 45s, deleted on expiry; no disk fallback

## Chosen strategy (user decision)

**Stale cache + git snapshot** from admin (via `strapi:sync-seed` → `catalog:export-snapshot`), not error-only UI.

## Target fallback chain

```
Strapi live → server stale cache (24h) → disk snapshot (git) → client sessionStorage → error UI + retry
```

Never show demo collection cards as product listing.

## Success criteria

| Criterion | Measure |
|-----------|---------|
| Strapi down locally | `/catalog` shows ≥43 products, `orient` slug present |
| No demo cards | DOM has no `data-product-slug="classic"` before JS loads products |
| Degraded source visible | API `source`: `stale-cache` \| `disk-snapshot`; header `X-Catalog-Source` |
| Live path unchanged | Strapi up → `source: strapi-catalog-feed`, smoke passes |
| Snapshot in git | `public/catalog-products.snapshot.json` ≥43 items, manifest committed |

## Solution

See [../plans/2026-06-08-catalog-admin-fallback.md](../plans/2026-06-08-catalog-admin-fallback.md).
