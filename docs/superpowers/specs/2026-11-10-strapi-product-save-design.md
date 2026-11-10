# Strapi Product Save Reliability — Debug Spec

## Problem

The Strapi Content Manager reports a successful Davos save, but the selected product media does not appear in the product record, catalog feed, backend feed, or product page.

## Evidence

- Content Manager returned HTTP 200 for two Davos `PUT` requests at 19:18 local time.
- The Davos row `updated_at` changed at the same time.
- `products_cmps` contains no Davos component links and `files_related_mph` contains no Davos media links.
- Direct `/api/catalog-feed` and backend `/api/catalog/products` agree: Davos has an empty gallery and no media.
- The reopened admin form also shows empty Media and Gallery fields.
- The site is therefore not serving stale data; the relation disappears during Content Manager persistence.

## Hypotheses

1. Product media relation payloads from the current Strapi admin are transformed into an invalid shape before the document service persists them.
2. The custom product document middleware (`normalizeGalleryInput`) is incompatible with the current Strapi relation contract and can discard component media.
3. A more general Content Manager/media relation regression affects both top-level `media` and component `gallery` fields.

## Measurements

- Capture the incoming Content Manager product payload shape at the document boundary without logging credentials.
- Persist a product media relation in an isolated temporary database and assert the resulting `files_related_mph` / `products_cmps` links.
- Compare direct Strapi feed, backend feed and page consumer output after persistence.

## Success Criteria

- Saving a top-level product image or gallery image produces durable database relations.
- Reopening the admin form shows the saved media.
- Direct Strapi and backend feeds expose the saved item immediately in local development.
- A regression test fails before the fix and passes after it.
- Existing catalog API/UI, typecheck and build gates remain green.

