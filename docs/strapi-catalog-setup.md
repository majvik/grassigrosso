# Strapi integration (catalog + catalogue-new hero)

## What is connected

- Backend endpoint: `GET /api/catalog/products`
- Source: Strapi `products` collection
- Frontend: `catalogue-new` page tries Strapi first, falls back to static cards if Strapi is unavailable

- Backend endpoint: `GET /api/catalog/hero-slides`
- Source: Strapi custom route `GET /api/catalog-hero-feed` (reads Single Type **Catalog (new) hero slider**)
- Frontend: on `catalogue-new`, after `initApp` the hero slider fetches this endpoint; if `slides` is non-empty, slides and dots are replaced from Strapi; otherwise the static HTML in `catalogue-new.html` stays

## Язык админки Strapi (русский)

В `strapi-catalog/src/admin/app.js` заданы локали **`ru`** и **`en`** (английский обязателен в Strapi как fallback). После `npm run build` / перезапуска `develop` в списке языков интерфейса появится русский.

Первый визит по-прежнему может быть на английском: **аватар справа сверху → Profile → Experience → Interface language → Русский** (или аналогичный пункт в вашей версии админки). Дальше выбор сохраняется для пользователя.

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

Важно: авто-сидинг/автопривязка отключены. В `strapi-catalog/src/index.js` bootstrap только логирует, что автоматические изменения данных выключены. Hero-слайды и каталог заполняются вручную через админку Strapi.

## Expected Strapi model (minimum fields)

Collection type: `products`

- `name` (string)
- `slug` (uid/string)
- `is_active` (boolean)
- `sort_order` (integer)
- `height_cm` (number)
- `max_load_kg` (number)
- `firmness` (enum в Strapi: `мягкий`, `средний`, `жесткий`; API маппит в storefront-коды)
- `mattress_type` (enum в Strapi: `пружинный`, `беспружинный`, `топпер`)
- `load_range` (enum: `до_110`, `до_120`, `до_130`, `свыше_130`)
- `height_range` (enum: `до_19`, `20_24`, `25_29`, `30_и_выше`)
- `widths` (repeatable enum: `ширина_80`, `ширина_90`, `ширина_120`, `ширина_140`, `ширина_160`, `ширина_180`, `ширина_200`)
- `lengths` (repeatable enum: `длина_190`, `длина_195`, `длина_200`, `длина_205`, `длина_210`, `длина_220`)
- `fillings` (repeatable enum: `ппу`, `пена_memory_foam`, `кокосовая_койра`, `массажная_пена`, `вязкоэластичная_пена`)
- `features` (many-to-many relation to `feature-option`)
- `collection` (relation to `collections`, fields: `name`, `slug`)
- `tags` (relation to `tags`, field: `name`)
- `media` (media field; first item is used as card image)

## API behavior

- If `STRAPI_URL` is not set, `/api/catalog/products` returns `503`.
- If Strapi request fails, endpoint returns `502`.
- Frontend keeps current static cards as runtime fallback.
