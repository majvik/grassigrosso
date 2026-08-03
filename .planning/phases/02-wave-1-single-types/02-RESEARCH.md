# Phase 2: Wave 1 Single Types — Research

**Researched:** 2026-08-03
**Status:** CORRECTED AFTER CODE AUDIT — ждать явного «кодить Phase 2»
**Requirements:** ADM-02, ADM-03, ADM-04, ADM-05, ADM-06
**Depends on:** Phase 1 (`page.hero`, `page.section`, `page.faq-item`, `page.list-item`) — done

## Summary

Phase 2 сначала фиксирует полный content contract текущих React-страниц, затем добавляет **5 новых single types** + **расширяет** существующий `download-catalog-page`. Только contract/fixtures/схемы/RU-лейблы. **Нет** feeds, proxy, production seed или React hydrate (это Phases 3–4).

Паттерн API: как `download-catalog-page` — достаточно `content-types/.../schema.json` (feeds в Phase 3). Но схема считается готовой только после representative fixture validation и parity matrix.

## Audit correction (2026-08-03)

Первоначальные таблицы ниже были **lossy**: названия секций ошибочно принимались за модель данных. `page.section` не умеет хранить media, stable keys, badges, table rows и layout-specific поля.

Обязательные пробелы, которые Phase 2 должна закрыть до создания single types:

| Page | Не покрыто исходной схемой |
|------|----------------------------|
| Index | solution icon/key, collection media/subtitle/features, partner media, testimonials, document request key |
| Hotels | stats + note, hotel categories + active state, product cards + responsive media/catalog key, discount rows/note, refresh badge/CTA/copy |
| Dealers | полный набор stats, offer/requirement/package cards, stable package option values, section-specific badges/media |
| Contacts | карта на каждый office/tab; один page-level iframe не соответствует текущему UI |
| Documents | stable document id/request behavior, request-vs-download mode, CTA labels; file не должен самовольно менять modal contract |
| Download catalog | `lead` отсутствует в текущем render — нужно явно определить placement; PDF должен интегрироваться с существующим submit flow |

### Mandatory content-contract artifact

До Task «create schemas» создать `02-CONTENT-CONTRACT.md` со строкой для каждого current render input:

`page / section / current source / CMS field+type / code-owned reason / runtime hook / fallback / fixture value`.

Ни одна строка не может иметь неявный статус. Сложные структуры моделировать layout-specific компонентами (`page.hotel-category`, `page.product-card`, `page.discount-row`, `page.collection-card`, `page.testimonial`, `page.dealer-package` и т.п.), а не перегружать generic `page.list-item`.

## Decisions (утверждено)

| # | Решение | Итог |
|---|---------|------|
| D1 | Index hero / video | **В админке:** текст hero + desktop/mobile video + poster (компонент `page.hero-media` или расширение hero). Сложные слайдеры/карточки секций Index — по возможности через `page.section` / list; уникальная вёрстка без данных остаётся в коде. |
| D2 | География дилеров | **Полноценное редактирование:** repeatable `page.geo-city` (название + опциональный бейдж «скоро» + порядок). Не textarea. |
| D3 | Карта контактов | Редактор задаёт iframe для **каждого офиса**; feed извлекает `src`, проверяет HTTPS + allowlist карт и отдаёт фронту только URL. Raw HTML никогда не вставляется в React. |
| D4 | FAQ | `faq_title` + repeatable `page.faq-item` |
| D5 | download-catalog | `title`, `lead`, `submit_label`, `catalog_pdf` (media) + существующие слайды |
| D6 | draftAndPublish | `false` |
| D7 | Контактный блок | Только тексты + `page.contact-info`; поля формы / email routing — **не** в CMS |
| D8 | Офисы / сертификаты / статистика | `page.office`, `page.document-card`, `page.stat` |

## Extra components (Phase 2, category `page`)

### `page.hero-media` (Index video hero)
Отдельный компонент (не смешивать с image-hero hotels/dealers):

| Attr | Type | RU |
|------|------|-----|
| `title` | string | Заголовок |
| `title_suffix` | string | Суффикс (™ и т.п., опционально) |
| `description` | text | Описание |
| `cta_label` | string | Текст кнопки |
| `cta_url` | string | Ссылка кнопки |
| `poster` | media images | Постер |
| `poster_alt` | string | Alt постера |
| `video_desktop` | media videos | Видео desktop |
| `video_mobile` | media videos | Видео mobile |

Обычный `page.hero` (Phase 1) остаётся для image-hero страниц.

### `page.stat`
| Attr | Type | RU |
|------|------|-----|
| `label` | string | Подпись |
| `value` | string | Значение |

### `page.geo-city`
| Attr | Type | RU |
|------|------|-----|
| `name` | string | Город |
| `badge` | string | Бейдж (напр. «скоро»), опционально |
| `sort_order` | integer | Порядок (либо порядок repeatable-массива; не хранить два конкурирующих порядка без причины) |

### `page.office`
| Attr | Type | RU |
|------|------|-----|
| `slug` | string | Служебный id |
| `tab_label` | string | Подпись вкладки |
| `badge` | string | Бейдж |
| `city` | string | Город |
| `region` | string | Регион |
| `address` | string | Адрес |
| `phone` | string | Телефон |
| `phone_href` | string | tel: ссылка |
| `email` | string | Email |
| `schedule` | string | Режим работы |
| `map_iframe_html` | text | iframe карты (server-normalized; per office) |

### `page.document-card`
| Attr | Type | RU |
|------|------|-----|
| `title` | string | Название |
| `doc_type` | string | Тип |
| `size_label` | string | Размер (подпись) |
| `file` | media files | Файл |
| `request_label` | string | Текст кнопки «Запросить…» |
| `kind` | enum `certificate` \| `company` | Вид карточки |

### `page.contact-info`
| Attr | Type | RU |
|------|------|-----|
| `title` | string | Заголовок |
| `value` | string | Значение |
| `note` | string | Подпись |
| `href` | string | Ссылка |
| `icon_key` | string | Ключ иконки (`phone` / `email` / `location`) |

## Single types

Все: `kind: singleType`, `draftAndPublish: false`.
Файлы: `strapi-catalog/src/api/<uid>/content-types/<uid>/schema.json`.

### 1. `index-page` — **«Главная»**

| Field | Type | RU |
|-------|------|-----|
| `hero` | component `page.hero-media` | Hero (видео) |
| `solutions_section` | `page.section` | Решения для бизнеса |
| `philosophy_section` | `page.section` | Наша философия |
| `collections_section` | `page.section` | Коллекции |
| `partners_section` | `page.section` | Партнеры и технологии |
| `trust_section` | `page.section` | Нам доверяют |
| `docs_section` | `page.section` | Сертификация и документация |

### 2. `hotels-page` — **«Отелям»**

| Field | Type | RU |
|-------|------|-----|
| `hero` | `page.hero` | Hero |
| `categories_section` | `page.section` | Категории отелей |
| `products_section` | `page.section` | Продуктовые карточки |
| `discount_section` | `page.section` | Система скидок |
| `refresh_section` | `page.section` | Плановая замена |
| `faq_title` | string | Заголовок FAQ |
| `faq_items` | repeatable `page.faq-item` | FAQ |
| `contact_section_title` | string | Заголовок блока связи |
| `contact_form_title` | string | Заголовок формы |
| `contact_submit_label` | string | Текст кнопки |
| `contact_info` | repeatable `page.contact-info` | Контакты в блоке |

### 3. `dealers-page` — **«Дилерам»**

| Field | Type | RU |
|-------|------|-----|
| `hero` | `page.hero` | Hero |
| `stats` | repeatable `page.stat` | Статистика |
| `conditions_section` | `page.section` | Условия участия |
| `offers_section` | `page.section` | Что мы предлагаем |
| `geography_section` | `page.section` | География (title/subtitle) |
| `geography_cities` | repeatable `page.geo-city` | Города |
| `quality_section` | `page.section` | Качество под контролем |
| `requirements_section` | `page.section` | Требования к дилерам |
| `packages_section` | `page.section` | Дилерские пакеты |
| `faq_title` + `faq_items` | FAQ | FAQ |
| `contact_*` + `contact_info` | как hotels | Контакты |

### 4. `contacts-page` — **«Контакты»**

| Field | Type | RU |
|-------|------|-----|
| `hero` | `page.hero` | Hero |
| `offices_title` | string | Наши офисы |
| `offices` | repeatable `page.office` | Офисы |
| `map_title` | string | Как нас найти |
| `contact_*` + `contact_info` | как hotels | Форма/контакты |

**Безопасность:** парсинг и allowlist выполняются уже в Phase 3 feed/proxy. Phase 4 получает `map_embed_url` и создаёт iframe через JSX `src`; `dangerouslySetInnerHTML` запрещён.

### 5. `documents-page` — **«Документы»**

| Field | Type | RU |
|-------|------|-----|
| `hero` | `page.hero` | Hero |
| `certificates_title` | string | Официальная сертификация |
| `certificates` | repeatable `page.document-card` | Сертификаты |
| `company_title` | string | О компании |
| `company_documents` | repeatable `page.document-card` | Документы компании |
| `help_title` | string | Нужна помощь… |
| `help_body` | text | Текст помощи |
| `faq_title` + `faq_items` | FAQ | FAQ |

### 6. Extend `download-catalog-page` — **«Страница «Скачать каталог»»**

| Field | Type | RU |
|-------|------|-----|
| `title` | string | Заголовок |
| `lead` | text | Подзаголовок / лид |
| `submit_label` | string | Текст кнопки формы |
| `catalog_pdf` | media (files) | PDF каталога |

+ существующие `media_display_mode`, `slider_autoplay_ms`, `slides`.
**Не ломать** `download-catalog-feed`.

## RU admin (`ru.json`)

Пары CM + CTB для всех новых типов/полей/компонентов, включая `page.hero-media`, `page.geo-city`.

## Out of Phase 2

- Feeds / Node `/api/pages/:slug` / snapshots / seed (Phase 3)
- React hydrate (Phase 4)
- Legal (Phase 6)
- `getPageName` / `PAGE_EMAIL_ROUTING`
- Редактирование лейблов полей формы (name/phone/email)

## Verify (при execute)

1. `02-CONTENT-CONTRACT.md` покрывает все данные/медиа/hooks текущих TSX; нет необоснованных пропусков
2. Representative fixtures всех 6 моделей проходят schema validation
3. Single types + download-catalog texts видны **в работающей Admin UI** на русском (browser smoke/screenshot)
4. Index: video/poster + все структурированные карточки имеют lossless fields
5. Hotels/Dealers: таблицы, карточки, города, package values и media представлены структурированно
6. Contacts: iframe задаётся per-office; будущая feed-нормализация явно контрактована
7. Documents: stable ids/request hooks не потеряны; PDF media не ломает request flow
8. `npm run typecheck` и Strapi schema boot проходят; download-catalog slides schema/feed regression check проходит
9. Diff без Phase 3–4 application code

---
*Approved revisions — 2026-08-03*
