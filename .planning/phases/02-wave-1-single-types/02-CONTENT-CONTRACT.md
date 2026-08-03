# Content contract — Phase 2 Wave 1 (machine-readable)

**Status:** Task 1 rework — hard gate for Task 2
**Source of truth:** [`02-content-contract.json`](./02-content-contract.json)
**Fixtures:** [`scripts/fixtures/pages-cms/`](../../../scripts/fixtures/pages-cms/)
**Harness:** `npm run check:pages-cms-contract`

## Locked decisions

- Ownership: `cms` | `code` only
- CMS paths: exact dotted paths only (`root.attr…`); harness resolves recursively through component definitions
- Forbidden: `TBD`, `|`, `*`, whitespace/pseudo phrases, compound aggregations
- Map: **CMS = `page.office.map_iframe_html` via `contacts-page.offices[]` only**; Yandex lat/lng/zoom = temporary **code-owned** seed (`contacts-maps.js`), never a CMS attribute
- Download Catalog: existing attrs preserved (`media_display_mode`, `slider_autoplay_ms`, `slides` → `catalog.hero-slide`); Wave 1 adds `title` / `lead` (text) / `submit_label` / `catalog_pdf`; no TBD render slots
- Definitions: every Phase 1/2 component, existing `catalog.hero-slide`, and Wave 1 single types have attributes with `type` / `required` / `repeatable` / `allowedTypes` / `enum` / `default` as applicable
- Fixtures: real JSON for six pages under `scripts/fixtures/pages-cms/`; unknown keys FAIL

## Harness modes

| Mode | When | Schema expectation |
|------|------|--------------------|
| `contract` | Task 1 (default, no Phase 2 schema files) | Phase 1 schemas + RU full coverage + fixtures; Phase 2 schemas **not** required |
| `components` | `PAGES_CMS_SCHEMA_MODE=components` **or** any `phase2Components` file exists (and no new Wave 1 single types yet) | **All 16** `phase2Components` must exist and match contract attrs; missing single types still OK |
| `single-types` | `PAGES_CMS_SCHEMA_MODE=single-types` **or** any of the five new Wave 1 single types exists (and download-catalog not yet extended) | All 16 components + **five** page single types; download-catalog full contract match **not** required yet |
| `strict-schemas` | `PAGES_CMS_SCHEMA_MODE=strict` **or** download-catalog gains Task 4 fields (`title`/`lead`/`submit_label`/`catalog_pdf`) | **All** `phase2Components` + `phase2SingleTypes` (incl. extended download-catalog); full attribute contract compare; missing any → FAIL |

Phase 1 components and the pre-Task-4 `download-catalog-page` shape are handled explicitly: preserve-attrs always; full download-catalog contract only in strict (Task 4+).

npm shortcuts: `check:pages-cms-components`, `check:pages-cms-single-types`, `check:pages-cms-strict`.

Built-in negative checks (must themselves FAIL correctly): bad nested CMS path, extra fixture key, schema type/required mismatch, reserved `document_id` probe.

Regression: any `document_id` / `documentId` in component definitions or `strapi-catalog/src/components/page/*.json` → harness FAIL. Use `document_key` on `page.document-card`.

## Pages (6)

`index` · `hotels` · `dealers` · `contacts` · `documents` · `download-catalog`

## Components

- **Phase 1:** `page.hero`, `page.section`, `page.faq-item`, `page.list-item`
- **Phase 2:** see `phase2Components` in JSON (solution-card, document-card, office, …)

## Acceptance for Task 1 close

1. `npm run check:pages-cms-contract` → `PASS (contract)`
2. No forbidden path tokens in any `cms` row; nested paths fully resolve
3. Six fixtures validate with no unknown keys
4. Full Phase 1 RU CM+CTB keys present
5. `npm run typecheck` green
6. No Phase 2 schema files yet (or strict mode would require the full set)
7. `git diff --check` clean for contract docs

Task 2 must not start until this document and harness PASS without soft-skips.
