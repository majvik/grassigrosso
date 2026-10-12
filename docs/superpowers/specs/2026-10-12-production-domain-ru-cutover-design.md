# Перевод production-домена на grassigrosso.ru — design spec

## Проблема

Production-сайт сейчас считает `https://grassigrosso.com` основным origin:

- `https://grassigrosso.ru/*` отвечает `301` на соответствующий URL `.com`;
- canonical и Open Graph указывают на `.com`;
- sitemap и robots публикуют `.com`;
- серверный production middleware закрепляет `.com` как `PRIMARY_HOST`;
- юридические тексты называют `.com` адресом сайта.

Почтовые адреса на `@grassigrosso.com` уже используются клиентами и должны остаться без изменений.

## Цель

Сделать `https://grassigrosso.ru` единственным основным публичным web-origin, сохранив все рабочие почтовые адреса `@grassigrosso.com` и маршрутизацию заявок.

## Зафиксированные решения

1. Основной production URL: `https://grassigrosso.ru`.
2. `grassigrosso.com` постоянно перенаправляется кодом `301` на `.ru` с сохранением path и query string.
3. `www.grassigrosso.com` перенаправляется `301` на apex `.ru` с сохранением path и query string.
4. `www.grassigrosso.ru` перенаправляется `301` на apex `.ru` с сохранением path и query string.
5. Старые URL с `.html` канонизируются на URL без суффикса; редиректы не должны образовывать циклы.
6. Canonical, `og:url`, sitemap, robots и юридические упоминания адреса сайта переводятся на `.ru`.
7. Адреса `sales@`, `office@`, `hotels@`, `b2b@`, `callback@`, региональные адреса и все остальные mailbox-адреса `@grassigrosso.com` не меняются.
8. SMTP, `MAIL_FROM`, `MAIL_TO`, серверная маршрутизация форм и адреса получателей не меняются.
9. Изменение применяется и к `main` (production), и к `strapi-full-cms` (dev/следующая версия), без переноса несовместимого кода между ветками.

## Выбранный подход

Выполнить синхронный cutover приложения и платформы:

- обновить web-origin и canonical redirect в обеих ветках;
- обновить все code-owned SEO и legal web-domain references;
- добавить автоматический domain-cutover contract test, который отдельно проверяет web URL и защищает email-адреса от случайной замены;
- локально собрать обе ветки и проверить сформированный `dist`;
- обновить Timeweb build/runtime environment и custom domains;
- отправить проверенные коммиты, дождаться сборок и выполнить live smoke.

Этот подход выбран вместо частичного server-only или platform-only изменения: частичный cutover оставляет противоречащие друг другу редиректы, canonical, sitemap или юридические страницы.

## Изменения в репозитории

### Server canonicalization

- Production primary host меняется с `grassigrosso.com` на `grassigrosso.ru`.
- Любой production host, отличный от apex `.ru`, перенаправляется на `https://grassigrosso.ru`.
- Path и query string сохраняются.
- Для legacy `*.html` итоговый URL не содержит `.html`.
- `/health` на основном домене остаётся доступен и отвечает без редиректа после достижения `.ru`.

### Build-time SEO origin

- Default `SITE_URL` меняется на `https://grassigrosso.ru`.
- `.env.example` документирует `.ru` как публичный URL.
- Canonical и Open Graph в собранных HTML должны использовать `.ru`.
- `public/sitemap.xml` и `public/robots.txt` используют `.ru`.

### Legal и видимый контент

- Упоминания доменного имени именно как адреса сайта меняются с `.com` на `.ru`.
- `href="https://grassigrosso.com"` для сайта меняется на `.ru`.
- Email-текст, `mailto:`, JSON-LD email, SMTP и mail routing остаются на `.com`.
- Нельзя выполнять слепую глобальную замену `grassigrosso.com → grassigrosso.ru`.

### Platform configuration

В production-приложении Timeweb:

- `SITE_URL=https://grassigrosso.ru`;
- `CORS_ALLOWED_ORIGINS` содержит `https://grassigrosso.ru`;
- `grassigrosso.ru`, `www.grassigrosso.ru`, `grassigrosso.com` и `www.grassigrosso.com` подключены к приложению;
- для всех четырёх hostnames выпущены валидные TLS-сертификаты;
- email/SMTP variables не меняются.

Если платформа позволяет выбрать primary domain, primary выставляется `grassigrosso.ru`; приложение всё равно остаётся источником истины для canonical redirect.

## Автоматические проверки

Новый contract test обязан проверять:

1. primary host в server config равен `grassigrosso.ru`;
2. default `SITE_URL` равен `https://grassigrosso.ru`;
3. sitemap и robots не содержат web URL `.com`;
4. legal web-domain references используют `.ru`;
5. email allowlist на `@grassigrosso.com` сохранён;
6. ни один mail routing key или recipient не был переведён на `.ru`;
7. build output содержит `.ru` в canonical и `og:url`;
8. redirect helper сохраняет path/query и удаляет `.html` без цикла.

Обязательные локальные команды для `strapi-full-cms`:

- новый domain-cutover contract test;
- `npm run typecheck`;
- релевантные routing/API checks;
- `npm run build:web` или полный `npm run build`, если затронут runtime Strapi.

Обязательные локальные команды для `main`:

- новый domain-cutover contract test;
- существующие релевантные checks ветки;
- `npm run build`;
- проверка сформированного `dist`.

## Live verification

После deploy проверяются:

| Запрос | Ожидаемый результат |
| --- | --- |
| `https://grassigrosso.ru/` | `200`, без модалки, canonical `.ru` |
| `https://grassigrosso.ru/catalog` | `200`, canonical `.ru/catalog` |
| `https://grassigrosso.com/catalog?x=1` | `301` на `https://grassigrosso.ru/catalog?x=1` |
| `https://grassigrosso.com/catalog.html?x=1` | `301` на канонический URL `.ru` без `.html` |
| `https://www.grassigrosso.com/...` | валидный TLS и `301` на apex `.ru` |
| `https://www.grassigrosso.ru/...` | валидный TLS и `301` на apex `.ru` |
| `https://grassigrosso.ru/health` | `200` |
| `https://grassigrosso.ru/sitemap.xml` | только URL `.ru` |
| `https://grassigrosso.ru/robots.txt` | sitemap на `.ru` |

Дополнительно проверяется preflight/POST формы с Origin `.ru` без отправки реальной клиентской заявки.

## Rollout

1. Подготовить и проверить изменения локально в `strapi-full-cms`.
2. Перенести эквивалентные изменения в `main` с учётом различий веток.
3. Настроить custom domains, TLS, `SITE_URL` и CORS в Timeweb до переключения redirect source of truth.
4. Отправить dev-ветку, проверить dev build.
5. Отправить `main`, дождаться production build.
6. Выполнить live verification matrix.
7. Зафиксировать результаты в implementation plan.

## Rollback

При критической ошибке:

1. вернуть предыдущие значения `SITE_URL`/CORS в Timeweb;
2. выполнить `git revert` domain-cutover commit в затронутой ветке;
3. дождаться deploy;
4. проверить восстановление `.com` и `/health`.

DNS-записи и custom-domain attachments не удаляются во время первичного rollback: это сохраняет возможность безопасно обслуживать оба домена и не ломает TLS.

## Success criteria

- `.ru` отдаёт production без redirect на `.com`;
- `.com` и оба `www` дают постоянный redirect на apex `.ru` с сохранением path/query;
- canonical, Open Graph, sitemap, robots и legal site references используют `.ru`;
- email `@grassigrosso.com` и доставка форм работают без изменения адресов;
- все локальные автоматические gate-команды зелёные;
- live verification matrix зелёная после deploy;
- plan содержит точные команды, результаты и post-cutover наблюдения.
