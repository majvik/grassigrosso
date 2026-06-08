# Catalog perf wave 4 — GSD execution plan

**Date:** 2026-06-08  
**Spec:** [2026-06-08-catalog-perf-wave4-design.md](../specs/2026-06-08-catalog-perf-wave4-design.md)  
**Deploy note:** Timeweb App Platform собирает Docker-образ из последнего commit; после `git push` dev подхватывает `server.cjs` и `dist/` без ручного restart.

## Phase 1 — Slimmer listing JSON (P0)

| ID | Task | File |
|----|------|------|
| 1.1 | Strip `sources[]` / `posterSources[]` from listing gallery items | `server.cjs` |
| 1.2 | Smoke: listing gallery item has no `sources` | `check-catalog-api.mjs` |

## Phase 2 — LCP preload (P0)

| ID | Task | File |
|----|------|------|
| 2.1 | `<link rel="preload" as="image">` for hero AVIF | `catalog.html` |

## Phase 3 — Perf budget smoke (P1)

| ID | Task | File |
|----|------|------|
| 3.1 | CDP budget script (cards, eager, uploads, DOM) | `scripts/check-catalog-perf.mjs` |
| 3.2 | npm script `check:catalog-perf` | `package.json` |

## Phase status

| Phase | Status |
|-------|--------|
| 1 | done |
| 2 | done |
| 3 | done |
