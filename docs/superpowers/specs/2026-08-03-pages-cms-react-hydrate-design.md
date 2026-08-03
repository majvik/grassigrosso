# Pages CMS Phase 4 — React hydrate (design)

**Date:** 2026-08-03
**Status:** draft v2 — awaiting user affirm after merge/lifecycle/DOM lock; **no React hydrate application code until affirmed**
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
| H1 | Hardcoded TSX as `useState` default + post-mount merge of Node `data` preserves first paint | **Mandatory** DOM gate: delayed API → first paint = full fallback |
| H2 | Shared `pages-api` client (one in-flight promise/slug) is enough for six slugs | Isolation PASS; lifecycle unit tests |
| H3 | Typed merge (not generic deep-merge) keeps behavior-bound keys stable | Merge harness + DOM hook asserts |
| H4 | API failure leaves fallback unchanged | DOM gate: 404/503/network/invalid → fallback |
| H5 | Map iframe uses `src={map_embed_url}` only when non-null | DOM: no raw CMS HTML; iframe src allowlisted |

## Root cause (planning)

Phase 3 delivered the content boundary. Phase 4 is a **consumer** problem: map Node canonical `data` onto existing React page modules without changing layout ownership or form routing. Generic deep-merge is insufficient — field and repeatable semantics must be explicit.

## Locked decisions (product)

1. **Architecture (Option B):** shared `src/pages/pages-api.ts` (or equivalent) with `fetchPageContent` / `prefetchPageContent`; early prefetch from `main.js` when `data-page` is wave-1; `usePageCms(slug, fallback)` merges onto hardcoded defaults.
2. **First paint:** initial React render = current hardcoded content. Never gate the whole page on API.
3. **Envelope:** client validates runtime envelope `{ data, source }` + per-slug required roots (same as Phase 3 usable check); TypeScript types are not sufficient proof.
4. **download-catalog:** texts/PDF from `/api/pages/download-catalog`; slides via `/api/download-catalog/slides`. Pages `data` containing `slides` / `media_display_mode` / `slider_autoplay_ms` → **invalid** (reject payload).
5. **Map:** `<iframe src={map_embed_url}>` only when non-null string; never HTML. Keep `data-map-tab` / `data-map-frame` / `#map-{slug}`. Null URL → placeholder / existing JS map path.
6. **Email:** `getPageName` / `PAGE_EMAIL_ROUTING` unchanged; not CMS-driven.
7. **Out of scope pages:** Catalog / Legal / 404 / Unsubscribe unchanged.
8. **Locality:** local commits only; no push / PR / deploy; no `strapi:sync-seed` unless asked.

---

## 1. Merge semantics (locked)

Merge is a **pure function** per slug:

`mergePageContent(slug, fallback, data) → { ok: true, value } | { ok: false, reason }`

### Atomicity

- One payload is applied **all-or-nothing**.
- Any violation (invalid scalar, illegal null, behavior-bound key error, slides bleed, missing required root after validation, unknown forbidden key) → `{ ok: false }` and the page **keeps the previous fallback state unchanged**.
- **No partial apply** of a failing payload.

### Presence vs absence

| Incoming | Meaning |
|----------|---------|
| Key **absent** on object | Keep fallback value for that key |
| Key **present** | Apply type rules below (may still reject whole payload) |

### Scalars (string)

| Value | Rule |
|-------|------|
| Absent | Fallback |
| Non-empty string (after trim? **no trim for apply** — use exact CMS string; trim only for emptiness check) | If `trim().length > 0` → CMS; if `trim().length === 0` → see empty string |
| `""` or whitespace-only | **Reject payload** for any CMS-owned string that is required by schema/fixture contract for that path; for explicitly **optional** strings (`note`, empty-able `href`, `image_alt` where schema allows empty) → apply CMS empty string |
| `null` | **Allowed only** where public contract is nullable: today **`map_embed_url` only** → apply `null` (no iframe). Any other string field with `null` → **reject payload** |
| Non-string (number/bool/object) | Reject payload |

Optional-empty string paths (apply `""`): `*.note`, `*.href` when empty means “no link”, and other paths marked optional-empty in the merge table implemented in Phase A (derived from schema `required: false` string attrs). All other CMS strings: empty → reject.

### Media

| Value | Rule |
|-------|------|
| Absent | Fallback |
| `{ url: non-empty string }` (+ optional alt sibling fields) | CMS |
| `null` | If media attr optional → apply `null` (no image). If required → reject |
| `{}`, `{ url: "" }`, non-object | Reject |

### Booleans / numbers

| Value | Rule |
|-------|------|
| Absent | Fallback |
| Valid boolean / finite number | CMS |
| `null` | Reject (no nullable bool/number in wave-1 public contract) |

### Objects (nested components, non-array)

- Absent → fallback object.
- Present → recursively merge **known CMS-owned keys only**; unknown keys in CMS object → **reject** (strict).
- Code-owned nested keys are never copied from CMS (they simply are not in the merge allowlist).

### Arrays — presence

| Value | Rule |
|-------|------|
| Key **absent** | Keep entire fallback array |
| Key **present** as `[]` | **Empty array is not absence.** Semantics depend on array category (below) |
| Key present as non-array | Reject |

Generic deep-merge of arrays by index is **forbidden**.

---

## 2. Repeatable arrays: content-only vs behavior-bound

### Categories

| Category | Composition / order | Stable key | Unknown / duplicate keys | Empty `[]` |
|----------|---------------------|------------|----------------------------|------------|
| **content-only** | CMS may change length and order | None required | N/A (items are free-form content) | Apply empty list (section renders empty) |
| **behavior-bound** | **Order and membership from fallback**; CMS cannot add/remove/reorder keys | Required per table | **Reject payload** | **Reject payload** (would drop hooks) |

Behavior-bound algorithm:

1. Build `Map` from CMS items by stable key.
2. CMS set of keys must equal fallback set of keys (same membership).
3. No missing keys, no extras, no duplicates, no blank keys.
4. Emit array in **fallback order**.
5. For each key, merge item fields with scalar/media rules; nested content-only arrays inside an item follow content-only rules.
6. Stable key field itself stays **fallback value** (CMS must match exactly; mismatch → reject).

### Exact table (wave-1 public `data` paths)

| Page | Path | Category | Stable key | Allowlist / notes |
|------|------|----------|------------|-------------------|
| dealers | `packages` | **behavior-bound** | `value` | Exactly `{standard, individual, exclusive}` matching fallback; drives `data-package` / select `value` |
| dealers | `packages[].features` | content-only | — | Nested under matched package |
| documents | `certificates` | **behavior-bound** | `document_key` | Must match fallback set; drives `data-document` / download ids |
| documents | `company_documents` | **behavior-bound** | `document_key` | Same |
| index | `docs` | **behavior-bound** | `document_key` | Same family as documents |
| contacts | `offices` | **behavior-bound** | `slug` | Must match fallback set (e.g. `main`, `voronezh`); drives `#map-{slug}`, `data-map-tab` / `data-map-frame` |
| hotels | `products` | **behavior-bound** | `catalog_key` | Must match fallback set; drives `data-catalog` / `data-open-catalog` |
| hotels | `contact_info` | **behavior-bound** | `icon_key` | Exactly fallback set ⊆ `{phone, email, location}`; icon + copy-email behavior |
| dealers | `contact_info` | **behavior-bound** | `icon_key` | Same |
| contacts | `contact_info` | **behavior-bound** | `icon_key` | Same |
| index | `solutions` | content-only | — | |
| index | `philosophy_cards` | content-only | — | |
| index | `collections` | content-only | — | |
| index | `collections[].features` | content-only | — | |
| index | `testimonials` | content-only | — | |
| hotels | `stats` | content-only | — | |
| hotels | `categories` | content-only | — | Chrome `.category-arrow` stays in TSX |
| hotels | `discount_rows` | content-only | — | |
| hotels | `refresh_features` | content-only | — | |
| hotels | `faq_items` | content-only | — | `data-faq-item` is per rendered row, not a CMS key |
| dealers | `stats` | content-only | — | |
| dealers | `conditions` | content-only | — | |
| dealers | `offers` | content-only | — | |
| dealers | `offers[].bullets` | content-only | — | |
| dealers | `geography_cities` | content-only | — | `#geographyMapContainer` is code chrome |
| dealers | `requirements` | content-only | — | |
| dealers | `requirements[].bullets` | content-only | — | |
| dealers | `faq_items` | content-only | — | |
| documents | `faq_items` | content-only | — | |
| download-catalog | *(no repeatables in pages texts)* | — | — | `slides` forbidden on pages payload |
| any | `slides` / slider fields on download-catalog pages data | **forbidden** | — | Reject payload |

`partners` / other roots: if present in canonical `data` as arrays without behavioral keys, classify **content-only** in Phase A harness table (must stay in sync with fixtures + `CANONICAL_REQUIRED_KEYS`).

### Code-owned (never merged from CMS)

Hooks/attrs/ids listed in content-contract `ownership: code` — including form chrome, `getPageName`, map tab wiring, slider setup, commercial-offer triggers. Merge allowlists omit them.

---

## 3. Shared client lifecycle (locked)

Module: `src/pages/pages-api.ts` (indicative).

| Rule | Detail |
|------|--------|
| **One in-flight promise per slug** | `prefetch` / `fetch` share a `Map<slug, Promise>` — concurrent callers await the same promise |
| **Success cache** | Only **validated** `{ data, source }` may be stored as resolved success for reuse within the page session |
| **No poison cache** | Non-OK HTTP, timeout, network error, invalid JSON, failed runtime validator → **do not** store as success |
| **Rejected / failed entry cleared** | On failure, delete the slug entry from the in-flight map so a later mount/prefetch can retry |
| **Timeout** | Client-side abort (e.g. `AbortSignal` / explicit timeout constant, documented in harness); timeout ≡ failure |
| **Runtime validator** | Must check: allowlisted slug; body is object; `source ∈ {strapi,memory-cache,disk-snapshot}`; `data` plain object; Phase 3 required roots present; no `map_iframe_html`; download-catalog forbidden keys absent; then merge-validator may still reject | Not a TypeScript cast |
| **Hook safety** | `usePageCms`: if unmounted before resolve, **do not** call `setState`; use cancelled flag / `ignore` pattern |
| **Apply path** | On success → `mergePageContent`; if merge `ok:false` → keep fallback (treat as soft failure, same as invalid) |

Prefetch from `main.js` is encouraged but must obey the same map/lifecycle.

---

## 4. Mandatory browser / DOM gate (locked)

Not optional. Implemented as automated headless Chrome (same family as `check:catalog-ui`) — e.g. `npm run check:pages-cms-hydrate-dom` — and required for Phase E (and smokeable per page as pages land in B–D).

### Scenarios (each of six wave-1 pages)

| Scenario | Assert |
|----------|--------|
| **Delayed API** | Hold/slow `/api/pages/:slug` until after first paint; first paint DOM contains **full fallback** copy landmarks + all critical hooks |
| **Success API** | Resolve with CMS payload that changes visible text/media; after hydrate, CMS text/media visible; critical hooks **unchanged** |
| **404 / 503 / network / invalid body** | Fallback remains; hooks remain; no blank main |
| **Raw HTML** | Response must never yield `map_iframe_html` in DOM; no `dangerouslySetInnerHTML` CMS HTML; map only via iframe `src` when URL set |

### Critical selectors (minimum; extend per page in harness)

| Page | Must remain present |
|------|---------------------|
| index | `#heroCommercialOfferLink`, `.hero-play-btn`, `[data-document="presentation"]` |
| hotels | `[data-contact-form]`, `[data-open-commercial-offer]`, `[data-catalog]`, `[data-open-catalog]` |
| dealers | `#geographyMapContainer`, `[data-package]`, `[name="package"]`, `[data-contact-form]` |
| contacts | `[data-map-tab]`, `[data-map-frame]`, `#map-main` (and other fallback office slugs), `[data-contact-form]` |
| documents | `[data-document]`, `[data-document-request-trigger]`, `[data-open-help-modal]` |
| download-catalog | `[data-download-doc="catalog"]`, form field ids / honeypot / privacy hooks |

### FE-05 measurable criterion (locked)

1. **Parity hydrate:** CMS `data` content-equal to fallback CMS fields (seed/fixture parity). Capture geometry of landmarks before apply and after apply: for each of `{hero title/h1, [data-contact-form] or main CTA, first content section root}` record `getBoundingClientRect()` → **fail if any \|Δtop\| > 1px or \|Δleft\| > 1px or \|Δwidth\| > 1px**.
2. **Delayed API:** with paint before resolve, assert no empty hero/main (innerText of hero/title non-empty equals fallback) and CLS-equivalent: same landmark widths/left stable through the wait (top may be unchanged too).
3. **Divergent copy hydrate:** vertical reflow allowed; **left/width** of chrome hooks (`[data-contact-form]`, `[data-package]`, map tabs) must stay within 1px.

Harness records numbers in stdout for the plan evidence log.

---

## Response / client contract

| Item | Rule |
|------|------|
| URL | `GET /api/pages/:slug` only |
| Success | HTTP 2xx + runtime-validated envelope + successful merge |
| Failure | Keep fallback; clear in-flight entry; no blank UI |
| Forbidden | `:1337`, `*-page-feed`, `VITE_STRAPI_*` |

## Architecture options

| Option | Verdict |
|--------|---------|
| A Per-page fetch | Rejected — noisy |
| **B Shared client + merge** | **Chosen** |
| C Provider in island root | Rejected — paint risk |

## Risks

| Risk | Mitigation |
|------|------------|
| Partial merge bugs | Atomic reject |
| Behavior key drift | Behavior-bound table + harness negatives |
| Poisoned promise cache | Clear on failure; no cache of invalid |
| CLS | Mandatory DOM geometry criterion |
| Map XSS | URL-only iframe |

## Success criteria (FE + ROADMAP)

1. Six pages hydrate from Node pages API (download texts only).
2. API miss → readable fallback.
3. Layout/hooks stable per merge + DOM gates.
4. Email routing keys unchanged.
5. CMS owns copy/media; behavior keys code-owned.
6. FE-05 geometry criterion green.

## Affirm gate

User must explicitly affirm this design **v2** + companion execution plan before any hydrate code lands.
