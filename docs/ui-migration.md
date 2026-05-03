# UI Migration: React + Base UI + CSS Modules

Этот документ фиксирует фактический контракт миграции UI-слоя после распила `src/main.js`.

## Целевой стек

- MPA остаётся: HTML entry-файлы в корне, clean URLs и текущий Vite build contract не меняются.
- React используется как island/runtime слой внутри `data-react-root`.
- UI primitives: `@base-ui/react`.
- Визуальный слой: локальные React-компоненты + CSS Modules + токены из `src/styles/tokens.css`.
- `class-variance-authority` и `clsx` используются только для локального variant API, без utility-CSS и без Tailwind.

## Что уже переведено

### Infrastructure

- `src/react-entry.tsx` — монтирование React islands.
- `src/components/app/ReactIslandRoot.tsx` — page routing внутри island-слоя.
- `src/components/ui/*` — локальный shadcn-подобный UI-kit на Base UI и CSS Modules.

### Pages

- `documents` — React page c локальными данными, CSS Modules и UI-kit.
- `contacts` — React page с офисами, формой и maps/tabs hooks через `data-*`.
- `privacy`, `terms`, `cookies` — React legal pages.
- `unsubscribe` — React service page.

### App shell

- `src/main.js` больше не содержит крупные page-специфичные блоки.
- orchestration разнесён по `src/app-shell.js`, `src/page-bootstrap.js`, `src/page-interactions.js`, `src/page-layout.js`, `src/resource-modals.js`, `src/contact-forms.js`, `src/contacts-maps.js`, `src/catalog/*`.

## Что пока не переведено

- Главные маркетинговые страницы (`index`, `hotels`, `dealers`, `contacts`) пока рендерятся из `marketing-content.ts` как HTML-строки.
- `catalog` остаётся отдельным миграционным слоем со Strapi/runtime-логикой и legacy DOM contract.
- `404` пока использует отдельную React-страницу, но ещё не является эталоном для дальнейшего page-shell API.

## Обязательные инварианты миграции

### 1. Не ломать runtime contract

- `POST /api/submit` и значения `page` не меняются.
- Каталог продолжает жить через backend proxy, без прямого фронтового доступа к Strapi.
- `.html` остаётся только build entry, публичные ссылки и canonical — без суффикса.

### 2. Не завязывать новый React UI на legacy class selectors

Для нового React/CSS Modules слоя:

- стили задаются через module classes;
- DOM-интеграция со старым JS делается через `data-*` hooks;
- допустимо временно поддерживать legacy selectors только как fallback, но не как основной контракт.

Примеры правильных hook-атрибутов:

- `data-document-card`
- `data-document-request-trigger`
- `data-faq-item`
- `data-faq-question`

### 3. Не удалять legacy HTML до подтверждённого паритета

- HTML внутри `<main data-react-root>` остаётся fallback-представлением;
- React migration должна давать одинаковую или более полную функциональность;
- удаление legacy fallback-разметки — отдельная задача, после визуального и behavioural parity.

## Рекомендуемый порядок дальнейшей миграции

1. Переводить page families, а не случайные секции:
   - service/legal/documents
   - contacts
   - hotels/dealers
   - index
   - catalog последним крупным этапом
2. Сначала переносить page shell и interactive affordances.
3. Только потом вычищать устаревшие global selectors из `src/styles/components.css`.

## Проверки на каждом большом пакете

- `npm run typecheck`
- `npm run build`
- `npm run check:catalog-ui` при затрагивании общего runtime или shared styles
- ручная визуальная проверка React-страниц против текущего production-like вида

## Критерий завершения migration phase

Фаза считается завершённой, когда:

- page content перестаёт храниться как большие HTML-строки;
- shared UI строится из локальных React-компонентов;
- shared JS больше не зависит от page-specific global class names для новых страниц;
- legacy CSS используется только как fallback для ещё не перенесённых зон.
