# Contacts map visual regression — execution plan

## Phase A — Diagnose and baseline audit

- [x] Inspect the live hydrated contacts DOM and map computed styles.
- [x] Compare iframe behavior with the pre-CMS JS-map treatment.
- [x] Audit sections, office cards, tabs, hooks and broken images.

## Phase B — Restore visual contract

- [x] Apply grayscale at the CMS iframe boundary.
- [x] Extend the contacts DOM gate with computed filter assertions for all tabs.

## Phase C — Verify

- [x] Run hydrate DOM, hydrate unit, isolation and typecheck gates.
- [x] Re-check the live contacts page and all four map tabs.
- [x] Commit locally and push only `strapi-full-cms`; never touch production.
