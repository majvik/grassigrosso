# Pages CMS Gate Sync Design

## Problem

`check:pages-cms-hydrate-dom` still asserts the pre-consent contacts implementation (four Yandex iframe embeds) and the pre-14.09.2026 legal-document structure. The live React baseline intentionally renders consent-safe map placeholders and current structured legal defaults, so the mandatory local deploy gate is red although the accepted runtime is behaving correctly.

## Root cause

- Commit `411609b` introduced consent-gated maps and updated privacy/cookie documents but only minimally touched the older hydrate-DOM harness.
- The harness still hard-codes one global legal date, text-derived operator counts, tables on privacy, and iframe maps before consent.
- Current sources of truth are `src/components/pages/contacts-map-slot.tsx` and `src/pages/legal-defaults/*.json`.

## Design

Update only the DOM contract harness:

1. Assert consent-safe `DIV` map slots with four known slugs and no raw iframe HTML during baseline, CMS success, and null-map scenarios.
2. Keep tab visibility, layout, hooks, CMS copy hydration, and dangerous-HTML checks.
3. Use per-page legal dates from the committed defaults.
4. Assert structural legal invariants that still exist: the operator block on Terms and the wrapped table on Cookies. Do not infer operators from arbitrary privacy paragraphs containing OGRN/INN.

## Success criteria

- `npm run check:pages-cms-hydrate-dom` passes without weakening section allowlists, XSS checks, geometry checks, failure fallbacks, or tab behavior.
- Full local gate passes.
- Only `strapi-full-cms` is pushed; `main` remains untouched.
