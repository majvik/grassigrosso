# Catalog perf wave 4 — design spec (Superpowers)

**Date:** 2026-06-08  
**Status:** in progress  
**Deploy:** Timeweb App Platform — push в `catalogue` → CI/CD → образ из Dockerfile → dev URL

## Problem

Wave 3 дал listing feed и preload API, но:

- listing JSON всё ещё ~52 KB — `sources[]` на каждом slide 0 дублирует `src`;
- LCP hero не preloaded как image (только fetch JSON);
- нет автоматического perf budget в smoke;
- на dev Timeweb после push нужен только redeploy из CI, не ручной restart.

## Targets

| Metric | Wave 3 | Wave 4 target |
|--------|--------|---------------|
| Listing JSON | ~52 KB | **≤35 KB** |
| LCP candidate preload | none | **`/catalog-hero.avif`** |
| Cards in DOM | 6 | **≤6** |
| Upload requests (no scroll) | ~9 | **≤8** |
| `check:catalog-perf` | — | **pass** locally + optional on dev URL |

## Solution

See [../plans/2026-06-08-catalog-perf-wave4.md](../plans/2026-06-08-catalog-perf-wave4.md).
