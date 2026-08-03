# Task 6 — Regression & scope gate (Wave 1)

Date: 2026-08-03  
Branch: `catalogue`  
Base for catalog schema compare: `b59f0ec^` (pre Admin leftover-RU commit)  
HEAD at verify: includes Task 5 enum fix `d83c981` + Task 6 harness/docs

## Gate results

| Check | Command | Result |
|-------|---------|--------|
| Catalog schema scope | `npm run check:pages-cms-catalog-scope` | **PASS** — schemas=17, adminDisplayNameOnly=17, runtime mismatches=0, feedRouteDiffs=0 |
| Pages CMS strict | `npm run check:pages-cms-strict` | **PASS** — rows=140, fixtures=6 |
| Full check | `npm run check` | **PASS** — routes + pages-cms-contract + catalog-api + typecheck |
| Build | `npm run build` | **PASS** — vite web + strapi admin panel |
| Strapi boot | develop `http://127.0.0.1:1337` | **PASS** — Admin 200, CM single type loads |
| Catalog API | via `check:catalog-api` + curl | **PASS** — products items=43, filters/hero/download-catalog slides OK |
| Catalog UI | `CATALOG_UI_BASE_URL=http://127.0.0.1:5177 npm run check:catalog-ui` | **PASS** |

### Routes harness note

`check:routes` initially failed on stale expected snippet `./public/site.webmanifest`. Pages already use `/site.webmanifest` (deploy contract). Fixed in `scripts/check-routing-contracts.mjs`; then `npm run check` green.

## Catalog schema / feed scope

- Compared all catalog-related `schema.json` under `strapi-catalog/src/api` + `components/catalog` between `b59f0ec^` and `HEAD`.
- Ignored only Admin metadata: `info.displayName`, attribute `displayName`.
- Runtime attributes / types / relations / enums / defaults: **identical**.
- Catalog routes / controllers / feed payload sources: **no forbidden diffs** (only Admin label sync util under catalog utils if present; no feed controller/route contract changes).

Automated by `scripts/check-pages-cms-catalog-scope.mjs` (`npm run check:pages-cms-catalog-scope`).

## Admin enum save/reload smoke

Target: `api::download-catalog-page.download-catalog-page` → `media_display_mode`.

1. Before: feed `displayMode=image_only`; Admin Select showed RU label «Только картинка».
2. Opened Select options: «Слайдер», «Только картинка» (no English/technical option text).
3. Selected «Слайдер»; filled required `title` / `submit_label`; removed empty draft slide; **Сохранить**.
4. After save: Strapi feed + Node proxy both returned **`displayMode: "slider"`** (technical value).
5. Full page reload: Admin Select still shows **«Слайдер»**; title persisted.

Evidence screenshot: `evidence/task6-enum-save-reload.png`

```text
curl http://127.0.0.1:1337/api/download-catalog-feed → displayMode=slider
curl http://127.0.0.1:3000/api/download-catalog/slides → displayMode=slider
```

## Locality

Local commit only. **No push**, no PR, no Timeweb/dev/prod mutation.
