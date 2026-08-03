# Roadmap: Grassigrosso Pages CMS

## Overview

Milestone **v1.1** делает маркетинговые тексты волны 1 редактируемыми в Strapi Admin на русском: shared `page.*` компоненты → per-page single types → Node proxy + snapshots → React hydrate с fallback на текущий TSX. После полного локального automated test gate волны 1, без push/deploy, волна 2 (Phase 6) переносит legal (privacy/terms/cookies).

## Phases

**Phase Numbering:**
- Integer phases (1–6): Planned milestone work
- Decimal phases (e.g. 2.1): Urgent insertions via `/gsd-insert-phase`

- [x] **Phase 1: Shared Page Components** - Переиспользуемые `page.*` блоки с русскими лейблами
- [x] **Phase 2: Wave 1 Single Types** - Single types страниц + расширение download-catalog + полный `ru.json`
- [ ] **Phase 3: Feeds, Proxy & Seed** - Публичные feeds, `GET /api/pages/:slug`, snapshots, seed из React
- [ ] **Phase 4: React Hydrate** - Волны 1 страницы берут контент из Node API без поломки layout и email-routing
- [ ] **Phase 5: Local Acceptance Gate** - Полное автотестовое покрытие и локальный green verify; без push/deploy
- [ ] **Phase 6: Legal Pages** - Privacy / terms / cookies в CMS + hydrate `legal-content.tsx`

## Phase Details

### Phase 1: Shared Page Components
**Goal**: Редактор видит в Content-Type Builder переиспользуемые русскоязычные блоки (`page.hero`, section, faq, list), готовые к сборке single types.
**Depends on**: Nothing (first phase)
**Requirements**: ADM-01
**Success Criteria** (what must be TRUE):
  1. В Strapi Admin доступны shared компоненты `page.hero`, `page.section`, `page.faq-item`, `page.list-item` (или эквивалентный набор с теми же ролями)
  2. У полей этих компонентов отображаются русские лейблы, а не сырые английские ключи
  3. Компоненты можно вложить в single type без ошибок схемы при `strapi develop` / bootstrap
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md — Shared `page.*` components + RU admin labels (ADM-01)

### Phase 2: Wave 1 Single Types
**Goal**: Редактор открывает отдельные single types волны 1 и download-catalog с полным русским UI и полями title/lead/CTA/PDF.
**Depends on**: Phase 1
**Requirements**: ADM-02, ADM-03, ADM-04, ADM-05, ADM-06
**Success Criteria** (what must be TRUE):
  1. В админке есть single types «Главная», «Отелям», «Дилерам», «Контакты», «Документы» с русскими displayName и полями
  2. `download-catalog-page` содержит title/lead/CTA/PDF, при этом существующие слайды и feed слайдов продолжают работать
  3. Для новых типов и компонентов в Content Manager / Content-Type Builder нет английских fallback — ключи покрыты в `ru.json`
  4. Редактор может сохранить черновик/публикацию каждого wave-1 single type без ошибки валидации схемы
  5. Для каждой страницы есть проверенная матрица current TSX/runtime input → CMS field или явно code-owned contract
  6. Репрезентативный fixture каждой страницы проходит schema validation; сложные карточки/таблицы/медиа не сведены к lossy `page.section`
  7. Русские названия подтверждены скриншотом/браузерным smoke работающей Admin UI, а не только наличием ключей в JSON
**Plans**: 1 plan

Plans:
- [x] 02-01-PLAN.md — Wave 1 single types + extra page.* + download-catalog texts/PDF + RU (see 02-RESEARCH.md)

### Phase 3: Feeds, Proxy & Seed
**Goal**: Сайт получает контент страниц только через Node (`/api/pages/:slug`) с cache и disk snapshot; Strapi заполнен текущим hardcoded-контентом.
**Depends on**: Phase 2
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06
**Success Criteria** (what must be TRUE):
  1. Для каждого slug волны 1 (+ download-catalog texts) доступен публичный Strapi feed, совместимый с Node proxy
  2. `GET /api/pages/:slug` отдаёт JSON при живом Strapi и из disk snapshot при недоступности Strapi
  3. В `public/` лежат page snapshots (+ manifest), экспорт воспроизводим скриптом наподобие catalog snapshot
  4. После идемпотентного seed админка показывает тот же текст/медиа, что сейчас захардкожены в React страниц волны 1
  5. Браузер/фронт по-прежнему не ходит в Strapi напрямую за page-контентом
  6. Неизвестный slug получает 404; пустой/404 Strapi не затирает последний валидный snapshot; ответ содержит диагностический source
  7. Map iframe нормализован до allowlisted HTTPS URL на feed/proxy boundary; raw HTML не передаётся React
**Plans**: 1 plan (AWAITING REVIEW — no code until Superpowers approved)

Plans:
- [ ] 03-01-PLAN.md — Feeds, proxy, snapshots, seed ([design](../docs/superpowers/specs/2026-08-03-pages-cms-feeds-proxy-seed-design.md), [execution](../docs/superpowers/plans/2026-08-03-pages-cms-feeds-proxy-seed.md))

### Phase 4: React Hydrate
**Goal**: Публичные страницы волны 1 показывают CMS-контент через hydrate, сохраняя визуал и контракт email-форм.
**Depends on**: Phase 3
**Requirements**: FE-01, FE-02, FE-03, FE-04, FE-05
**Success Criteria** (what must be TRUE):
  1. Index, hotels, dealers, contacts, documents и тексты download-catalog гидрируют контент из `GET /api/pages/:slug` (или эквивалентного Node endpoint)
  2. При отсутствии/ошибке API страница остаётся читаемой за счёт текущего TSX/SSR fallback
  3. Layout и ключевые визуальные блоки (hero, секции, FAQ, списки) совпадают с до-CMS состоянием при том же контенте
  4. Отправка форм по-прежнему использует те же значения `page` / `PAGE_EMAIL_ROUTING` — ключи не изменены CMS-слоем
  5. Сохранены стабильные hook-атрибуты/идентификаторы документов и значения dealer package; CMS управляет данными, не поведением
  6. Первый render остаётся полным fallback и не даёт пустой экран/существенный CLS до ответа API
**Plans**: TBD

Plans:
- [ ] 04-01: TBD

### Phase 5: Local Acceptance Gate
**Goal**: Доказать локально автоматическими тестами, что весь milestone работает и не регрессирует; не отправлять изменения во внешние системы.
**Depends on**: Phase 4
**Requirements**: QA-01, QA-02, QA-03
**Success Criteria** (what must be TRUE):
  1. Каждая добавленная ветка логики покрыта автоматическим тестом; каждый исправленный дефект имеет regression test
  2. Локально проходят новые тесты, полный релевантный suite, `typecheck`, `build`, API/UI checks; команды и результаты записаны в plan
  3. Локальный integration test: изменение поля в Strapi видно через Node API и React-страницу
  4. Локальный failure test: при остановленном/недоступном Strapi Node отдаёт валидный disk snapshot
  5. Существующие catalog / download-catalog автоматические проверки не регрессируют
  6. Ручной browser smoke выполнен только как дополнительная проверка и не является единственным доказательством
  7. Не выполнялись `git push`, PR, remote deploy, remote smoke с mutation или изменения Timeweb/dev/prod
**Plans**: TBD

Plans:
- [ ] 05-01: TBD

### Phase 6: Legal Pages
**Goal**: Юрист/редактор обновляет privacy, terms и cookies в админке; сайт гидрирует `legal-content` без отдельного CMS-бандла.
**Depends on**: Phase 5 (волна 1 стабильна)
**Requirements**: LEG-01, LEG-02
**Success Criteria** (what must be TRUE):
  1. В админке есть single types (или эквивалент per-page) для privacy / terms / cookies с русскими лейблами
  2. Контент поддерживает rich text / блочную структуру, достаточную для текущих legal-страниц
  3. `/privacy`, `/terms`, `/cookies` гидрируют из Node API + snapshot fallback через тот же proxy-паттерн
  4. Визуал legal-страниц остаётся читаемым; нет прямого доступа фронта к Strapi
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

## Progress

**Execution Order:**
1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Shared Page Components | 1/1 | Complete | 2026-08-03 |
| 2. Wave 1 Single Types | 0/1 | In progress (Tasks 1–5 done; Task 6 next) | - |
| 3. Feeds, Proxy & Seed | 0/TBD | Not started | - |
| 4. React Hydrate | 0/TBD | Not started | - |
| 5. Local Acceptance Gate | 0/TBD | Not started | - |
| 6. Legal Pages | 0/TBD | Not started | - |

---
*Roadmap created: 2026-08-03*
