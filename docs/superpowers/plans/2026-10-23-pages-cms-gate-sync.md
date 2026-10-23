# Pages CMS Gate Sync Plan

1. [x] Reproduce the mandatory gate failure and capture exact assertions.
2. [x] Trace current contacts/legal baselines to their committed sources of truth.
3. [x] Replace stale iframe and legal-copy assumptions with current structural contracts.
4. [x] Run focused hydrate-DOM test to green.
5. [x] Run the full local test/build gate.
6. [ ] Commit and push only `strapi-full-cms` to `origin/strapi-full-cms`.

## Verification evidence

- RED: `npm run check:pages-cms-hydrate-dom` failed on iframe expectations, the old global legal date, text-derived operator counts, and a privacy table that no longer exists.
- GREEN (focused): `npm run check:pages-cms-hydrate-dom` — PASS for all wave-1 and legal pages.
- GREEN (full gate): `npm run check && npm run check:pages-cms-hydrate-dom && npm run check:personal-data && npm run check:khartsyzk-contact-details && npm run check:catalog-smart-selector && npm run check:catalog-ui && npm run check:modal-system && npm run check:catalog-smart-select-api && npm run check:catalog-firmness-scores && npm run check:medusa-license && npm run check:commerce-runtime && npm run build` — exit code 0.
