# Requirements

## Active

## Validated

### ADM-01 — Shared компоненты `page.*` (hero, section, faq-item, list-item) с русскими лейблами

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Shared компоненты `page.*` (hero, section, faq-item, list-item) с русскими лейблами

### ADM-02 — Single types волны 1: Главная, Отелям, Дилерам, Контакты, Документы — displayName и поля на русском

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Single types волны 1: Главная, Отелям, Дилерам, Контакты, Документы — displayName и поля на русском

### ADM-03 — `download-catalog-page` расширен title/lead/CTA/PDF; существующие слайды сохранены

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

`download-catalog-page` расширен title/lead/CTA/PDF; существующие слайды сохранены

### ADM-04 — Полные ключи в `strapi-catalog/src/admin/translations/ru.json` (content-manager + content-type-builder); в админке нет английских fallback у новых типов

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Полные ключи в `strapi-catalog/src/admin/translations/ru.json` (content-manager + content-type-builder); в админке нет английских fallback у новых типов

### ADM-05 — Content-contract matrix покрывает все текущие render inputs волны 1; каждый элемент помечен CMS-owned или обоснованно code-owned

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Content-contract matrix покрывает все текущие render inputs волны 1; каждый элемент помечен CMS-owned или обоснованно code-owned

### ADM-06 — Репрезентативные fixtures всех single types проходят schema validation до начала feed/frontend-фаз

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Репрезентативные fixtures всех single types проходят schema validation до начала feed/frontend-фаз

### API-01 — Публичный feed на каждый page single type (или единый feed по slug)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Публичный feed на каждый page single type (или единый feed по slug)

### API-02 — Node `GET /api/pages/:slug` с cache + disk snapshot fallback

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Node `GET /api/pages/:slug` с cache + disk snapshot fallback

### API-03 — Export snapshots в `public/pages-*.snapshot.json` (или эквивалент) + manifest

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Export snapshots в `public/pages-*.snapshot.json` (или эквивалент) + manifest

### API-04 — Идемпотентный seed текущего hardcoded-контента из React в Strapi

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Идемпотентный seed текущего hardcoded-контента из React в Strapi

### API-05 — Page proxy использует allowlist slug, не заменяет валидный snapshot пустым/404-ответом и сообщает источник (`strapi`, `memory-cache`, `disk-snapshot`)

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Page proxy использует allowlist slug, не заменяет валидный snapshot пустым/404-ответом и сообщает источник (`strapi`, `memory-cache`, `disk-snapshot`)

### API-06 — Map iframe из CMS преобразуется feed-слоем в allowlisted HTTPS embed URL; произвольный HTML не отдаётся фронту

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Map iframe из CMS преобразуется feed-слоем в allowlisted HTTPS embed URL; произвольный HTML не отдаётся фронту

### FE-01 — React pages волны 1 гидрируют контент из Node API с fallback на текущий TSX

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

React pages волны 1 гидрируют контент из Node API с fallback на текущий TSX

### FE-02 — Layout/визуал страниц не ломается после hydrate

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Layout/визуал страниц не ломается после hydrate

### FE-03 — `getPageName` / `PAGE_EMAIL_ROUTING` не изменены CMS-слоем

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

`getPageName` / `PAGE_EMAIL_ROUTING` не изменены CMS-слоем

### FE-04 — Стабильные `id`, `data-*`, document keys, package values и прочие runtime hooks сохранены

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Стабильные `id`, `data-*`, document keys, package values и прочие runtime hooks сохранены

### FE-05 — Нет заметного layout shift/пустого первого кадра из-за поздней загрузки CMS; hardcoded fallback остаётся первым безопасным render

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Нет заметного layout shift/пустого первого кадра из-за поздней загрузки CMS; hardcoded fallback остаётся первым безопасным render

### QA-01 — Каждая новая/изменённая логика покрыта автоматическими тестами; каждый баг имеет regression test

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Каждая новая/изменённая логика покрыта автоматическими тестами; каждый баг имеет regression test

### QA-02 — Все релевантные tests/typecheck/build/API/UI checks проходят локально, команды и результаты записаны в plan

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Все релевантные tests/typecheck/build/API/UI checks проходят локально, команды и результаты записаны в plan

### QA-03 — До отдельного явного разрешения пользователя не выполняются push, PR, remote deploy или remote mutation; проверка ведётся только локально

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

До отдельного явного разрешения пользователя не выполняются push, PR, remote deploy или remote mutation; проверка ведётся только локально

### LEG-01 — Single types или эквивалент для privacy / terms / cookies

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Single types или эквивалент для privacy / terms / cookies

### LEG-02 — Rich text / блоковая структура + hydrate `legal-content.tsx`

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Rich text / блоковая структура + hydrate `legal-content.tsx`

### CHR-01 — Один RU single type управляет header и footer через структурированные компоненты

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Один RU single type управляет header и footer через структурированные компоненты

### CHR-02 — Desktop header и mobile menu используют один ordered navigation contract

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Desktop header и mobile menu используют один ordered navigation contract

### CHR-03 — Node API + cache/stale/disk snapshot обслуживают chrome без frontend→Strapi

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Node API + cache/stale/disk snapshot обслуживают chrome без frontend→Strapi

### CHR-04 — Полный header/mobile/footer присутствует в первом HTML-кадре всех contracted страниц

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Полный header/mobile/footer присутствует в первом HTML-кадре всех contracted страниц

### CHR-05 — Atomic hydrate сохраняет layout, hooks, security, email-routing и fallback

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Atomic hydrate сохраняет layout, hooks, security, email-routing и fallback

### CHR-06 — Phase 7 gate покрывает Admin save/reload, degraded mode и все page consumers

- Status: validated
- Class: core-capability
- Source: inferred
- Primary Slice: none yet

Phase 7 gate покрывает Admin save/reload, degraded mode и все page consumers

## Deferred

## Out of Scope
