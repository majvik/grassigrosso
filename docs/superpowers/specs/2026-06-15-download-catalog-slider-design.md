# Download catalog slider — design spec

**Date:** 2026-06-15
**Status:** in progress

## Problem

`/download-catalog` показывает одну статичную обложку (`<picture>` из `public/catalog-cover.*`). Нужно заменить её слайдером по образцу hero каталога: первый слайд — обложка, далее `slide-02…08`. Слайды должны редактироваться в админке (Strapi), а структура — закладываться под будущее расширение редактируемого контента этой страницы.

## Constraints / invariants

- Фронт не обращается к Strapi напрямую — только через Node endpoint (`server.cjs`).
- Root/uploads-ассеты только по `/...`; AVIF-сайдкары лежат рядом с оригиналом (контракт `preferAvifVariant`).
- Слайд #0 — SSR-fallback (LCP); остальные слайды заполняются feed'ом, без двойной загрузки (как в hero каталога).
- `getPageName()` ↔ `PAGE_EMAIL_ROUTING`, форма/сабмит/PDF-скачивание не меняются.
- Контент из локальной админки на прод приходит через seed `data.db` + commit `public/uploads/` + snapshot JSON.

## Data contract

`GET /api/download-catalog/slides` (Node) → проксирует Strapi `GET /api/download-catalog-feed`:

```json
{
  "slides": [
    { "type": "image", "src": "/uploads/<hash>.avif", "alt": "..." }
  ],
  "autoplayMs": 6500,
  "source": "strapi-download-catalog-feed"
}
```

Совпадает по форме с `catalog-hero-feed`, поэтому переиспользуются `applyCatalogHeroFeed` и `initCatalogHeroSlider`.

## Admin model (расширяемость)

Single type `download-catalog-page` (Strapi), `draftAndPublish: false`:

- `slider_autoplay_ms` (integer, default 6500, min 2500)
- `slides` (repeatable component `catalog.hero-slide` — переиспользуем существующий: `slide_image` / `slide_video` / `poster` / `alt_text`)

Будущее расширение страницы = добавление новых атрибутов в этот single type (заголовки, тексты, PDF и т.п.), без новой архитектуры.

## Images

16:9, под бокс 920px: 1x = 920×518, 2x = 1840×1035.
- PNG (исходник в uploads) + AVIF-сайдкар (реально отдаётся в браузер).
- Источники: `сatalog_cover@2x.png` (5333×3000), `slide-02…08@2x.png` (2560×1440) → даунскейл, `withoutEnlargement`.

## Success criteria

- В админке есть «Страница «Скачать каталог»» с управляемыми слайдами и autoplay.
- На fresh-деплое слайдер показывает 8 слайдов (автосид + seed db + snapshot fallback).
- `/download-catalog`: слайдер с autoplay/точками/стрелками, слайд #0 = обложка, остальные из feed; на сбое Strapi — stale-cache → disk-snapshot.
- `typecheck`, `build:web`, `check:catalog-api` зелёные.
