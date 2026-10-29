# Catalogue product page only — execution plan

**Status:** complete

## Phase 1 — Regression contract

- Extend showcase browser coverage: click card, assert product URL and page controls, assert quick-view modal is absent.
- Verify the test fails before implementation.

Result: PASS. Before implementation the test failed because the URL remained empty after a card click. The final browser test verifies product navigation and every preserved control.

## Phase 2 — Navigation and cleanup

- Move card-click navigation into the listing controller.
- Remove quick-view bootstrap, overlay relocation, and legacy HTML.
- Preserve product-page contact, favourite, share, help, gallery, and specifications.

Result: complete. The quick-view controller, bootstrap path, overlay relocation, and HTML were removed. Cards navigate to the existing product page. Contact now links to `/contacts?product=<slug>#contact-form`; favourite and share remain interactive on the product page.

## Phase 3 — Verification

- `npm run check:showcase-ui`
- `npm run typecheck`
- `SITE_MODE=showcase npm run build:web`
- `npm run check:showcase-bundle`
- `git diff --check`

Result:

- `npm run check:showcase-ui` — PASS.
- `npm run check:catalog-ui` — PASS, including desktop/mobile product-page layout.
- `npm run check:modal-system` — PASS for the remaining purpose-specific modals.
- `npm run typecheck` — PASS.
- `SITE_MODE=showcase npm run build:web` — PASS; catalogue HTML reduced from 60.30 kB to 50.13 kB and the catalogue runtime chunk remains 101.48 kB without the quick-view controller.
- `npm run check:showcase-bundle` — PASS.
- `git diff --check` — PASS.

No push or deployment is authorized.
