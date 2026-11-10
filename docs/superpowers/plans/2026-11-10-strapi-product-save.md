# Strapi Product Save Reliability — Execution Plan

**Spec:** `docs/superpowers/specs/2026-11-10-strapi-product-save-design.md`

## Phase 1 — Reproduce and locate loss

- [x] Compare reopened Content Manager state, SQLite relations, direct Strapi feed and backend feed.
- [x] Confirm that caching is not the cause.
- [x] Confirm persisted relations and current feed payloads for Davos, Orient and Orient Plus.

Verify: evidence must identify the first boundary where selected media disappears.

## Phase 2 — Regression test

- [x] Add regression contracts for empty CMS media, original-file recovery and empty catalog-card placeholders.
- [x] Demonstrate the contracts fail before implementation.

Verify: test must inspect durable relations and serialized feed output.

## Phase 3 — Root-cause fix

- [x] Remove hardcoded Davos page fallbacks and render neutral placeholders for genuinely empty fields.
- [x] Recover the original CMS upload before falling back to a placeholder when generated variants are absent.
- [x] Render a catalog-card placeholder when both gallery and legacy image are empty.

## Phase 4 — Local gates

- [x] Run changed tests, typecheck, Strapi build, catalog API/UI checks and full build.
- [x] Verify persisted state through SQLite/direct Strapi/backend feeds without opening Content Manager.
- [x] Record exact commands/results here.

Verify results:

- `node scripts/check-responsive-picture.mjs` — pass.
- `node scripts/check-product-page-prototype.mjs` — pass.
- `npm run typecheck` — pass.
- `npm run check:responsive-media` — pass (8 slots).
- `npm run check:strapi-responsive-upload` — pass (5/5).
- `npm run check:catalog-api` — pass (43 products).
- `npm run check:catalog-ui` — pass, including Davos catalog placeholder and product-page media fallbacks.
- `npm run media:generate-responsive` — pass; generated missing Orient/Orient Plus derivatives from the current snapshot.
- `npm run check:catalog-perf` — pass (12 cards, 9 upload requests, 1181 DOM nodes).
- `npm run check:site-mode`, `check:showcase-server`, `check:showcase-ui` — pass.
- `STRAPI_TELEMETRY_DISABLED=true npm run build` — pass, including Strapi admin.
- `npm run catalog:export-snapshot` — pass, 43 products exported.

## Status

- Phase 1: complete
- Phase 2: complete
- Phase 3: complete
- Phase 4: complete

