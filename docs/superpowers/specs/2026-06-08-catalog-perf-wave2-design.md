# Catalog perf wave 2 — design spec (Superpowers)

**Date:** 2026-06-08  
**Status:** in progress  
**Related:** [2026-06-01-catalog-perf-debugging-design.md](./2026-06-01-catalog-perf-debugging-design.md)

## Problem

Wave 1 снизил upload-запросы (46→9) и eager images (43→2), но каталог **ещё не «летает»**:

- после Strapi hydrate в DOM оставались **43 карточки** (`display:none` на 37);
- gallery controllers и layout cost на скрытых карточках;
- monolithic `main.js` (~235 KB) грузится на всех страницах;
- products JSON **55 KB** с полными gallery для listing.

## Target (dev/prod `/catalog`)

| Metric | Wave 1 (dev) | Wave 2 target |
|--------|--------------|---------------|
| Cards in DOM (no scroll) | 43 | **≤6** |
| DOM nodes | ~2252 | **≤600** |
| Gallery controllers (visible) | ~43 bound roots | **≤6** |
| `/uploads/` before scroll | 9 | **≤7** |
| Main-thread hydrate long task | ~100ms+ | **≤50ms** |
| `main.js` on non-catalog pages | full catalog code | **code-split** |

## Root causes (wave 2)

1. **Virtual pagination only via CSS** — все карточки в DOM, фильтр toggles `display`.
2. **Meta из DOM** — фильтрация привязана к 43 `<article>`, а не к in-memory catalog.
3. **Catalog bundle in main** — listing/gallery/modals в entry chunk всех страниц.

## Solution phases

See [../plans/2026-06-08-catalog-perf-wave2.md](../plans/2026-06-08-catalog-perf-wave2.md).

## Future (wave 3)

- Slim listing API (`?view=listing`) — gallery[0] only in JSON
- Filter index / worker для 100+ SKU
- Lighthouse TBT/LCP budget в CI
