# Pages CMS Phase 7 — Global Site Chrome (design draft)

**Date:** 2026-08-04
**Status:** Planning only; implementation requires explicit affirm
**Depends on:** Phase 6 + deployed dev verification
**Locality:** local development first; no production actions

## Problem

Strapi edits page bodies and catalog data, but the shared site chrome is still duplicated across root HTML files. Editors cannot change the header announcement, phone/schedule, navigation labels, CTA, footer copy, contacts, requisites or policy labels without a frontend change and deploy. Desktop header and mobile menu are separate markup copies, so they can drift.

The current branch therefore is not yet a complete content-management surface. This is a missing product scope, not an Admin rendering bug.

## Inventory to freeze in Phase A

### Header

- top-bar greeting;
- public phone label/href and schedule;
- logo image/alt/home href;
- ordered primary navigation;
- contact CTA label/href;
- mobile open/close labels and icons.

### Footer

- logo, description;
- INN/OGRN labels and values;
- ordered navigation groups and links;
- phone, email, schedule;
- ordered policy links;
- copyright brand/year/legal text.

### Adjacent repeated chrome to classify, not automatically migrate

- cookie banner copy/link/button/icon;
- 404 and unsubscribe chrome;
- modal consent/legal labels;
- SEO Organization/Website JSON-LD contact values;
- code-owned menu behavior, focus management and CSS hooks.

## Proposed locked defaults (G1–G18)

| ID | Decision |
|---|---|
| G1 | One Strapi single type `site-chrome`, not per-page header/footer types. |
| G2 | Header and footer are structured components; no richtext/raw HTML. |
| G3 | Desktop and mobile navigation consume one ordered `primary_navigation[]`; duplicated authoring is forbidden. |
| G4 | Every behavior-bound item has immutable `key`; CMS edits label and validated href, never runtime selectors. |
| G5 | Initial navigation keys are fixed: `hotels`, `dealers`, `catalog`, `documents`, `contacts`. Unknown, missing, duplicate or reordered behavior keys reject the whole payload unless the contract is revised. |
| G6 | Exact internal href allowlist: `/`, `/hotels`, `/dealers`, `/catalog`, `/documents`, `/contacts`, `/contacts#contact-form`, `/privacy`, `/terms`, `/cookies`. |
| G7 | Phone/email validators allow only contracted `tel:` and `mailto:` fields; arbitrary protocols, credentials, ports, protocol-relative URLs and raw HTML reject atomically. |
| G8 | Header/footer layout, classes, IDs, `data-*`, menu icons and interactive behavior remain code-owned. CMS field does not grant permission to create a new UI slot. |
| G9 | Logo/icon media may be CMS-owned only in existing image slots; required media cannot be null. Root-relative public URL only. |
| G10 | Public Strapi feed: `{data}`; canonical snapshot stores only `data`; Node response: `{data,source}`. |
| G11 | Dedicated Node `GET /api/site-chrome`; browser never calls Strapi. Cache/stale/snapshot semantics reuse Pages CMS modules. |
| G12 | Full first-paint header/mobile/footer remains in every built HTML page. Thin/empty shell is forbidden. |
| G13 | Build-time generator owns marked chrome regions in root HTML files; strict defaults↔fixture↔generated HTML parity is mandatory. |
| G14 | Hydrate is atomic. Invalid/non-OK/timeout payload leaves the full initial chrome untouched. |
| G15 | Header/mobile/footer update together from one validated payload; partial surface update is forbidden. |
| G16 | Email submission routing, form `page` keys, analytics IDs, SEO canonical URLs and security attributes remain code-owned. |
| G17 | Seed starts in local `.tmp`; `strapi:sync-seed` only after full local gate and explicit approval. |
| G18 | Dedicated `check:pages-cms-phase-7` plus normal/`:record`; every bug found during execution needs a negative regression. |

## Proposed schema

### `site-chrome` single type

| Field | Type | Notes |
|---|---|---|
| `header` | `chrome.header` | required |
| `footer` | `chrome.footer` | required |

### `chrome.header`

`greeting`, `phone_label`, `phone_href`, `schedule`, `logo`, `logo_alt`, `primary_navigation[]`, `contact_cta_label`, `contact_cta_href`.

### `chrome.footer`

`logo`, `logo_alt`, `description`, `inn`, `ogrn`, `navigation_groups[]`, `phone_label`, `phone_href`, `email_label`, `email_href`, `schedule`, `policy_links[]`, `copyright_brand`, `copyright_legal_text`.

### Reusable items

- `chrome.link`: required immutable `key`, `label`, validated `href`;
- `chrome.navigation-group`: immutable `key`, title, ordered contracted links.

## Failure and security contract

- Unknown field/key, duplicate key, missing required key, invalid href/media, HTML-like string, empty required string or unsafe protocol rejects the complete payload.
- CMS output is text/attributes only; never `innerHTML`/`dangerouslySetInnerHTML`.
- `target`, `rel`, aria labels for menu controls and interactive selectors stay code-owned.
- Snapshot exporter publishes only after feed validation and an atomic nine-page-style manifest/hash check.

## Execution phases

| Phase | Deliverable | Required gate |
|---|---|---|
| A | Mechanical chrome inventory + content contract + exact page matrix | no blank/unowned rows |
| B | `chrome.*` schemas, `site-chrome`, RU Admin, strict serializer/feed | schema/contract negatives + dev/prod boot |
| C | fixture, `.tmp` seed, Node API, cache/snapshot/export | idempotency, rollback, degraded mode |
| D | shared typed client, atomic hydrate, generator/full SSR parity | desktop/mobile DOM + first-paint/failure/success |
| E | full local acceptance, Admin save/reload, catalog/legal regression | `check:pages-cms-phase-7` + evidence |

## Phase A required page matrix

Inventory every shared chrome occurrence in `index`, `hotels`, `dealers`, `contacts`, `documents`, `download-catalog`, `catalog`, `privacy`, `terms`, `cookies`, `404`, `unsubscribe`, and the marketing template. Each row must state:

- canonical field path;
- source DOM selector/attribute;
- CMS-owned or code-owned;
- desktop/mobile/footer consumer set;
- validator;
- fallback/default source;
- automated test owner.

## Explicit non-goals

- No production changes.
- No CMS-controlled email routing, analytics IDs, scripts, arbitrary HTML/CSS/classes or menu behavior.
- No generic page builder.
- No removal of first-paint HTML.
- No implementation during planning review.

## Acceptance criteria

1. Admin exposes one Russian single type for header/footer and every contracted field.
2. One edit updates desktop header, mobile menu and footer consistently on all contracted pages.
3. First paint is complete with Strapi/Node unavailable; CMS success causes no material layout shift.
4. Header/footer links and media pass strict allowlists; invalid payload is atomic fallback.
5. Site continues to work from disk snapshot, including referenced uploads.
6. All form/email/catalog/legal/navigation hooks and SEO/security invariants remain unchanged.
