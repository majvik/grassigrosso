# Pages CMS Phase 6 — Legal pages (design) v2

**Date:** 2026-08-04  
**Status:** Phase A content contract **Accepted** (v2.1); Phase B **Done locally**; Phase C next  
**Requirements:** LEG-01, LEG-02  
**Depends on:** Phase 5 accepted (`7d26bcb`)  
**Locality:** no push / no `strapi:sync-seed` / no deploy unless separately asked  

## Problem

Privacy / terms / cookies live as hardcoded JSX in `legal-content.tsx` with **duplicated full SSR** in `privacy.html` / `terms.html` / `cookies.html`. Editors cannot update legal text without a code deploy. Wave-1 Pages CMS pipeline must be extended — not reinvented.

## Goals

1. **LEG-01** — Three Strapi single types (`privacy-page`, `terms-page`, `cookies-page`) with RU admin labels.  
2. **LEG-02** — Ordered structured block body sufficient for current legal pages + hydrate via Node `/api/pages/:slug` + disk snapshot; **first paint remains full SSR / hardcoded fallback**.  
3. Same `.legal-*` visual slots only — CMS cannot invent UI.  
4. No frontend→Strapi; no email-routing CMS; no CMS field named `updatedAt`.

## Locked decisions (v2 — from user corrections 1–8)

| ID | Decision |
|----|----------|
| **L1** | Extend existing `GET /api/pages/:slug` + feeds + snapshots. Allowlist grows to **nine** slugs (6 wave-1 + 3 legal) without regressing the first six. No legal-only public API. |
| **L2** | Browser never calls Strapi. |
| **L3** | First paint = **full legal fallback** (current SSR HTML and/or generated-from-`LEGAL_PAGES`). Thin shell **rejected** — it would destroy existing SSR first paint. |
| **L4** | No `getPageName` / `PAGE_EMAIL_ROUTING` changes for legal pages. |
| **L5** | CMS may only fill existing `.legal-*` / `LegalPage` slots — no new chrome. |
| **L6** | Content = **structured blocks only** — no raw HTML, no Strapi richtext HTML. |
| **L7** | Local verify; seed only into local `.tmp`; **no** `strapi:sync-seed` / push / deploy without separate permission. |
| **L8** | Dedicated `check:pages-cms-phase-6`. **Do not** embed into Phase 5 aggregator yet. |
| **L9** | Three single types: `privacy-page`, `terms-page`, `cookies-page`. |
| **L10** | Body = **single ordered array** of blocks: `paragraph \| list \| table \| operator`. Order of blocks **and** inline runs is part of the contract. |
| **L11** | Inline content = structured runs `text \| link` only. Exact JSON: `text` requires `value` + **required boolean** `strong`; `link` requires allowlisted `href` + **`children` as non-empty array of `text` runs only** (never a bare string; never nested link). No HTML. |
| **L12** | **Operator** = structured fields + appears as an **`operator` block** in the ordered flow. Requisites must **not** be duplicated as free-text paragraphs. |
| **L13** | CMS field **`effective_date`** (`date`). **Forbidden:** CMS attribute named `updatedAt` (collides with Strapi system). Display prefix `Дата последнего обновления:` is **code-owned**. |
| **L14** | **Mandatory full SSR** for legal first paint **and** a **non-waivable strict parity gate** (SSR body vs `LEGAL_PAGES`, normalized). Optional build-time HTML generator from `LEGAL_PAGES` may eliminate hand dual-source maintenance, but **must not** replace or skip parity on the result. Thin shell rejected. |
| **L15** | Links: **exact href allowlist** only (below). Any other href → **atomic reject** of entire CMS payload. Widen only via contract change. |
| **L16** | Unknown block type / unknown run type / unknown field / non-unique table headers / bad table shape / bad run shape → **atomic reject** of entire CMS payload. **No** vague “duplicate keys” rule on array blocks/items/rows/runs (identity = order). |
| **L17** | Tables: consistent header/cell counts; `data-label` is built by the **renderer** from headers (CMS does not author `data-label`). |
| **L18** | DOM gate: first paint **before** API response; success + failure paths; mobile tables; links; **absence of raw HTML**. |

### Link validator (L15)

**Exact allowlist (byte-identical after trim) — Phase 6:**

| Exact `href` |
|--------------|
| `https://grassigrosso.com` |
| `mailto:office@grassigrosso.com` |
| `/privacy` |

No open class of “any root-relative / any mailto / any grassigrosso.com URL”. Expansion = contract revision + validator update.

## Block / run schema (contract sketch — Phase B implements)

### Page fields (each of 3 single types)

| Field | Type | Owner | Notes |
|-------|------|-------|-------|
| `title` | string | cms | → `.legal-page-title` / `<h1>` |
| `effective_date` | date | cms | → formatted date after code-owned prefix |
| `body` | ordered component/DZ array | cms | blocks only |

**Not CMS:** display string `Дата последнего обновления:`; system Strapi `updatedAt` / `createdAt`.

### Block types (`body[]`)

| `type` | Payload | Renders |
|--------|---------|---------|
| `paragraph` | optional `heading` (string); `runs: InlineRun[]` | optional `<h2>` + `<p>` |
| `list` | optional `heading`; `items: { runs: InlineRun[] }[]` | optional `<h2>` + `<ul>/<li>` |
| `table` | optional `heading`; `headers: string[]`; `rows: { cells: InlineRun[][] }[]` with `cells.length === headers.length` | optional `<h2>` + `.legal-table-wrap` / `.legal-table`; renderer sets `data-label` from `headers[i]` |
| `operator` | structured: `legal_name`, `ogrn`, `inn`, `address`, `email` (+ optional `role_label` string e.g. «Оператор персональных данных») | existing content slot; **no** free-text duplicate of these fields elsewhere in `body` |

### Inline runs (exact)

```json
{ "type": "text", "value": "<string>", "strong": false }
{ "type": "link", "href": "<allowlisted string>", "children": [ { "type": "text", "value": "<string>", "strong": false } ] }
```

- `text.strong` is **required** boolean (no omission).
- `link.children` is **always** a non-empty array of `text` runs (never a bare string; never nested `link`).
- Unknown properties → atomic reject.

## Proposed execution phases

| Phase | Goal | Gate |
|-------|------|------|
| **A** | Content contract matrix + L1–L18 freeze | **Accepted** |
| **B** | Schemas + RU + feeds | **Done locally** (`check:pages-cms-phase-6b`) |
| **C** | Allowlist×9, seed `.tmp`, snapshots | next |
| **D** | Defaults + hydrate + parity/generator path | hydrate + DOM (L18) |
| **E** | `check:pages-cms-phase-6` + LEG closeout | recorded PASS; no push/sync-seed |

## Out of scope

- Thin-shell HTML that empties SSR legal body  
- Raw HTML / richtext HTML from CMS  
- CMS field `updatedAt`  
- Embedding Phase 6 into Phase 5 aggregator (for now)  
- Push / deploy / `strapi:sync-seed` without separate ask  
- Email routing CMS  

## Success criteria (Phase 6 close)

1. Contract: every legal slot owned; block/run order contracted; atomic reject rules enforced.  
2. Admin edits three legal pages in RU (local Strapi).  
3. Node serves nine slugs; wave-1 six unchanged in behavior.  
4. Hydrate + full first-paint fallback; DOM gate L18 green.  
5. Strict parity gate always green (generator optional; parity non-waivable).  
6. Attestation: no push / sync-seed / deploy unless asked.

---

*Design v2.1: 2026-08-04 — Phase A Accepted; Phase B Done locally*
