# Grassigrosso

## Режим первого запуска

Первый публичный запуск использует `SITE_MODE=showcase`: цены, магазин и умный подбор недоступны в UI и не регистрируются на сервере. Полный контракт, ветки и локальные проверки описаны в [docs/site-modes.md](docs/site-modes.md).

Корпоративный сайт Grassigrosso с backend-обработкой заявок из форм.

## Документация

Вся актуальная документация собрана в одном месте:

- [`docs/README.md`](docs/README.md)

## Быстрый старт

```bash
npm install
npm run dev   # frontend
npm start     # backend
```

## Важно

- Правила по созданию/изменению страниц и критические инварианты форм: [`AGENTS.md`](AGENTS.md).
- Пример переменных окружения: [`.env.example`](.env.example).
