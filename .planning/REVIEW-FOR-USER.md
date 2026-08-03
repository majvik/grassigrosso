# План для проверки: редактирование страниц (GSD v1.1)

**Дата:** 2026-08-03
**Статус:** план исправлен после сверки с кодом — ждать явного «кодить Phase 2» / approve execute

---

## Ответы (зафиксировано)

| Вопрос | Ответ | Как в схеме |
|--------|-------|-------------|
| Главная / видео-hero | **Через админку** | компонент `page.hero-media` (title, CTA, poster, video desktop/mobile) |
| География дилеров | **Полноценное редактирование** | repeatable `page.geo-city` (название + бейдж «скоро» + порядок) |
| Карта контактов | **iframe из админки** | на каждый офис; feed извлекает и allowlist-проверяет URL, raw HTML не попадает в React |
| PDF каталога | **Да** | `catalog_pdf` media на download-catalog |

---

## Roadmap

| Фаза | Что | Статус |
|------|-----|--------|
| **1** Shared components | `page.*` | сделано (на диске) |
| **2** Single types + RU | схемы страниц | **план обновлён — ждать «кодить»** |
| **3** Feeds + proxy + seed | API + snapshots | потом |
| **4** React hydrate | сайт читает CMS | потом (+ sanitize iframe) |
| **5** Deploy smoke | git/seed | потом |
| **6** Legal | privacy/terms/cookies | волна 2 |

---

## Phase 2 (после команды на код)

**Типы:** Главная, Отелям, Дилерам, Контакты, Документы + расширение «Скачать каталог».

**Важное исправление:** старый план нельзя было выполнять без потери контента. Generic `page.section` не покрывал коллекции/отзывы Index, категории/карточки/скидки Hotels, пакеты Dealers, карты по офисам и stable document hooks.

**Новый первый hard gate:** полный `02-CONTENT-CONTRACT.md` (каждое значение текущего TSX → CMS field или явно code-owned) + representative fixtures. Только после этого фиксируется набор компонентов и создаются single types.

**Базовые новые компоненты:** `hero-media`, `stat`, `geo-city`, `office`, `document-card`, `contact-info`; точные layout-specific компоненты для карточек/таблиц определяются матрицей, а не заменяются lossy `page.list-item`.

**Проверка RU:** не только ключи `ru.json`, но и browser smoke фактической Strapi Admin UI.

## Жёсткий Definition of Done

- Разработка и проверки ведутся только локально.
- Пока новая/изменённая логика не покрыта автоматическими тестами, задача не выполнена.
- Все релевантные тесты, typecheck, build и локальные API/UI checks должны быть зелёными.
- Ручной smoke не заменяет тесты.
- Запрещены push, PR, deploy и любые изменения Timeweb/dev/prod до отдельного явного разрешения пользователя.

**Не в CMS:** лейблы полей формы, email routing.

Детали: [02-RESEARCH.md](phases/02-wave-1-single-types/02-RESEARCH.md) · [02-01-PLAN.md](phases/02-wave-1-single-types/02-01-PLAN.md)

---

Чтобы начать реализацию Phase 2, напиши: **«кодить Phase 2»** или **«approve, execute»**.
