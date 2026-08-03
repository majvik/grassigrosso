# Task 5 — RU Admin evidence (updated: enum Select labels)

## Automated

| Check | Result |
|-------|--------|
| `npm run check:pages-cms-strict` | PASS — Wave 1 RU keys + **enum flat UI labels** + negative `image_only` removal → FAIL |
| `npm run typecheck` | PASS |
| Strapi boot 5.42.1 | PASS |

## Enum Select gap (closed)

Strapi 5.42 CM renders enumeration options as raw `{ value }` without `formatMessage` (fixed upstream in #26837, not in 5.42.1).

**Fix (Admin-only, schema values unchanged):**
- `strapi-catalog/src/admin/extensions/EnumerationInput.jsx` — option label via `formatMessage({ id: value })`
- Registered in `app.js` with `app.addFields({ type: 'enumeration', Component: EnumerationInput })`
- Flat keys in `ru.json` (`"image_only": "Только картинка"`, …) plus existing namespaced keys
- Harness: every Wave 1 enum value has Cyrillic namespaced + flat label; Latin value must not equal label; delete `image_only` → FAIL

## Browser smoke (locale `ru`)

| Field | Options shown (no technical fallback) | Evidence |
|-------|----------------------------------------|----------|
| `media_display_mode` | Слайдер, Только картинка | `task5-enum-media-display-mode.png` (+ open listbox verified via CDP) |
| `document-card.kind` | Сертификат, Документ компании | `task5-enum-document-card-kind.png` |
| `contact-info.icon_key` | Телефон, Эл. почта, Адрес | `task5-enum-contact-info-icon-key.png` |
| `dealer-package.value` | Стандарт, Индивидуальный, Эксклюзив | `task5-enum-dealer-package-value.png` |

Schema/API enum **values** remain `image_only`, `certificate`, `phone`, `standard`, etc.

## Admin chrome / catalog leftovers (prior same-day fix)

- `config.translations` (not `registerTrads`) loads `ru.json`
- Catalog CT displayNames RU; CM label sync from on-disk schemas

## Docs updated

- `.planning/codebase/CONVENTIONS.md` — `config.translations` + enum flat keys + EnumerationInput
- `.planning/phases/01-shared-page-components/01-RESEARCH.md` — remove stale `registerTrads` loader claim
