# Grassigrosso

## What This Is

Публичный маркетинговый сайт производителя матрасов Grassigrosso: каталог, B2B-страницы (отелям/дилерам), документы, контакты, юридические страницы. Контент каталога уже редактируется в Strapi; маркетинговые тексты страниц пока в React.

## Core Value

Редактор может менять тексты и медиа публичных страниц в Strapi Admin **на русском**, без деплоя фронта и без прямого доступа сайта к Strapi.

## Current Milestone: v1.1 Редактирование страниц в админке

**Goal:** Перенести редактируемый контент маркетинговых страниц в Strapi без потери текущих данных и runtime-контрактов, с полными RU-лейблами, Node proxy и snapshot fallback.

**Target features:**
- Single type на каждую страницу волны 1
- Проверяемый content contract: каждое текущее поле TSX либо хранится в CMS, либо явно остаётся code-owned
- Shared `page.*` компоненты + полный `ru.json`
- Feeds → Node `/api/pages/:slug` → snapshots → React hydrate
- Расширение download-catalog-page текстами/PDF
- Волна 2: legal (privacy/terms/cookies)

## Requirements

### Validated

- Каталог: products / hero / filters / filter-help / share-help через Strapi + Node proxy + snapshots
- Страница «Скачать каталог»: слайды + display mode в Strapi
- React island migration маркетинговых страниц
- GSD + Superpowers процесс в AGENTS.md

### Active

- [ ] Редактирование контента index / hotels / dealers / contacts / documents через админку (RU)
- [ ] Тексты download-catalog (title, lead, CTA, PDF) в том же single type, что слайды
- [ ] Proxy + disk snapshot на каждую страницу; фронт не ходит в Strapi напрямую
- [ ] Seed текущего TSX-контента в Strapi (админка сразу полная)
- [ ] Legal pages (волна 2)

### Out of Scope

- Отдельный фронтовый CMS-бандл — запрещено AGENTS.md
- Generic collection `marketing-page` по slug — отклонено (нужен single type на страницу)
- CMS для 404 / unsubscribe — редко меняются
- Изменение email-маршрутизации форм через CMS
- Дублирование каталожных типов (products/filters) в page CMS

## Context

- Паттерн-референс: `download-catalog-page` + `download-catalog-feed` + `GET /api/download-catalog/slides`
- Карта кодовой базы: `.planning/codebase/` (2026-08-03)
- Deploy: seed `data.db` + uploads + snapshots в git → Timeweb Docker

## Constraints

- **Tech**: Strapi single types + Node proxy + snapshots — существующий контракт каталога
- **Admin UX**: все названия типов/полей/enum только на русском
- **Safety**: не ломать layout React-страниц; SSR/fallback = текущий hardcoded
- **Security**: произвольный HTML из CMS не попадает в React; map iframe нормализуется сервером по allowlist
- **Email**: `getPageName` ↔ `PAGE_EMAIL_ROUTING` не трогать ключи без синхронного обновления
- **Local-only**: разработка и verify только локально; push/PR/deploy запрещены до отдельного явного разрешения пользователя
- **Definition of done**: без автоматических тестов на новую/изменённую логику и полного зелёного локального verify задача не выполнена

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single type на страницу | Удобнее в админке, как download-catalog | — Pending |
| RU-only admin labels | Требование продукта | — Pending |
| Node proxy, не прямой Strapi | Инвариант AGENTS.md | ✓ Good |
| Волна 1 без legal | Legal — rich text, отдельная волна | — Pending |
| GSD для планирования/исполнения | Требование пользователя + AGENTS.md | ✓ Good |
| Schema from render inputs, not section names | Иначе seed/parity невыполнимы для сложных страниц | ✓ Corrected after audit |
| Per-office map embed + server normalization | Текущий UI имеет вкладку карты на каждый офис; raw HTML в React небезопасен | ✓ Corrected after audit |

---
*Last updated: 2026-08-03 after GSD map-codebase + milestone init*
