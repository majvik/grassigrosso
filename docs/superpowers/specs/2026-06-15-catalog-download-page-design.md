# Catalog download page — design spec (Superpowers)

**Date:** 2026-06-15  
**Status:** done  
**URL:** `/download-catalog`

## Problem

CTA «Скачать каталог» в hero каталога открывает модалку запроса документа на той же странице. Нужна отдельная постоянная страница с обложкой каталога, формой и скачиванием PDF после отправки заявки.

## Requirements

- URL: `/download-catalog` (clean, без `.html`)
- React page-layer (`DownloadCatalogPage`)
- Контент центрирован, `max-width: 720px`
- Заголовок «Скачать каталог», обложка из `сatalog_cover@2x.png` (avif/webp/png + @2x)
- Подзаголовок «Введите данные», форма во всю ширину
- После успешного `POST /api/submit` → скачивание `Catalog_v1.2.pdf` через `/api/download/catalog`
- Email-маршрутизация: `Скачать каталог` → sales@
- Hero CTA ведёт на `/download-catalog` (не модалка)

## Success criteria

| Criterion | Measure |
|-----------|---------|
| Page loads | `GET /download-catalog` → 200, centered layout |
| Cover image | `<picture>` с avif/webp/png, max 720px |
| Form submit | `page: "Скачать каталог"` в payload |
| Download | После success → `/api/download/catalog` |
| Hero link | `href="/download-catalog"` в catalog hero |
| Build | `npm run typecheck` + `npm run build` pass |

## Solution

See [../plans/2026-06-15-catalog-download-page.md](../plans/2026-06-15-catalog-download-page.md).
