# Strapi integration (catalog only)

## What is connected

- Backend endpoint: `GET /api/catalog/products`
- Source: Strapi `products` collection
- Frontend: `catalogue-new` page tries Strapi first, falls back to static cards if Strapi is unavailable

## Environment variables

Add to server `.env`:

- `STRAPI_URL=https://your-strapi-host`
- `STRAPI_TOKEN=...` (optional, but recommended)

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
