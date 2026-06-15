# Catalog download page — GSD execution plan

**Date:** 2026-06-15  
**Spec:** [2026-06-15-catalog-download-page-design.md](../specs/2026-06-15-catalog-download-page-design.md)

## Phase 1 — Cover image (P0)

| ID | Task | File |
|----|------|------|
| 1.1 | Convert `сatalog_cover@2x.png` → avif/webp/png 1x+2x | `public/catalog-cover.*` |

**Verify:** files exist in `public/`, width 920/1840px (iter. 2)

## Phase 2 — HTML route + React (P0)

| ID | Task | File |
|----|------|------|
| 2.1 | Page shell HTML | `download-catalog.html` |
| 2.2 | Vite routes + build input | `vite.config.mjs` |
| 2.3 | React route | `ReactIslandRoot.tsx` |
| 2.4 | Page component + CSS module | `DownloadCatalogPage.tsx`, `download-catalog.module.css` |

**Verify:** `/download-catalog` renders in dev

## Phase 3 — Submit + download + routing (P0)

| ID | Task | File |
|----|------|------|
| 3.1 | `getPageName` + download on success | `contact-forms.js` |
| 3.2 | `PAGE_EMAIL_ROUTING` | `server.cjs` |

**Verify:** form submit sends `page: Скачать каталог`, triggers download

## Phase 4 — Hero CTA (P1)

| ID | Task | File |
|----|------|------|
| 4.1 | Link to `/download-catalog` | `hero.tsx`, `catalog.html` |
| 4.2 | Remove `#documentRequestModal` from catalog.html | `catalog.html` |

**Verify:** hero CTA is `<a href="/download-catalog">`

## Phase 5 — SEO + smoke (P1)

| ID | Task | File |
|----|------|------|
| 5.1 | Sitemap entry | `public/sitemap.xml` |
| 5.2 | typecheck + build + catalog-ui | — |

## Phase 6 — Heading + cover width polish (P1)

| ID | Task | File |
|----|------|------|
| 6.1 | H1 56/48/40, H2 contact-form-title scale | `download-catalog.module.css` |
| 6.2 | Cover max-width 920px, regenerate assets | `public/catalog-cover.*`, `DownloadCatalogPage.tsx` |

**Verify:** `npm run build:web` pass; `/download-catalog` H1 56px, cover 920px

## Phase status

| Phase | Status |
|-------|--------|
| 1 | done |
| 2 | done |
| 3 | done |
| 4 | done |
| 5 | done |
| 6 | done |
