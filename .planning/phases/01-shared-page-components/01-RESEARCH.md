# Phase 1: Shared Page Components - Research

**Researched:** 2026-08-03
**Domain:** Strapi 5 reusable components (`page.*`) + RU admin labels for Pages CMS wave 1
**Confidence:** HIGH

## Summary

Phase 1 only introduces four reusable Strapi components under category `page`, shaped from the real wave-1 React copy (`HotelsPage`, `DealersPage`, `ContactsPage`, `DocumentsPage`, `IndexPage`, `shared-page-sections.tsx`). The repo already has the exact pattern to copy: JSON schemas in `strapi-catalog/src/components/<category>/`, Russian field labels via `strapi-catalog/src/admin/translations/ru.json` (and optional attribute `displayName` as on `Product`), and `prepare-dist.cjs` syncing `components/` into `dist/src` for `strapi develop`.

Stack is Strapi **5.42.1** (`@strapi/strapi`). Components are not content-types: no `draftAndPublish`, no feeds, no seed. Nestability for success criterion 3 is proven **inside** Phase 1 by `page.section` → repeatable `page.list-item` (no wave-1 single type required). Full per-page single types, complete ADM-04 coverage for those types, feeds, proxy, and React hydrate stay in Phases 2–4.

**Primary recommendation:** Add four JSON schemas under `strapi-catalog/src/components/page/` plus matching `ru.json` keys (content-manager + content-type-builder), mirror existing `catalog.*` component shape, keep English snake_case attribute keys, Russian labels for editors.

## Standard Stack

### Core

| Library / artifact | Version / path | Purpose | Why Standard |
|--------------------|----------------|---------|--------------|
| `@strapi/strapi` | 5.42.1 | CMS runtime + CTB | Already in `strapi-catalog/package.json` |
| Component schemas | `strapi-catalog/src/components/<category>/*.json` | Reusable field groups | Official Strapi model location; existing `catalog.*` |
| Admin RU overrides | `strapi-catalog/src/admin/translations/ru.json` | Field/component labels | Existing project pattern + `registerTrads` in `admin/app.js` |
| Dist asset sync | `strapi-catalog/scripts/prepare-dist.cjs` | Copy `components/` into `dist/src` | Required for `strapi develop` after dist wipe |

### Supporting

| Artifact | Purpose | When to Use |
|----------|---------|-------------|
| Attribute `displayName` on schema attrs | Inline RU label (Product pattern) | Prefer **plus** `ru.json` for CTB/CM consistency |
| Component `info.displayName` | CTB sidebar / picker label | Russian display names for `page.*` |
| `types/generated/components.d.ts` | Generated TS map of UIDs | Regenerates on Strapi start/build — do not hand-edit as source of truth |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Category `page` + 4 components | One mega `page.block` + dynamic zone | Rejected: roadmap names discrete roles; DZ harder for editors |
| Russian attribute **keys** | English snake_case keys + RU labels | Keep English keys (API/feed stability); match `catalog.*` |
| Shared hero with video fields | Index-only video on single type (Phase 2) | Index hero is video+poster; hotels/dealers/contacts/docs are image — keep shared hero image+CTA only |
| Nested FAQ wrapper component | `faq_title` on single type + repeatable `page.faq-item` | Matches `FaqSection` props; roadmap lists `faq-item` not `faq-section` |

**Installation:** none — no new npm packages. Schema files only.

## Exact Component Schemas

Derived from wave-1 page copy shapes (not speculative CMS features).

### `page.hero` → `strapi-catalog/src/components/page/hero.json`

**UID:** `page.hero`  
**collectionName:** `components_page_heroes`  
**displayName (RU):** `Hero страницы`  
**icon:** `landscape`

| Attribute | Type | Required | Maps to React |
|-----------|------|----------|---------------|
| `title` | `string` | yes | `page-hero-title` / `contacts-hero-title` / `documents-hero-title` / Index `hero-title` text |
| `description` | `text` | no | `*-hero-description` (multiline; Dealers uses `<br />` → store `\n`) |
| `image` | `media` (`images`, single) | no | Hero `<picture>` still image (hotels/dealers/contacts/documents) |
| `image_alt` | `string` | no | `<img alt>` |
| `cta_label` | `string` | no | Hotels «Скачать каталог», Index «Получить подробную информацию» |
| `cta_url` | `string` | no | CTA `href` / anchor (`#contact-form`, `/catalog`, …) |

**Out of this component (Phase 2+ on Index single type):** desktop/mobile video sources, poster, play button chrome.

### `page.section` → `strapi-catalog/src/components/page/section.json`

**UID:** `page.section`  
**collectionName:** `components_page_sections`  
**displayName (RU):** `Секция`  
**icon:** `layer`

| Attribute | Type | Required | Maps to React |
|-----------|------|----------|---------------|
| `title` | `string` | yes | `.section-title` (conditions, offers, discount, docs help, …) |
| `subtitle` | `text` | no | `conditions-subtitle`, `offers-subtitle`, `discount-subtitle`, `packages-subtitle`, … |
| `body` | `text` | no | Longer prose when a section has a paragraph beyond subtitle |
| `items` | component `page.list-item`, **repeatable** | no | Nested bullets / feature rows under a section |

Nesting `items` → `page.list-item` is the Phase 1 proof that components compose without schema errors.

### `page.faq-item` → `strapi-catalog/src/components/page/faq-item.json`

**UID:** `page.faq-item`  
**collectionName:** `components_page_faq_items`  
**displayName (RU):** `Пункт FAQ`  
**icon:** `question`

| Attribute | Type | Required | Maps to React |
|-----------|------|----------|---------------|
| `question` | `string` | yes | `FaqItemData.question` / `.faq-question h3` |
| `answer` | `text` | yes | `FaqItemData.answer` (supports `\n` → `<br />` in `FaqSection`) |
| `open_by_default` | `boolean`, default `false` | no | `FaqItemData.active` / `data-open` |

FAQ **section title** («Часто задаваемые вопросы») is a string on the parent single type in Phase 2, not part of this component.

### `page.list-item` → `strapi-catalog/src/components/page/list-item.json`

**UID:** `page.list-item`  
**collectionName:** `components_page_list_items`  
**displayName (RU):** `Пункт списка`  
**icon:** `bulletList`

| Attribute | Type | Required | Maps to React |
|-----------|------|----------|---------------|
| `title` | `string` | yes | Category name, condition title, feature title, cert title, offer bullet text when used as one-line item |
| `text` | `text` | no | Category body, feature description, secondary line |
| `href` | `string` | no | Optional link (contact values, CTAs) |

**Out of this component:** icon asset paths (`/icon-*.svg`), document `type`/`size`/`id`, package pricing cards — page-specific attributes or extra components in Phase 2.

### Canonical schema skeleton (all four)

```json
{
  "collectionName": "components_page_heroes",
  "info": {
    "displayName": "Hero страницы",
    "icon": "landscape"
  },
  "options": {},
  "attributes": {
    "title": { "type": "string", "required": true, "displayName": "Заголовок" },
    "description": { "type": "text", "required": false, "displayName": "Описание" },
    "image": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"],
      "displayName": "Изображение"
    },
    "image_alt": { "type": "string", "required": false, "displayName": "Alt изображения" },
    "cta_label": { "type": "string", "required": false, "displayName": "Текст кнопки" },
    "cta_url": { "type": "string", "required": false, "displayName": "Ссылка кнопки" }
  }
}
```

Match empty `"options": {}` like `catalog/hero-slide.json`. Do **not** set `draftAndPublish` on components (invalid / irrelevant).

## RU Translation Key Naming

Existing pattern in `strapi-catalog/src/admin/translations/ru.json` (verified against `catalog.filter-help-*` and download-catalog fields):

1. **Content Manager field label**  
   `content-manager.components.<category>.<component-name>.<attribute>`  
   Example: `content-manager.components.catalog.filter-help-summary-item.lead`

2. **Content-Type Builder attribute label**  
   `content-type-builder.components.<category>.<component-name>.attributes.<attribute>`  
   Example: `content-type-builder.components.catalog.filter-help-summary-item.attributes.lead`

3. **Component display name** (sidebar / picker fallback)  
   Key = exact `info.displayName` string  
   Example: `"Filter help summary item": "Пункт «Если коротко»"`  
   For Phase 1, if `displayName` is already Russian, still add the same string as key→value for consistency, and/or translate category:
   - `"page": "Страница"` (category accordion)

4. **Enum values** (if any later)  
   `<category>.<component-name>.<attribute>.<enumValue>`  
   Example: `catalog.filter-help-segment.variant.intro`  
   Phase 1 components have **no enums**.

5. Loading: `strapi-catalog/src/admin/app.js` `registerTrads` imports `./translations/${locale}.json`. Rebuild/restart admin after `ru.json` edits (official Strapi note).

### Phase 1 keys to add (minimum for ADM-01)

For each of `hero`, `section`, `faq-item`, `list-item` and each attribute, add **both** CM and CTB keys. Suggested Russian strings:

| Component | attr | RU label |
|-----------|------|----------|
| hero | title | Заголовок |
| hero | description | Описание |
| hero | image | Изображение |
| hero | image_alt | Alt изображения |
| hero | cta_label | Текст кнопки |
| hero | cta_url | Ссылка кнопки |
| section | title | Заголовок |
| section | subtitle | Подзаголовок |
| section | body | Текст |
| section | items | Пункты |
| faq-item | question | Вопрос |
| faq-item | answer | Ответ |
| faq-item | open_by_default | Открыт по умолчанию |
| list-item | title | Заголовок |
| list-item | text | Текст |
| list-item | href | Ссылка |

Also:

```json
"Hero страницы": "Hero страницы",
"Секция": "Секция",
"Пункт FAQ": "Пункт FAQ",
"Пункт списка": "Пункт списка",
"page": "Страница"
```

**ADM-04** (full CM/CTB coverage for wave-1 **single types**) remains Phase 2 — do not invent page single-type keys here.

**Dual labeling:** Prefer attribute `displayName` in schema **and** `ru.json` pairs. Product already uses schema `displayName` for RU; filter-help relies on `ru.json`. Belt-and-suspenders matches product requirement «в админке нет английских fallback у новых типов» for these components.

## File Paths to Create / Touch

```
strapi-catalog/src/components/page/hero.json          # NEW
strapi-catalog/src/components/page/section.json       # NEW
strapi-catalog/src/components/page/faq-item.json      # NEW
strapi-catalog/src/components/page/list-item.json     # NEW
strapi-catalog/src/admin/translations/ru.json         # EDIT — append page.* keys
```

**Do not create in Phase 1:**

- `strapi-catalog/src/api/*-page/` single types
- feed controllers/routes under `strapi-catalog/src/api/catalog/`
- `server.cjs` `/api/pages/*`
- `public/pages-*.snapshot.json`
- React hydrate changes under `src/components/pages/*`
- seed helpers in `strapi-catalog/src/index.js` for page content

**Auto-handled:** `prepare-dist.cjs` copies entire `src/components` → `dist/src/components` (includes new `page/`). No script change required unless copy fails (then debug sync, don't invent a second path).

## Architecture Patterns

### Recommended layout

```
strapi-catalog/src/components/
├── catalog/                 # existing catalog-only blocks — do not reuse for marketing pages
│   ├── hero-slide.json
│   ├── product-gallery-item.json
│   ├── filter-help-segment.json
│   └── filter-help-summary-item.json
└── page/                    # NEW — marketing page primitives
    ├── hero.json            # page.hero
    ├── section.json         # page.section (nests page.list-item)
    ├── faq-item.json        # page.faq-item
    └── list-item.json       # page.list-item
```

### Pattern 1: Category folder = UID prefix

**What:** Folder `page/` → UIDs `page.<file-kebab-name>`.  
**When:** Always for new components.  
**Example:** File `faq-item.json` → `page.faq-item` (same as `catalog.filter-help-summary-item`).

### Pattern 2: Nest only leaf → container, never circular

**What:** `page.section.items` → `page.list-item`. Do not nest `page.section` inside itself or `page.hero` inside `page.section`.  
**When:** Shared composition for Phase 2 single types.  
**Why:** Circular component graphs break CTB / schema load.

### Pattern 3: English API keys, Russian editor labels

**What:** Attribute names stay `title`, `open_by_default`, etc.; labels via `displayName` + `ru.json`.  
**When:** All new page CMS fields.  
**Why:** Stable future feed JSON; matches `catalog.*` and download-catalog.

### Anti-Patterns to Avoid

- **Reusing `catalog.hero-slide` for marketing heroes:** Different media contract (slide image/video/poster vs title+CTA+image).
- **Putting `draftAndPublish: true` on future page single types without decision:** Existing page-like singles use `false` (`download-catalog-page`, `catalog-new-hero`). Phase 2 should default to `false`.
- **Rich text in Phase 1 shared blocks:** Wave-1 marketing copy is plain string/text + `\n`; richtext deferred (legal Phase 6).
- **Dynamic zones in Phase 1:** Editors get clearer fixed fields on per-page single types in Phase 2.
- **Hand-editing only `dist/`:** Source of truth is `src/components`; dist is sync output.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Component registration | Custom bootstrap register API | Drop JSON under `src/components/page/` | Strapi loads folder categories automatically |
| RU admin strings | Hardcoded admin React plugin | `ru.json` + `registerTrads` | Existing project contract |
| Dist schemas for develop | Manual `cp` after every edit | `prepare-dist.cjs` via `src/index.js` early sync | Already solved; AGENTS.md documents failure mode |
| Marketing page CMS without components | Copy-paste attributes into each single type | Shared `page.*` | ADM-01 + roadmap Phase 1 goal |

**Key insight:** Phase 1 value is a stable UID vocabulary (`page.hero`, …) that Phase 2 single types reference as `component: "page.hero"` — not content, feeds, or UI.

## Common Pitfalls

### Pitfall 1: `strapi develop` drops component schemas from `dist`

**What goes wrong:** Components missing; CTB empty; bootstrap errors when something references them.  
**Why:** `strapi develop` clears `dist` and compiles TS only; JSON under `src/api` / `src/components` must be copied.  
**How to avoid:** Rely on `prepare-dist` early sync in `src/index.js`; after adding `page/`, restart develop and confirm files exist under `dist/src/components/page/`.  
**Warning signs:** CTB shows old catalog components only; logs about missing component UID.

### Pitfall 2: Wrong `collectionName` / UID mismatch

**What goes wrong:** Schema load failure or orphan DB tables.  
**Why:** `collectionName` must be unique; UID is `folder.filename` without `.json`.  
**How to avoid:** Follow `components_page_<plural_snake>`; never rename UID after Phase 2 content exists.  
**Warning signs:** Strapi refuses to start; CTB shows component but populate fails later.

### Pitfall 3: English keys visible to editors

**What goes wrong:** Success criterion 2 fails — raw `title` / `cta_label` in CM.  
**Why:** Missing `ru.json` CTB+CM pairs or admin not rebuilt; locale still `en`.  
**How to avoid:** Add both key families; set attribute `displayName`; verify with admin Interface language = Русский.  
**Warning signs:** Labels match attribute names exactly in English.

### Pitfall 4: Treating components like single types (`draftAndPublish`)

**What goes wrong:** Invalid options / confusion about publish workflow.  
**Why:** D&P is a content-type option; components inherit parent entry lifecycle.  
**How to avoid:** Empty `options` on components; Phase 2 singles copy `downloadAndPublish: false` from `download-catalog-page`.  
**Warning signs:** Attempting to “publish” a component row alone.

### Pitfall 5: Overfitting shared components to one page

**What goes wrong:** Bloated hero with Index video + dealers packages fields.  
**Why:** Pages diverge after hero/FAQ/list primitives.  
**How to avoid:** Keep the four schemas minimal (tables above); page-unique structures in Phase 2 single-type attributes.  
**Warning signs:** Optional fields unused on 4 of 5 pages.

### Pitfall 6: Nesting verification by shipping wave-1 singles early

**What goes wrong:** Scope bleed into ADM-02.  
**Why:** Success criterion 3 sounds like it needs a single type.  
**How to avoid:** Prove nesting via `page.section` → `page.list-item` + clean `strapi develop` boot; optional CTB dry-attach without committing page singles.  
**Warning signs:** Phase 1 PR includes `api::hotels-page` etc.

## Code Examples

### Reference: existing catalog component (copy structure)

```json
// Source: strapi-catalog/src/components/catalog/filter-help-summary-item.json
{
  "collectionName": "components_catalog_filter_help_summary_items",
  "info": {
    "displayName": "Filter help summary item",
    "icon": "bulletList"
  },
  "options": {},
  "attributes": {
    "lead": { "type": "text", "required": true },
    "highlight": { "type": "string", "required": true }
  }
}
```

### Nested component attribute (use on `page.section`)

```json
// Source: Strapi 5 Models docs — component attribute
"items": {
  "type": "component",
  "repeatable": true,
  "component": "page.list-item",
  "displayName": "Пункты"
}
```

### RU keys (match existing filter-help)

```json
{
  "content-manager.components.page.faq-item.question": "Вопрос",
  "content-manager.components.page.faq-item.answer": "Ответ",
  "content-manager.components.page.faq-item.open_by_default": "Открыт по умолчанию",
  "content-type-builder.components.page.faq-item.attributes.question": "Вопрос",
  "content-type-builder.components.page.faq-item.attributes.answer": "Ответ",
  "content-type-builder.components.page.faq-item.attributes.open_by_default": "Открыт по умолчанию"
}
```

### Parent single type usage (Phase 2 only — do not create now)

```json
"hero": {
  "type": "component",
  "repeatable": false,
  "component": "page.hero"
},
"faq_items": {
  "type": "component",
  "repeatable": true,
  "component": "page.faq-item"
}
```

## What NOT to Do in Phase 1

| Out of scope | Belongs to |
|--------------|------------|
| Wave-1 single types (Главная / Отелям / …) | Phase 2 (ADM-02) |
| Extending `download-catalog-page` with title/lead/CTA/PDF | Phase 2 (ADM-03) |
| Exhaustive `ru.json` for those single types | Phase 2 (ADM-04) |
| Public feeds / `GET /api/pages/:slug` / snapshots | Phase 3 |
| Seed of TSX copy into Strapi | Phase 3 (API-04) |
| React hydrate of pages | Phase 4 |
| Deploy smoke / seed sync for pages | Phase 5 |
| Legal richtext components | Phase 6 |
| Changing `getPageName` / `PAGE_EMAIL_ROUTING` | Never via CMS |
| Editing `catalog.*` components or product schema | Unrelated |
| Frontend or `server.cjs` changes | Later phases |

## Verification Checklist (for planner tasks)

1. Files exist under `strapi-catalog/src/components/page/*.json`.
2. After `npm run develop --prefix strapi-catalog` (or project equivalent): boot succeeds; `dist/src/components/page/` populated.
3. CTB → Components → category **Страница** / `page` lists four components.
4. Open `page.section` — nested `items` type is `page.list-item` without schema error.
5. With admin locale **ru**, field labels show Russian (not raw `cta_label`).
6. No new `src/api/*-page` directories in the Phase 1 diff.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Marketing copy hardcoded in React pages | Strapi single types + shared `page.*` (this milestone) | v1.1 roadmap 2026-08-03 | Editors change text without frontend deploy |
| Catalog-only components (`catalog.*`) | Separate `page.*` category for marketing | Phase 1 | Avoids coupling marketing CMS to catalog media slides |
| English CM labels + sparse `ru.json` | Systematic CM+CTB keys (filter-help style) | Ongoing | Required for RU-only editor UX |

**Deprecated/outdated:**

- Generic collection `marketing-page` by slug — rejected in PROJECT.md / REQUIREMENTS.md.
- Direct browser → Strapi for page content — forbidden by AGENTS.md (Phase 3+ proxy).

## Open Questions

1. **Index hero video fields**  
   - What we know: Index uses dual video + poster; other wave-1 heroes use static images.  
   - What's unclear: whether Phase 2 Index single type adds `video_desktop` / `video_mobile` / `poster` beside `page.hero` or a dedicated `page.hero-video` component.  
   - Recommendation: keep `page.hero` image+CTA only; add Index media fields on the Index single type in Phase 2.

2. **Contact / package / certificate shapes**  
   - What we know: richer than `list-item` (icons, sizes, package prices).  
   - What's unclear: extra Phase 2 components vs flat attributes.  
   - Recommendation: Phase 1 stays with four primitives; introduce page-specific components only if Phase 2 planning needs them.

3. **Whether attribute `displayName` alone is enough without `ru.json`**  
   - What we know: Product uses schema `displayName`; filter-help uses `ru.json`; CTB/CM i18n historically inconsistent for some surfaces (upstream fixes in 2026).  
   - Recommendation: write **both** for Phase 1 components (HIGH confidence for meeting criterion 2).

## Sources

### Primary (HIGH confidence)

- Repo: `strapi-catalog/src/components/catalog/*.json` — component JSON shape
- Repo: `strapi-catalog/src/admin/translations/ru.json` — CM/CTB key pattern
- Repo: `strapi-catalog/src/admin/app.js` — `registerTrads` + locales `ru`/`en`
- Repo: `strapi-catalog/scripts/prepare-dist.cjs` + `src/index.js` — dist component sync
- Repo: `strapi-catalog/src/api/download-catalog-page/.../schema.json` — single-type + nested component reference pattern (`draftAndPublish: false`)
- Repo: wave-1 pages + `shared-page-sections.tsx` — real field shapes
- [Strapi 5 Models](https://docs.strapi.io/cms/backend-customization/models) — component folders, component attributes
- [Strapi 5 Locales & translations](https://docs.strapi.io/cms/admin-panel-customization/locales-translations) — admin translation loading / rebuild
- `strapi-catalog/package.json` — Strapi 5.42.1

### Secondary (MEDIUM confidence)

- Strapi PRs/issues on CM i18n for component displayNames (2026) — reinforces dual `ru.json` + displayName approach; not required to implement Phase 1 beyond existing project pattern

### Tertiary (LOW confidence)

- None material for Phase 1 schema work

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — pinned Strapi version + existing component/RU/`prepare-dist` paths in-repo
- Architecture: **HIGH** — UIDs, nesting, file paths derived from official models docs + local conventions
- Pitfalls: **HIGH** — prepare-dist and D&P issues documented in AGENTS.md / observed schemas
- Exact attribute set: **HIGH** for hero/faq/list primitives from TSX; **MEDIUM** for optional `section.body` / Index video deferral (discretion)

**Research date:** 2026-08-03  
**Valid until:** 2026-09-02 (30 days; Strapi minor upgrades may shift admin i18n edges)

**CONTEXT.md:** not present for this phase — no discuss-phase locks beyond PROJECT/REQUIREMENTS/ROADMAP.
