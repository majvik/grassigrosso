# Pages CMS Phase 4 — React hydrate (design)

**Date:** 2026-08-03
**Status:** draft — awaiting user affirm; **no React hydrate application code until affirmed**
**Depends on:** Phase 3 Complete (A–E accepted, `ad0d279`)
**Requirements:** FE-01 … FE-05 (+ QA-01/02/03 locality)
**Non-goals this phase:** Legal hydrate (Phase 6), catalog product/filter changes, email routing CMS, push/deploy, `strapi:sync-seed` unless separately requested, Phase 5 full milestone gate (beyond hydrate-specific harnesses)

## Problem

Wave 1 page content is available via Node `GET /api/pages/:slug` (live Strapi, memory-cache, or disk snapshot), but public React pages still render only hardcoded TSX:

1. Editors can change Strapi Admin content, but visitors never see it.
2. Hydrate must not empty the first paint or cause substantial CLS (FE-05).
3. Email form contracts (`getPageName` / `PAGE_EMAIL_ROUTING`) and runtime `data-*` / document keys / package values must stay code-owned (FE-03, FE-04).
4. Frontend must keep calling only Node `/api/pages/:slug` — never Strapi feeds / `:1337` / `VITE_STRAPI_*` (isolation gate).
5. download-catalog **texts** hydrate via pages API; **slides** remain on `/api/download-catalog/slides`.
6. Contacts maps: public payload is `map_embed_url` only — no `map_iframe_html`, no `dangerouslySetInnerHTML` for map HTML.

## Hypotheses

| # | Hypothesis | Measurement |
|---|------------|-------------|
| H1 | Hardcoded TSX as `useState` default + post-mount merge of Node `data` preserves first paint and avoids empty flash | Automated DOM/structure asserts + optional visual smoke; no blank hero on first client render |
| H2 | Shared `pages-api` client (catalog-style) + optional early prefetch is enough for all six slugs | Single module; isolation PASS; pages consume shared promise |
| H3 | Pure merge helpers keep code-owned hooks stable even when CMS labels/media change | Hook-attr harness; dealer `package.value` / `document_key` allowlists |
| H4 | API failure leaves fallback TSX unchanged (readable page) | Negative: 404/503/network → state stays DEFAULT |
| H5 | Map iframe uses `src={map_embed_url}` only when non-null; placeholders keep `data-map-*` hooks | Contacts harness + isolation of HTML |

## Root cause (planning)

Phase 3 delivered the content boundary. Phase 4 is a **consumer** problem: map Node canonical `data` onto existing React page modules without changing layout ownership or form routing.

## Locked decisions

1. **Architecture (Option B):** shared `src/pages/pages-api.ts` (or equivalent under `src/`) with `fetchPageContent(slug)` / `prefetchPageContent(slug)`; optional early prefetch from `main.js` when `data-page` is a wave-1 slug; thin `usePageCms(slug, fallback)` (or per-page equivalent) merges onto hardcoded defaults.
2. **First paint:** initial React render = current hardcoded content (extracted as `DEFAULT_*` / existing module consts). Fetch starts after mount (and/or via early prefetch promise). Never gate the whole page on API.
3. **Merge policy:** deep merge of CMS fields into fallback for **CMS-owned** paths only; code-owned hooks/attrs/ids/values never taken from API (or validated against allowlist and rejected if mismatched).
4. **Envelope:** client reads `{ data, source }` from Node; `source` may be logged/dev-only; rendering uses `data` only. Disk snapshot files are not fetched by React when Node is up — Node already falls back.
5. **download-catalog:** hydrate texts/PDF fields from `/api/pages/download-catalog`; slides continue via existing `/api/download-catalog/slides` path. Presence of slides fields in pages `data` → treat as invalid for hydrate (do not apply).
6. **Map:** render `<iframe src={map_embed_url}>` when string non-null and allowlisted shape already enforced by Node; never inject HTML. Keep `data-map-tab` / `data-map-frame` / `#map-{slug}`. Null URL → keep current placeholder / existing JS map behavior.
7. **Email:** do not read form `page` labels from CMS; do not change `getPageName` or `PAGE_EMAIL_ROUTING` keys.
8. **Out of scope pages:** `CatalogPage`, `LegalPage`, `NotFoundPage`, `UnsubscribePage` unchanged.
9. **Locality:** local commits only; no push / PR / deploy; no `strapi:sync-seed` unless asked.

## Response / client contract

| Item | Rule |
|------|------|
| URL | `GET /api/pages/:slug` only (`index` \| `hotels` \| `dealers` \| `contacts` \| `documents` \| `download-catalog`) |
| Success | HTTP 2xx + object `data` with per-slug required roots (same as Phase 3 usable check) |
| Failure | Non-OK / invalid `data` → keep fallback; no throw to blank UI |
| Forbidden client targets | `:1337`, `*-page-feed`, `VITE_STRAPI_*` |

## Code-owned inventory (must survive)

| Area | Examples |
|------|----------|
| Forms / email | `data-contact-form`, field ids, honeypot, privacy; `getPageName` outputs |
| Documents | `data-document` / `document_key` allowlist; `data-document-request-trigger`; help modal |
| Dealers | `data-package` / select `value` ∈ `{standard,individual,exclusive}` |
| Hotels | `data-open-commercial-offer`, `data-catalog`, `data-open-catalog` keys |
| Index | `#heroCommercialOfferLink`, `.hero-play-btn`, `data-document="presentation"` |
| Contacts | `data-map-tab`, `data-map-frame`, `#map-*`, `data-copy-email` |
| Download | `data-download-doc="catalog"`; slider chrome classes; slides runtime |

Content-contract source of truth remains `.planning/phases/02-wave-1-single-types/02-content-contract.json`.

## Architecture options considered

| Option | Summary | Verdict |
|--------|---------|---------|
| A | Per-page fetch/merge duplicated | Works but noisy |
| **B** | Shared pages-api + prefetch + merge hook | **Chosen** — catalog parity |
| C | Provider in `ReactIslandRoot` | Rejected — risks paint gating / prop drilling |

## Risks

| Risk | Mitigation |
|------|------------|
| CLS / empty first frame | Hardcoded-first state; no suspense boundary over whole page |
| Email breakage | Harness asserts `getPageName` / routing map unchanged; no CMS `page` field |
| XSS via map HTML | Never render HTML; iframe URL only |
| Dealer/document key drift | Allowlist assert on merge; FAIL hydrate apply if illegal value |
| Slides bleed into pages hydrate | Reject pages `data` containing slides keys |
| Isolation regression | Keep `check:pages-cms-isolation`; add assert that pages client path is `/api/pages/` only |

## Success criteria (FE + ROADMAP)

1. Six wave-1 surfaces hydrate from Node pages API (download-catalog = texts only).
2. API miss → readable hardcoded page.
3. Same fixture content ≈ pre-CMS layout (structure/hooks).
4. Email routing keys unchanged.
5. Runtime hooks stable; CMS owns copy/media, not behavior.
6. First render = full fallback.

## Verify strategy (phase-local)

- Unit: merge helpers, allowlists, invalid payload → no apply
- Isolation: still PASS; pages client only `/api/pages/`
- Hook harness: critical `data-*` / ids present after merge with fixture-shaped `data`
- Typecheck + build
- Optional local browser smoke (not sole evidence)
- No push / no sync-seed

## Affirm gate

User must explicitly affirm this design + the companion execution plan before any hydrate code lands in `src/components/pages/*` or `src/pages/*`.
