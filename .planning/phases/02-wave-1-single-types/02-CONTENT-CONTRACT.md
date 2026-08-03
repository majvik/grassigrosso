# Phase 2 Content Contract

**Status:** FROZEN for schema design (ADM-05)  
**Updated:** 2026-08-03  
**Machine source of truth:** [`02-content-contract.json`](./02-content-contract.json)  
**Gate:** `npm run check:pages-cms-contract`

## Purpose

Доказать lossless parity: каждое editor-facing значение текущих React-страниц волны 1 либо имеет CMS-поле, либо явно **CODE-OWNED** с причиной. Без unresolved rows схемы Phase 2 писать нельзя.

## Coverage

| Page | CMS-owned groups | Code-owned (examples) |
|------|------------------|------------------------|
| Index | hero-media (video/poster/CTA), solutions, philosophy, collections cards, partners images, testimonials, docs cards | play button, collections nav, commercial-offer modal hook |
| Hotels | hero, stats, categories, products+media, discount table, refresh program, FAQ, contact chrome | form field ids, email routing, commercial-offer / catalog modals |
| Dealers | hero, stats, conditions, offers, geography cities (`page.geo-city[]`), quality, requirements, packages (`value` stable), FAQ, contact | package preset allowlist, form ids, email routing, map animation |
| Contacts | hero, offices, map title, **per-office map embed**, contact chrome | map tab mechanics; Yandex loader until iframe migration; Phase 3 URL normalize (API-06) |
| Documents | hero, certificate/company cards with **stable ids**, help, FAQ | `/api/download/:docId` filename map, help modal page label |
| Download catalog | title, lead, submit_label, catalog_pdf, existing slides/mode/autoplay | slider chrome, form fields, `data-download-doc=catalog`, email routing |

## Required structured components (beyond Phase 1)

Phase 1 `page.section` / `page.list-item` **недостаточны**. Contract требует дополнительно:

`page.hero-media`, `page.stat`, `page.geo-city`, `page.office`, `page.document-card`, `page.contact-info`, `page.solution-card`, `page.collection-card`, `page.testimonial`, `page.hotel-category`, `page.hotel-product`, `page.discount-row`, `page.refresh-feature`, `page.offer-card`, `page.requirement-card`, `page.dealer-package`, `page.media-srcset`

## Contacts map decision

**Current runtime:** `src/contacts-maps.js` mounts Yandex Maps JS with `center/zoom/title/address` per office.  
**User decision:** iframe HTML задаётся в админке.  
**Contract:** CMS field `page.office.map_iframe_html`; keep lat/lng fields as seed/migration aids until Phase 4 switches UI to allowlisted embed URL from feed (API-06 — no raw HTML to React).

## Download catalog PDF

`catalog_pdf` media on `download-catalog-page`. Runtime hook stays `data-download-doc="catalog"`. Wiring PDF URL into `/api/download/catalog` is Phase 3/4 — contract only freezes ownership.

## Unresolved rows

**None** in `02-content-contract.json` (`ownership` is always `cms` or `code`; every `cms` row has `cms` field path; every `code` row has `reason`).

## Next (not this artifact)

1. Implement schemas from this contract (Task 2–4 of `02-01-PLAN.md`).  
2. Extend harness to assert schemas/fixtures once files exist.  
3. No feeds/frontend in Phase 2.
