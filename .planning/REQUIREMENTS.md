# Requirements: Grassigrosso Pages CMS

**Defined:** 2026-08-03
**Core Value:** Редактор меняет тексты/медиа публичных страниц в Strapi Admin на русском без деплоя фронта.

## v1 Requirements

### Schema & Admin (RU)

- [x] **ADM-01**: Shared компоненты `page.*` (hero, section, faq-item, list-item) с русскими лейблами
- [x] **ADM-02**: Single types волны 1: Главная, Отелям, Дилерам, Контакты, Документы — displayName и поля на русском
- [x] **ADM-03**: `download-catalog-page` расширен title/lead/CTA/PDF; существующие слайды сохранены
- [x] **ADM-04**: Полные ключи в `strapi-catalog/src/admin/translations/ru.json` (content-manager + content-type-builder); в админке нет английских fallback у новых типов
- [x] **ADM-05**: Content-contract matrix покрывает все текущие render inputs волны 1; каждый элемент помечен CMS-owned или обоснованно code-owned
- [x] **ADM-06**: Репрезентативные fixtures всех single types проходят schema validation до начала feed/frontend-фаз

### Feeds & Proxy

- [ ] **API-01**: Публичный feed на каждый page single type (или единый feed по slug)
- [ ] **API-02**: Node `GET /api/pages/:slug` с cache + disk snapshot fallback
- [ ] **API-03**: Export snapshots в `public/pages-*.snapshot.json` (или эквивалент) + manifest
- [ ] **API-04**: Идемпотентный seed текущего hardcoded-контента из React в Strapi
- [ ] **API-05**: Page proxy использует allowlist slug, не заменяет валидный snapshot пустым/404-ответом и сообщает источник (`strapi`, `memory-cache`, `disk-snapshot`)
- [ ] **API-06**: Map iframe из CMS преобразуется feed-слоем в allowlisted HTTPS embed URL; произвольный HTML не отдаётся фронту

### Frontend

- [ ] **FE-01**: React pages волны 1 гидрируют контент из Node API с fallback на текущий TSX
- [ ] **FE-02**: Layout/визуал страниц не ломается после hydrate
- [ ] **FE-03**: `getPageName` / `PAGE_EMAIL_ROUTING` не изменены CMS-слоем
- [ ] **FE-04**: Стабильные `id`, `data-*`, document keys, package values и прочие runtime hooks сохранены
- [ ] **FE-05**: Нет заметного layout shift/пустого первого кадра из-за поздней загрузки CMS; hardcoded fallback остаётся первым безопасным render

### Local acceptance gate

- [ ] **QA-01**: Каждая новая/изменённая логика покрыта автоматическими тестами; каждый баг имеет regression test
- [ ] **QA-02**: Все релевантные tests/typecheck/build/API/UI checks проходят локально, команды и результаты записаны в plan
- [ ] **QA-03**: До отдельного явного разрешения пользователя не выполняются push, PR, remote deploy или remote mutation; проверка ведётся только локально

## v2 Requirements

### Legal

- **LEG-01**: Single types или эквивалент для privacy / terms / cookies
- **LEG-02**: Rich text / блоковая структура + hydrate `legal-content.tsx`

## Out of Scope

| Feature | Reason |
|---------|--------|
| Отдельный CMS frontend bundle | Запрет AGENTS.md |
| Generic marketing-page collection | Выбран per-page single type |
| CMS 404 / unsubscribe | Низкая ценность |
| Email routing в CMS | Критичный код-контракт |
| Перенос catalog products/filters | Уже в Strapi |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ADM-01 | Phase 1 | Complete |
| ADM-02 | Phase 2 | Complete |
| ADM-03 | Phase 2 | Complete |
| ADM-04 | Phase 2 | Complete |
| ADM-05 | Phase 2 | Complete |
| ADM-06 | Phase 2 | Complete |
| API-01 | Phase 3 | Pending |
| API-02 | Phase 3 | Pending |
| API-03 | Phase 3 | Pending |
| API-04 | Phase 3 | Pending |
| API-05 | Phase 3 | Pending |
| API-06 | Phase 3 | Pending |
| FE-01 | Phase 4 | Pending |
| FE-02 | Phase 4 | Pending |
| FE-03 | Phase 4 | Pending |
| FE-04 | Phase 4 | Pending |
| FE-05 | Phase 4 | Pending |
| QA-01 | Every phase + Phase 5 gate | Pending |
| QA-02 | Every phase + Phase 5 gate | Pending |
| QA-03 | Every phase + Phase 5 gate | Pending |
| LEG-01 | Phase 6 | Pending |
| LEG-02 | Phase 6 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20/20
- LEG (v2, Phase 6): 2/2
- Unmapped: 0

---
*Requirements defined: 2026-08-03*
*Last updated: 2026-08-03 after roadmap (ADM-04 → Phase 2 only)*
