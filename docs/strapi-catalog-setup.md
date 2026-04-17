# Strapi integration (catalog + catalogue-new hero)

## What is connected

- Backend endpoint: `GET /api/catalog/products`
- Source: Strapi `products` collection
- Frontend: `catalogue-new` page tries Strapi first, falls back to static cards if Strapi is unavailable

- Backend endpoint: `GET /api/catalog/hero-slides`
- Source: Strapi custom route `GET /api/catalog-hero-feed` (reads Single Type **Catalog (new) hero slider**)
- Frontend: on `catalogue-new`, after `initApp` the hero slider fetches this endpoint; if `slides` is non-empty, slides and dots are replaced from Strapi; otherwise the static HTML in `catalogue-new.html` stays

## Environment variables

Add to server `.env`:

- `STRAPI_URL=https://your-strapi-host`
- `STRAPI_TOKEN=...` (optional, but recommended)

## Hero slider (catalogue-new)

Single type: **Catalog (new) hero slider** (`catalog-new-hero`)

- `autoplay_ms` (integer, default 6500, min 2500) — интервал автопрокрутки в миллисекундах
- `slides` (repeatable component **Catalog hero slide**)

Component **Catalog hero slide** (`catalog.hero-slide`):

- `slide_image` (media, images) — картинка слайда; если задано видео, картинка игнорируется
- `slide_video` (media, videos/files) — видео; при наличии URL слайд считается видео (нужен `muted`/`playsinline` на сайте уже в шаблоне)
- `poster` (media, image) — постер для видео (необязательно)
- `alt_text` (string) — подпись / `aria-label`

Порядок слайдов — как в админке (сверху вниз). Публичный JSON отдаёт `GET /api/catalog-hero-feed` в Strapi (`auth: false`), Node проксирует в `GET /api/catalog/hero-slides` и дописывает абсолютные URL к медиа при необходимости.

При **каждом старте Strapi** (`develop` / `start`) в `strapi-catalog/src/index.js` bootstrap проверяет single type: если слайдов с картинкой/видео ещё нет, создаётся или обновляется запись с **пятью** слайдами — четыре картинки из `public/` (`catalog-hero.png`, `dealers-hero.png`, `hotels-hero.png`, `contacts-hero.png`) и **видео** `quality-video.mp4` с постером `quality-video-poster.jpg` (как блок «производство» на странице дилеров). Если уже есть слайд с видео, сид не меняет hero. Если раньше остались только четыре картинки без видео, при следующем старте выполняется миграция до полного набора из пяти слайдов.

## Expected Strapi model (minimum fields)

Collection type: `products`

- `name` (string)
- `slug` (uid/string)
- `is_active` (boolean)
- `sort_order` (integer)
- `height_cm` (number)
- `max_load_kg` (number)
- `firmness` (enum: `soft`, `medium`, `hard`)
- `mattress_type` (enum: `spring`, `nospring`, `topper`)
- `collection` (relation to `collections`, fields: `name`, `slug`)
- `tags` (relation to `tags`, field: `name`)
- `media` (media field; first item is used as card image)

## API behavior

- If `STRAPI_URL` is not set, `/api/catalog/products` returns `503`.
- If Strapi request fails, endpoint returns `502`.
- Frontend keeps current static cards as runtime fallback.
