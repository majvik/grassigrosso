# Режимы сайта: showcase и commerce

## Зачем это нужно

Первый публичный запуск работает как презентационный каталог. Разработка магазина, цен и умного подбора продолжается в кодовой базе, но эти возможности не должны быть доступны ни посетителю, ни серверу первого запуска.

Режим задаётся одной переменной:

```env
SITE_MODE=showcase
```

Поддерживаются два значения:

- `showcase` — публичная витрина без цен, магазина и умного подбора;
- `commerce` — полный коммерческий контур.

Контракт закрыт по умолчанию: пустое, отсутствующее или неизвестное значение трактуется как `showcase`. Только точное значение `commerce` включает коммерческие возможности.

## Что именно отключено в showcase

### Пользовательский интерфейс

- вместо умного подбора в hero показывается ссылка «Скачать каталог» на `/download-catalog`;
- нет модального окна и точки входа умного подбора;
- нет цен в карточках и списке товаров;
- нет `data-price` в DOM;
- нет фильтра по цене;
- нет сортировок по возрастанию/убыванию цены.

### Публичный API

- `POST /api/catalog/smart-select` возвращает 404;
- все `/api/commerce/*` возвращают 404;
- `GET /api/catalog/products` не отдаёт `price`, `priceRub`, `price_rub`, SKU, варианты товара и идентификаторы commerce/Medusa;
- очистка применяется и к живому ответу Strapi, и к disk snapshot/stale fallback.

### Серверный runtime

- модуль Gemini-подбора не загружается и его клиент не создаётся;
- Medusa-клиенты и commerce router не загружаются и не создаются;
- коммерческие маршруты не регистрируются в Express.

Таким образом, это не CSS-скрытие. В showcase коммерческие возможности отсутствуют в пользовательском DOM и серверном API.

## Матрица возможностей

| Возможность | showcase | commerce |
| --- | --- | --- |
| Каталог и обычные фильтры | Да | Да |
| Скачать каталог | Да | Можно оставить как отдельную страницу |
| Умный подбор | Нет | Да |
| Цены и фильтр по цене | Нет | Да |
| Store/Medusa API | Нет | Да |
| Gemini/Medusa инициализируются сервером | Нет | Да |

## Локальный запуск

Showcase (безопасный режим по умолчанию):

```bash
SITE_MODE=showcase npm run dev:all
```

Commerce:

```bash
SITE_MODE=commerce npm run dev:all
```

Vite и `server.cjs` читают одну и ту же `SITE_MODE`. Не добавляйте отдельные `VITE_ENABLE_PRICE`, `ENABLE_SMART_SELECTOR` и подобные флаги: они могут рассинхронизировать браузер и сервер.

## Ветки

- `release/showcase-launch` — линия первого запуска; ожидаемый режим `SITE_MODE=showcase`.
- `codex/store-commerce-smart-selector` — продолжение магазина; для полного контура нужен `SITE_MODE=commerce`.
- `main` и production не меняются автоматически.
- Общие исправления переносятся из showcase-ветки в commerce-ветку осознанным merge/cherry-pick после локальных тестов.

Наличие store/smart исходников в репозитории допустимо. Недопустима их доступность через DOM, HTTP-маршруты или публичный catalog payload в showcase.

## Timeweb

В панели окружения задавайте `SITE_MODE` явно:

```env
SITE_MODE=showcase
```

Это снижает риск ошибочной конфигурации, хотя код и без переменной безопасно перейдёт в showcase. Для будущего коммерческого окружения значение меняется на `commerce` только вместе с готовностью Medusa, Gemini, цен и полного commerce test gate.

Этот раздел — инструкция, а не разрешение на deploy. Push и изменение Timeweb выполняются только по отдельному явному запросу после зелёных локальных тестов.

## Обязательная проверка

```bash
npm run check:site-mode
npm run check:showcase-server
npm run check:showcase-ui
SITE_MODE=showcase npm run build:web
npm run check:showcase-bundle
npm run typecheck
SITE_MODE=showcase npm run build
npm run check:docker-runtime-contract
```

Для контроля сохранности коммерческого пути:

```bash
SITE_MODE=commerce npm run check:catalog-smart-select-api
SITE_MODE=commerce npm run build:web
```

`check:showcase-server` проверяет 404 коммерческих маршрутов и отсутствие коммерческих полей в API. `check:showcase-ui` поднимает локальные Vite/API и Chrome и проверяет фактический DOM каталога.

## Правило для дальнейшей разработки

Любая новая коммерческая возможность должна быть включена в общий capability-контракт `lib/site-mode.cjs`, закрыта в showcase на сервере и в UI и покрыта regression-тестом. Нельзя ограничиваться `display: none`.
