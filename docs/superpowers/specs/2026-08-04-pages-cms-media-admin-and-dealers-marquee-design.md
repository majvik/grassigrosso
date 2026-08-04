# Pages CMS media/Admin and dealers marquee hotfix

## Problem

- Some Pages CMS assets are available through canonical snapshot URLs but are broken in Strapi Admin.
- The dealers city marquee is present after React hydration but does not move.

## Root cause

- Pages CMS upload rows retained Strapi-generated URLs while only canonical deterministic files were committed. Admin reads the database URL; snapshots canonicalize it at serialization time.
- `initGeographyEffects()` ran before React replaced the dealers page DOM, leaving its observer attached to a detached marquee.

## Success criteria

- Every `pages-cms__*` upload row in the versioned seed resolves to a non-empty committed file; obsolete derivative metadata cannot point Admin at absent files.
- The local working database is repaired by the same deterministic operation.
- The dealers marquee changes its transform after hydrated DOM becomes visible.
- Existing Pages CMS, catalog, typecheck, and build gates remain green.
