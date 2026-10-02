# Personal Data Site Update Package Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подготовить принятые юридические документы как отдельные исходники для последующего обновления сайта.

**Architecture:** Три принятых Markdown-файла копируются без изменения содержания и получают понятные имена страниц. Два принятых бланка Word копируются с удалением только жёлтого выделения; остальная OOXML-структура и вёрстка сохраняются.

**Tech Stack:** Markdown, DOCX/OOXML, bundled Python `python-docx`, packaged `render_docx.py`.

**Spec:** `docs/superpowers/specs/2026-10-02-personal-data-site-update-package-design.md`

## Global Constraints

- Не изменять исходный код сайта.
- Не менять принятое клиентом содержание.
- Не включать объединённый Word-комплект.
- Не оставлять выделения в Markdown и DOCX.
- Выполнить локальную структурную и визуальную проверку.

## Review Focus

- Потеря или изменение текста при копировании Markdown.
- Случайное сохранение жёлтой подсветки в DOCX.
- Повреждение полей нумерации страниц при пересохранении DOCX.
- Появление квадратов вместо буллетов после пересохранения.
- Включение лишнего документа, который не предназначен для размещения на сайте.

---

### Task 1: Markdown-источники страниц

**Files:**
- Create: `client-documents/personal-data-policy/corrected/to update/privacy.md`
- Create: `client-documents/personal-data-policy/corrected/to update/personal-data-consent.md`
- Create: `client-documents/personal-data-policy/corrected/to update/cookies.md`

**Interfaces:**
- Consumes: три принятых Markdown-файла из `corrected/`.
- Produces: три неизменённых источника будущих страниц сайта.

- [ ] Скопировать источники с понятными именами.
- [ ] Сравнить каждый файл с источником через `cmp`.
- [ ] Проверить отсутствие HTML/Markdown-маркеров подсветки.

### Task 2: Бланки Word для скачивания

**Files:**
- Create: `client-documents/personal-data-policy/corrected/to update/Grassigrosso-form-withdrawal-of-consent.docx`
- Create: `client-documents/personal-data-policy/corrected/to update/Grassigrosso-form-data-subject-request.docx`

**Interfaces:**
- Consumes: два принятых бланка DOCX.
- Produces: версии для публикации без жёлтого выделения.

- [ ] Пересохранить копии, удалив только `run.font.highlight_color`.
- [ ] Проверить OOXML на отсутствие `w:highlight` и целостность архивов.
- [ ] Проверить совпадение извлечённого текста с исходными бланками.

### Task 3: Визуальная проверка и комплектность

**Files:**
- Verify: все пять файлов в `to update/`.

**Interfaces:**
- Consumes: результаты Tasks 1–2.
- Produces: проверенный пакет для следующей задачи по обновлению сайта.

- [ ] Отрендерить оба DOCX через packaged `render_docx.py`.
- [ ] Просмотреть каждую страницу при 100% масштабе.
- [ ] Проверить нумерацию, буллеты, поля формы, отсутствие подсветки и дефектов.
- [ ] Подтвердить действие правила `.gitignore`.

## Статус

- Task 1: complete
- Task 2: complete
- Task 3: complete

## Результаты проверки

- `cmp` подтвердил побайтное совпадение трёх Markdown-файлов с принятыми источниками.
- Поиск не обнаружил `<mark>`, `==...==` и CSS-маркеров фонового выделения в Markdown.
- В каждом DOCX изменён только `word/document.xml`, причём отличие полностью соответствует удалённым элементам `w:highlight`.
- В итоговых OOXML отсутствуют `w:highlight`, `w:val="yellow"` и `NUMPAGES`; сохранены символы буллетов и поле `PAGE`.
- `unzip -t` подтвердил целостность обоих DOCX.
- Packaged `render_docx.py` сформировал 1 страницу для заявления об отзыве и 2 страницы для запроса субъекта.
- Все 3 страницы просмотрены при полном разрешении: подсветка отсутствует, текст не обрезан, буллеты отображаются точками, номера страниц находятся справа.
- `git check-ignore` подтвердил действие правила `/client-documents/` для папки `to update`.
- Исходный код сайта не изменялся.
