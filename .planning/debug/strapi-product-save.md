---
status: resolved
trigger: "Davos edits in Strapi report success but do not apply"
created: 2026-11-10
updated: 2026-11-10
---

## Symptoms

- Expected: selected Davos media persists and appears on the product page.
- Actual: cleared Davos fields persisted correctly, but hardcoded Davos fallbacks made the page look unchanged; Orient media existed but missing responsive derivatives caused a placeholder.
- Errors: no HTTP error; Content Manager PUT returns 200.
- Reproduction: select Davos media in Content Manager, save, reload/open the site.

## Current Focus

- resolved: persisted CMS data and both feeds agree; rendering fallbacks were masking cleared fields and missing generated derivatives.

## Evidence

- timestamp: 2026-11-10T19:18:22+03:00; Content Manager Davos PUT returned 200.
- timestamp: 2026-11-10T19:18:34+03:00; second Davos PUT returned 200.
- timestamp: 2026-11-10T19:21:00+03:00; Davos has zero `products_cmps` and `files_related_mph` links.
- timestamp: 2026-11-10T19:21:00+03:00; direct Strapi and backend feeds both expose empty Davos gallery.

## Eliminated

- hypothesis: Node API cache serves stale Davos.
  reason: direct Strapi feed, backend feed, SQLite and reopened admin all agree.

## Resolution

- root_cause: The product page contained Davos-specific hardcoded fallbacks. Responsive pictures also went directly from a missing generated variant to a placeholder instead of trying the original upload. Empty catalog galleries rendered no slide at all.
- fix: Removed Davos-specific fallbacks, added original-upload recovery before placeholder fallback, and added an explicit empty catalog-media placeholder slide.
- verification: SQLite, direct Strapi feed and backend feed agree; regression tests, typecheck, catalog API/UI smoke, showcase gates and full build pass.
- files_changed: `src/components/pages/ProductPagePrototype.tsx`, `src/components/ui/ResponsivePicture.tsx`, `src/media/responsive-media.ts`, `src/catalog/catalog-product-gallery.ts`, related check scripts and local snapshots.
