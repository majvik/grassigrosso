# Phase 6 — Legal content contract (QA / LEG)

**Date:** 2026-08-04
**Status:** Phase A **Accepted** (v2.1); Phase B Done locally — see plan  
**Source of truth for matrix:** `src/components/pages/legal-content.tsx` → `LEGAL_PAGES` (mechanical parse 2026-08-04)  
**SSR mirrors (parity subjects):** `privacy.html` / `terms.html` / `cookies.html`  
**Code / Phase B:** Done locally (`check:pages-cms-phase-6b`). Phase C / push / sync-seed **not** started.

## Ownership legend

| Owner | Meaning |
|-------|---------|
| **cms** | Editable in Strapi; serialized in feed/snapshot; merge into React |
| **code** | Renderer, prefix, slots, validators, parity/generator — not CMS attributes |
| **fallback** | Hardcoded `LEGAL_PAGES` + **full** HTML SSR (maintained or build-generated) for first paint / merge failure |

## Global invariants (must stay TRUE)

1. **Ordered body:** `body[]` is an ordered array of blocks `paragraph | list | table | operator`. Order is contractual.
2. **Ordered runs:** every text-bearing cell uses ordered `text | link` runs. Order is contractual.
3. **Atomic reject:** unknown block/run/field, inconsistent table shape, unsafe link, empty required operator field, or non-unique table headers → reject **entire** CMS payload; keep fallback.
4. **No raw HTML** in CMS payload or hydrated DOM from CMS.
5. **No CMS `updatedAt`.** Use `effective_date` (`date`). Prefix `Дата последнего обновления:` is **code**.
6. **No new UI:** only existing slots (`.legal-page`, `.legal-page-title`, `.legal-page-date`, `.legal-page-content`, `.legal-table-wrap`, `.legal-table`, `h1`/`h2`/`p`/`ul`/`li`/`a`/`strong`/`table`).
7. **`data-label`:** built by **code** renderer from `table.headers[i]` — not authored in CMS.
8. **Operator:** structured `operator` block only for legal_name/ogrn/inn/address/email; do **not** repeat those requisites as free-text in `paragraph`/`list`. Mailto-only contact lines may remain `paragraph` with `link` run.
9. **L14 — mandatory full SSR + strict parity:** first paint always uses **full** legal HTML SSR. A **strict parity gate** compares SSR body to `LEGAL_PAGES` (normalized) and **FAIL**s on drift. An optional **build-time generator** from `LEGAL_PAGES` may be the implementation that removes hand dual-source maintenance — it does **not** waive the parity gate on the generated (or checked-in) SSR result.
10. **Slugs:** proxy/feed/snapshots support **nine** slugs; wave-1 six must not regress.
11. **Links:** **exact href allowlist** below only; widen only via contract change + validator update.
12. **Seed:** local `.tmp` only until separate permission for sync-seed/push/deploy.
13. **Gate:** `check:pages-cms-phase-6` only — not Phase 5 aggregator yet.
14. **No stable CMS `key` fields** on blocks/items/rows/runs. Identity is **array index order**. Reject matrix does **not** use a vague “duplicate keys” rule; uniqueness is only where listed below.

## Exact inline JSON contract

Runs appear in `paragraph.runs`, each `list.items[i].runs`, and each `table.rows[r].cells[c].runs`.

```json
{ "type": "text", "value": "<string>", "strong": false }
{ "type": "link", "href": "<allowlisted string>", "children": [ { "type": "text", "value": "<string>", "strong": false } ] }
```

Rules:

- Discriminator `type` is exactly `"text"` or `"link"` — no other run types.
- `text.value` is a non-empty string (whitespace-only rejected).
- `text.strong` is **required boolean** (`true` | `false`). No omission; no other emphasis flags.
- `link.href` must be an **exact** string from the allowlist table (byte-identical after trim).
- `link.children` is **always** a non-empty array of `text` runs only (never a bare string; never nested `link`).
- Unknown properties on a run → atomic reject.

## Exact block JSON shapes (summary)

| `type` | Required fields |
|--------|-----------------|
| `paragraph` | `runs: Run[]`; optional `heading?: string` |
| `list` | `items: { runs: Run[] }[]`; optional `heading?: string` |
| `table` | `headers: string[]` (unique within table); `rows: { cells: { runs: Run[] }[] }[]` with `cells.length === headers.length` every row; optional `heading?: string` |
| `operator` | `role_label`, `legal_name`, `ogrn`, `inn`, `address`, `email` (all non-empty strings); optional `heading?: string` (unused in current pages) |

`heading`, when present, renders as `<h2>` immediately before that block. Source `<h2>` nodes are **not** separate CMS blocks — they map to `heading` on the following content block.

## Link allowlist (exact — Phase 6)

| Exact `href` | Used on |
|--------------|---------|
| `https://grassigrosso.com` | privacy, terms, cookies |
| `mailto:office@grassigrosso.com` | privacy, terms |
| `/privacy` | terms, cookies |

Any other `href` (including other root-relative paths, `www.`, query/hash variants, or different mailto) → **atomic reject**. Expansion requires an explicit contract revision.

## Operator structured fields

| Field | Type | Notes |
|-------|------|-------|
| `role_label` | string | e.g. «Оператор персональных данных» / «Оператор Сайта» |
| `legal_name` | string | ООО «Грасси» |
| `ogrn` | string | 1239100014548 |
| `inn` | string | 9102292969 |
| `address` | string | Республика Крым, г. Симферополь, ул. Кубанская, д. 25 |
| `email` | string | office@grassigrosso.com (renderer emits mailto from allowlist) |

## Page root fields (all three single types)

| Path | Type | Owner | Slot / notes |
|------|------|-------|--------------|
| `title` | string | cms | `.legal-page-title` / `<h1>` |
| `effective_date` | date | cms | code formats after prefix → `.legal-page-date` |
| `body` | ordered blocks | cms | `.legal-page-content` |
| display prefix «Дата последнего обновления:» | — | code | never a CMS field |
| Strapi system `updatedAt` / `createdAt` | — | code/system | not mapped to UI |

## Privacy (`privacy-page`)

Baseline `title`: Политика в отношении обработки персональных данных

Baseline `effective_date`: `2026-03-01` (from current copy; confirm at seed).

### Source stream matrix (one row per `h2` / `p` / `ul` / `table`)

| src# | tag | § / preview | CMS ownership | notes |
|------|-----|-------------|---------------|-------|
| 1 | `h2` | 1. Общие положения | → heading of body[0] | — |
| 2 | `p` | 1.1. Настоящая Политика (далее – «Политика») определяет порядок обработки и меры по об… | `body[0]` `paragraph` +heading | links=https://grassigrosso.com |
| 3 | `p` | 1.2. Оператор персональных данных: ООО «Грасси», ОГРН 1239100014548, ИНН 9102292969, а… | `body[1]` `operator` | links=mailto:office@grassigrosso.com; structured operator (not free-text requisites) |
| 4 | `p` | 1.3. Политика разработана с учетом требований законодательства Российской Федерации, в… | `body[2]` `paragraph` | — |
| 5 | `p` | 1.4. Оператор обеспечивает общедоступность Политики и размещает ее в сети Интернет по … | `body[3]` `paragraph` | — |
| 6 | `p` | 1.5. Предоставляя персональные данные через формы на Сайте и/или продолжая использован… | `body[4]` `paragraph` | — |
| 7 | `p` | 1.6. Если Пользователь не согласен с условиями Политики, он должен воздержаться от исп… | `body[5]` `paragraph` | — |
| 8 | `p` | 1.7. Политика применяется только к Сайту. Оператор не контролирует и не несет ответств… | `body[6]` `paragraph` | — |
| 9 | `h2` | 2. Термины и определения | → heading of body[7] | — |
| 10 | `p` | 2.1. Персональные данные – любая информация, относящаяся к прямо или косвенно определе… | `body[7]` `paragraph` +heading | — |
| 11 | `p` | 2.2. Обработка персональных данных – любое действие (операция) или совокупность действ… | `body[8]` `paragraph` | — |
| 12 | `p` | 2.3. Оператор – лицо, самостоятельно или совместно с другими лицами организующее и/или… | `body[9]` `paragraph` | — |
| 13 | `p` | 2.4. Пользователь – любое лицо, посещающее Сайт и/или использующее его функциональность. | `body[10]` `paragraph` | — |
| 14 | `p` | 2.5. Персональные данные, разрешенные субъектом для распространения – персональные дан… | `body[11]` `paragraph` | — |
| 15 | `p` | 2.6. Cookie-файлы – небольшие файлы, размещаемые на устройстве Пользователя при посеще… | `body[12]` `paragraph` | — |
| 16 | `h2` | 3. Права и обязанности Оператора | → heading of body[13] | — |
| 17 | `p` | 3.1. Оператор вправе: | `body[13]` `paragraph` +heading | — |
| 18 | `ul` | 4 ×li | `body[14]` `list` | items=4 |
| 19 | `p` | 3.2. Оператор обязан: | `body[15]` `paragraph` | — |
| 20 | `ul` | 5 ×li | `body[16]` `list` | items=5 |
| 21 | `h2` | 4. Права и обязанности субъектов персональных данных | → heading of body[17] | — |
| 22 | `p` | 4.1. Пользователь вправе: | `body[17]` `paragraph` +heading | — |
| 23 | `ul` | 5 ×li | `body[18]` `list` | items=5 |
| 24 | `p` | 4.2. Пользователь обязуется предоставлять достоверные данные и своевременно уведомлять… | `body[19]` `paragraph` | — |
| 25 | `h2` | 5. Принципы обработки персональных данных | → heading of body[20] | — |
| 26 | `p` | 5.1. Оператор придерживается следующих принципов обработки персональных данных: | `body[20]` `paragraph` +heading | — |
| 27 | `ul` | 8 ×li | `body[21]` `list` | items=8 |
| 28 | `h2` | 6. Категории субъектов, категории данных и цели обработки | → heading of body[22] | — |
| 29 | `p` | 6.1. Оператор обрабатывает персональные данные в рамках целей, оснований, категорий и … | `body[22]` `paragraph` +heading | — |
| 30 | `table` | Цель обработки \| Субъекты \| Персональные данные \| Способ \| Основание \| Срок хранения | `body[23]` `table` | headers=6 rows=9 |
| 31 | `h2` | 7. Условия обработки, конфиденциальность и передача третьим лицам | → heading of body[24] | — |
| 32 | `p` | 7.1. Оператор обеспечивает конфиденциальность персональных данных, за исключением случ… | `body[24]` `paragraph` +heading | — |
| 33 | `p` | 7.2. Оператор вправе поручать обработку персональных данных третьим лицам (обработчика… | `body[25]` `paragraph` | — |
| 34 | `p` | 7.3. К числу потенциальных категорий третьих лиц могут относиться: хостинг-провайдеры … | `body[26]` `paragraph` | — |
| 35 | `p` | 7.4. Оператор не продает персональные данные и не передает их третьим лицам для целей,… | `body[27]` `paragraph` | — |
| 36 | `p` | 7.5. В случае реорганизации, отчуждения бизнеса или передачи активов персональные данн… | `body[28]` `paragraph` | — |
| 37 | `h2` | 8. Локализация и трансграничная передача | → heading of body[29] | — |
| 38 | `p` | 8.1. При сборе персональных данных граждан РФ Оператор обеспечивает их первичную запис… | `body[29]` `paragraph` +heading | — |
| 39 | `p` | 8.2. Трансграничная передача персональных данных допускается при соблюдении требований… | `body[30]` `paragraph` | — |
| 40 | `h2` | 9. Обработка cookie и средств веб-аналитики | → heading of body[31] | — |
| 41 | `p` | 9.1. Сайт использует cookie и аналогичные технологии (включая пиксели/теги/SDK, если б… | `body[31]` `paragraph` +heading | — |
| 42 | `p` | 9.2. Категории cookie: | `body[32]` `paragraph` | — |
| 43 | `ul` | 4 ×li | `body[33]` `list` | items=4 |
| 44 | `p` | 9.3. Пользователь может ограничить использование cookie в настройках браузера. При это… | `body[34]` `paragraph` | — |
| 45 | `p` | 9.4. Если на Сайте реализован баннер/панель согласий, выбор Пользователя фиксируется и… | `body[35]` `paragraph` | — |
| 46 | `h2` | 10. Автоматизированная обработка и профилирование | → heading of body[36] | — |
| 47 | `p` | 10.1. Оператор может использовать автоматизированные средства обработки (включая систе… | `body[36]` `paragraph` +heading | — |
| 48 | `p` | 10.2. Оператор не принимает решения, порождающие юридические последствия для субъекта … | `body[37]` `paragraph` | — |
| 49 | `h2` | 11. Меры по обеспечению безопасности персональных данных | → heading of body[38] | — |
| 50 | `p` | 11.1. Оператор принимает необходимые правовые, организационные и технические меры для … | `body[38]` `paragraph` +heading | — |
| 51 | `p` | 11.2. Перечень мер может включать (в зависимости от применимых процессов и ИСПДн): | `body[39]` `paragraph` | — |
| 52 | `ul` | 9 ×li | `body[40]` `list` | items=9 |
| 53 | `h2` | 12. Порядок реализации прав субъектов и рассмотрения обращений | → heading of body[41] | — |
| 54 | `p` | 12.1. Пользователь может направить запрос, обращение или отзыв согласия по адресу элек… | `body[41]` `paragraph` +heading | links=mailto:office@grassigrosso.com |
| 55 | `p` | 12.2. Для идентификации заявителя Оператор вправе запросить дополнительные сведения, п… | `body[42]` `paragraph` | — |
| 56 | `p` | 12.3. Срок рассмотрения обращений – в пределах сроков, установленных законодательством… | `body[43]` `paragraph` | — |
| 57 | `p` | 12.4. В случае необходимости Оператор вправе продлить срок рассмотрения запроса в поря… | `body[44]` `paragraph` | — |
| 58 | `h2` | 13. Актуализация, исправление, блокирование и уничтожение персональных данных | → heading of body[45] | — |
| 59 | `p` | 13.1. В случае подтверждения факта неточности персональные данные подлежат актуализации. | `body[45]` `paragraph` +heading | — |
| 60 | `p` | 13.2. Персональные данные подлежат уничтожению или обезличиванию при достижении целей … | `body[46]` `paragraph` | — |
| 61 | `p` | 13.3. Уничтожение осуществляется способом, исключающим возможность восстановления соде… | `body[47]` `paragraph` | — |
| 62 | `h2` | 14. Обработка данных несовершеннолетних | → heading of body[48] | — |
| 63 | `p` | 14.1. Сайт не предназначен для целенаправленного использования лицами младше 14 лет. О… | `body[48]` `paragraph` +heading | — |
| 64 | `p` | 14.2. Если Оператору станет известно, что персональные данные несовершеннолетнего полу… | `body[49]` `paragraph` | — |
| 65 | `h2` | 15. Досудебный порядок урегулирования споров | → heading of body[50] | — |
| 66 | `p` | 15.1. До обращения в суд заинтересованная сторона обязана направить претензию на адрес… | `body[50]` `paragraph` +heading | links=mailto:office@grassigrosso.com |
| 67 | `p` | 15.2. Срок рассмотрения претензии – 30 календарных дней с даты получения, если иной ср… | `body[51]` `paragraph` | — |
| 68 | `h2` | 16. Заключительные положения | → heading of body[52] | — |
| 69 | `p` | 16.1. Оператор вправе вносить изменения в Политику. Новая редакция вступает в силу с м… | `body[52]` `paragraph` +heading | — |
| 70 | `p` | 16.2. Продолжение использования Сайта после вступления в силу новой редакции означает … | `body[53]` `paragraph` | — |
| 71 | `p` | 16.3. К настоящей Политике и отношениям, связанным с обработкой персональных данных, п… | `body[54]` `paragraph` | — |

### Source counts

| tag | count |
|-----|-------|
| `h2` | 16 |
| `p` | 48 |
| `ul` | 6 |
| `table` | 1 |
| **total source nodes** | **71** |

### CMS `body[]` counts (after h2→heading mapping)

| type | count |
|------|-------|
| `paragraph` | 47 |
| `operator` | 1 |
| `list` | 6 |
| `table` | 1 |
| **`body.length`** | **55** |
| **unowned source rows** | **0** |

### CMS `body[]` index map

| body# | type | heading | source tag# |
|-------|------|---------|-------------|
| 0 | `paragraph` | 1. Общие положения | p/ul/table src#2; h2 src#1 |
| 1 | `operator` | — | p/ul/table src#3 |
| 2 | `paragraph` | — | p/ul/table src#4 |
| 3 | `paragraph` | — | p/ul/table src#5 |
| 4 | `paragraph` | — | p/ul/table src#6 |
| 5 | `paragraph` | — | p/ul/table src#7 |
| 6 | `paragraph` | — | p/ul/table src#8 |
| 7 | `paragraph` | 2. Термины и определения | p/ul/table src#10; h2 src#9 |
| 8 | `paragraph` | — | p/ul/table src#11 |
| 9 | `paragraph` | — | p/ul/table src#12 |
| 10 | `paragraph` | — | p/ul/table src#13 |
| 11 | `paragraph` | — | p/ul/table src#14 |
| 12 | `paragraph` | — | p/ul/table src#15 |
| 13 | `paragraph` | 3. Права и обязанности Оператора | p/ul/table src#17; h2 src#16 |
| 14 | `list` | — | p/ul/table src#18 |
| 15 | `paragraph` | — | p/ul/table src#19 |
| 16 | `list` | — | p/ul/table src#20 |
| 17 | `paragraph` | 4. Права и обязанности субъектов персональных д… | p/ul/table src#22; h2 src#21 |
| 18 | `list` | — | p/ul/table src#23 |
| 19 | `paragraph` | — | p/ul/table src#24 |
| 20 | `paragraph` | 5. Принципы обработки персональных данных | p/ul/table src#26; h2 src#25 |
| 21 | `list` | — | p/ul/table src#27 |
| 22 | `paragraph` | 6. Категории субъектов, категории данных и цели… | p/ul/table src#29; h2 src#28 |
| 23 | `table` | — | p/ul/table src#30 |
| 24 | `paragraph` | 7. Условия обработки, конфиденциальность и пере… | p/ul/table src#32; h2 src#31 |
| 25 | `paragraph` | — | p/ul/table src#33 |
| 26 | `paragraph` | — | p/ul/table src#34 |
| 27 | `paragraph` | — | p/ul/table src#35 |
| 28 | `paragraph` | — | p/ul/table src#36 |
| 29 | `paragraph` | 8. Локализация и трансграничная передача | p/ul/table src#38; h2 src#37 |
| 30 | `paragraph` | — | p/ul/table src#39 |
| 31 | `paragraph` | 9. Обработка cookie и средств веб-аналитики | p/ul/table src#41; h2 src#40 |
| 32 | `paragraph` | — | p/ul/table src#42 |
| 33 | `list` | — | p/ul/table src#43 |
| 34 | `paragraph` | — | p/ul/table src#44 |
| 35 | `paragraph` | — | p/ul/table src#45 |
| 36 | `paragraph` | 10. Автоматизированная обработка и профилирование | p/ul/table src#47; h2 src#46 |
| 37 | `paragraph` | — | p/ul/table src#48 |
| 38 | `paragraph` | 11. Меры по обеспечению безопасности персональн… | p/ul/table src#50; h2 src#49 |
| 39 | `paragraph` | — | p/ul/table src#51 |
| 40 | `list` | — | p/ul/table src#52 |
| 41 | `paragraph` | 12. Порядок реализации прав субъектов и рассмот… | p/ul/table src#54; h2 src#53 |
| 42 | `paragraph` | — | p/ul/table src#55 |
| 43 | `paragraph` | — | p/ul/table src#56 |
| 44 | `paragraph` | — | p/ul/table src#57 |
| 45 | `paragraph` | 13. Актуализация, исправление, блокирование и у… | p/ul/table src#59; h2 src#58 |
| 46 | `paragraph` | — | p/ul/table src#60 |
| 47 | `paragraph` | — | p/ul/table src#61 |
| 48 | `paragraph` | 14. Обработка данных несовершеннолетних | p/ul/table src#63; h2 src#62 |
| 49 | `paragraph` | — | p/ul/table src#64 |
| 50 | `paragraph` | 15. Досудебный порядок урегулирования споров | p/ul/table src#66; h2 src#65 |
| 51 | `paragraph` | — | p/ul/table src#67 |
| 52 | `paragraph` | 16. Заключительные положения | p/ul/table src#69; h2 src#68 |
| 53 | `paragraph` | — | p/ul/table src#70 |
| 54 | `paragraph` | — | p/ul/table src#71 |

## Terms (`terms-page`)

Baseline `title`: Пользовательское соглашение

Baseline `effective_date`: `2026-03-01` (from current copy; confirm at seed).

### Source stream matrix (one row per `h2` / `p` / `ul` / `table`)

| src# | tag | § / preview | CMS ownership | notes |
|------|-----|-------------|---------------|-------|
| 1 | `h2` | 1. Общие положения | → heading of body[0] | — |
| 2 | `p` | 1.1. Настоящее Пользовательское соглашение (далее – «Соглашение») регулирует условия и… | `body[0]` `paragraph` +heading | links=https://grassigrosso.com |
| 3 | `p` | 1.2. Оператор Сайта: ООО «Грасси», ОГРН 1239100014548, ИНН 9102292969, адрес: Республи… | `body[1]` `operator` | links=mailto:office@grassigrosso.com; structured operator (not free-text requisites) |
| 4 | `p` | 1.3. Использование Сайта любым способом (включая просмотр страниц, отправку форм, офор… | `body[2]` `paragraph` | — |
| 5 | `p` | 1.4. Если Пользователь не согласен с условиями Соглашения, он обязан прекратить исполь… | `body[3]` `paragraph` | — |
| 6 | `h2` | 2. Термины | → heading of body[4] | — |
| 7 | `ul` | 4 ×li | `body[4]` `list` +heading | items=4; strong runs |
| 8 | `h2` | 3. Предмет Соглашения и функциональность | → heading of body[5] | — |
| 9 | `p` | 3.1. Сайт предоставляет информационные материалы о товарах/услугах и (при наличии) фун… | `body[5]` `paragraph` +heading | — |
| 10 | `p` | 3.2. Оператор вправе изменять структуру, дизайн, функциональность, перечень сервисов и… | `body[6]` `paragraph` | — |
| 11 | `p` | 3.3. Оператор вправе устанавливать дополнительные правила для отдельных сервисов (напр… | `body[7]` `paragraph` | — |
| 12 | `h2` | 4. Регистрация, учетные данные и безопасность | → heading of body[8] | — |
| 13 | `p` | 4.1. Некоторые функции Сайта могут требовать регистрации/создания учетной записи. | `body[8]` `paragraph` +heading | — |
| 14 | `p` | 4.2. Пользователь обязан обеспечивать конфиденциальность учетных данных и несет ответс… | `body[9]` `paragraph` | — |
| 15 | `p` | 4.3. Оператор вправе приостанавливать доступ к учетной записи при подозрении на компро… | `body[10]` `paragraph` | — |
| 16 | `h2` | 5. Правила использования Сайта | → heading of body[11] | — |
| 17 | `p` | 5.1. Пользователь обязуется использовать Сайт законно и добросовестно. | `body[11]` `paragraph` +heading | — |
| 18 | `p` | 5.2. Запрещается: | `body[12]` `paragraph` | — |
| 19 | `ul` | 5 ×li | `body[13]` `list` | items=5 |
| 20 | `p` | 5.3. Оператор вправе ограничивать доступ к Сайту или отдельным функциям при выявлении … | `body[14]` `paragraph` | — |
| 21 | `h2` | 6. Интеллектуальная собственность | → heading of body[15] | — |
| 22 | `p` | 6.1. Все права на Сайт и Контент принадлежат Оператору и/или соответствующим правообла… | `body[15]` `paragraph` +heading | — |
| 23 | `p` | 6.2. Пользователю предоставляется ограниченное, неисключительное, непередаваемое право… | `body[16]` `paragraph` | — |
| 24 | `p` | 6.3. Любое использование Контента вне рамок разрешенного законом или без письменного с… | `body[17]` `paragraph` | — |
| 25 | `h2` | 7. Пользовательский контент и отзывы | → heading of body[18] | — |
| 26 | `p` | 7.1. Направляя отзыв/фото/материалы, Пользователь гарантирует наличие необходимых прав… | `body[18]` `paragraph` +heading | — |
| 27 | `p` | 7.2. Публикация отзывов с указанием имени/фото осуществляется только при наличии отдел… | `body[19]` `paragraph` | — |
| 28 | `p` | 7.3. Оператор вправе модерировать и удалять отзывы/материалы, которые нарушают закон, … | `body[20]` `paragraph` | — |
| 29 | `h2` | 8. Заказы и платежи (в т.ч. будущая интеграция) | → heading of body[21] | — |
| 30 | `p` | 8.1. При подключении функциональности оформления заказов условия заказа, оплаты, доста… | `body[21]` `paragraph` +heading | — |
| 31 | `p` | 8.2. Оплата может осуществляться через сторонние платежные сервисы/банки. Оператор не … | `body[22]` `paragraph` | — |
| 32 | `p` | 8.3. Оператор вправе отказывать в принятии заказа/платежа при наличии законных основан… | `body[23]` `paragraph` | — |
| 33 | `h2` | 9. Ограничение ответственности | → heading of body[24] | — |
| 34 | `p` | 9.1. Сайт предоставляется «как есть». Оператор не гарантирует, что Сайт будет работать… | `body[24]` `paragraph` +heading | — |
| 35 | `p` | 9.2. Оператор не несет ответственности за: | `body[25]` `paragraph` | — |
| 36 | `ul` | 4 ×li | `body[26]` `list` | items=4 |
| 37 | `p` | 9.3. Никакие сведения на Сайте не являются публичной офертой, если прямо не указано ин… | `body[27]` `paragraph` | — |
| 38 | `h2` | 10. Конфиденциальность и персональные данные | → heading of body[28] | — |
| 39 | `p` | 10.1. Обработка персональных данных осуществляется в соответствии с Политикой в отноше… | `body[28]` `paragraph` +heading | links=/privacy |
| 40 | `p` | 10.2. Пользователь подтверждает, что ознакомился с Политикой и согласен с ее условиями… | `body[29]` `paragraph` | — |
| 41 | `h2` | 11. Форс-мажор | → heading of body[30] | — |
| 42 | `p` | 11.1. Стороны освобождаются от ответственности за частичное или полное неисполнение об… | `body[30]` `paragraph` +heading | — |
| 43 | `h2` | 12. Досудебный порядок и разрешение споров | → heading of body[31] | — |
| 44 | `p` | 12.1. Претензионный порядок обязателен. Претензии направляются на office@grassigrosso.… | `body[31]` `paragraph` +heading | links=mailto:office@grassigrosso.com |
| 45 | `p` | 12.2. Срок ответа на претензию – 30 календарных дней с даты получения, если иной срок … | `body[32]` `paragraph` | — |
| 46 | `p` | 12.3. Применимое право – право Российской Федерации. Подсудность определяется по месту… | `body[33]` `paragraph` | — |
| 47 | `p` | 12.4. При отсутствии урегулирования спор подлежит рассмотрению в суде в порядке, устан… | `body[34]` `paragraph` | — |
| 48 | `h2` | 13. Изменение Соглашения | → heading of body[35] | — |
| 49 | `p` | 13.1. Оператор вправе изменять Соглашение в одностороннем порядке, размещая новую реда… | `body[35]` `paragraph` +heading | — |
| 50 | `p` | 13.2. Продолжение использования Сайта после публикации новой редакции означает согласи… | `body[36]` `paragraph` | — |

### Source counts

| tag | count |
|-----|-------|
| `h2` | 13 |
| `p` | 34 |
| `ul` | 3 |
| **total source nodes** | **50** |

### CMS `body[]` counts (after h2→heading mapping)

| type | count |
|------|-------|
| `paragraph` | 33 |
| `operator` | 1 |
| `list` | 3 |
| **`body.length`** | **37** |
| **unowned source rows** | **0** |

### CMS `body[]` index map

| body# | type | heading | source tag# |
|-------|------|---------|-------------|
| 0 | `paragraph` | 1. Общие положения | p/ul/table src#2; h2 src#1 |
| 1 | `operator` | — | p/ul/table src#3 |
| 2 | `paragraph` | — | p/ul/table src#4 |
| 3 | `paragraph` | — | p/ul/table src#5 |
| 4 | `list` | 2. Термины | p/ul/table src#7; h2 src#6 |
| 5 | `paragraph` | 3. Предмет Соглашения и функциональность | p/ul/table src#9; h2 src#8 |
| 6 | `paragraph` | — | p/ul/table src#10 |
| 7 | `paragraph` | — | p/ul/table src#11 |
| 8 | `paragraph` | 4. Регистрация, учетные данные и безопасность | p/ul/table src#13; h2 src#12 |
| 9 | `paragraph` | — | p/ul/table src#14 |
| 10 | `paragraph` | — | p/ul/table src#15 |
| 11 | `paragraph` | 5. Правила использования Сайта | p/ul/table src#17; h2 src#16 |
| 12 | `paragraph` | — | p/ul/table src#18 |
| 13 | `list` | — | p/ul/table src#19 |
| 14 | `paragraph` | — | p/ul/table src#20 |
| 15 | `paragraph` | 6. Интеллектуальная собственность | p/ul/table src#22; h2 src#21 |
| 16 | `paragraph` | — | p/ul/table src#23 |
| 17 | `paragraph` | — | p/ul/table src#24 |
| 18 | `paragraph` | 7. Пользовательский контент и отзывы | p/ul/table src#26; h2 src#25 |
| 19 | `paragraph` | — | p/ul/table src#27 |
| 20 | `paragraph` | — | p/ul/table src#28 |
| 21 | `paragraph` | 8. Заказы и платежи (в т.ч. будущая интеграция) | p/ul/table src#30; h2 src#29 |
| 22 | `paragraph` | — | p/ul/table src#31 |
| 23 | `paragraph` | — | p/ul/table src#32 |
| 24 | `paragraph` | 9. Ограничение ответственности | p/ul/table src#34; h2 src#33 |
| 25 | `paragraph` | — | p/ul/table src#35 |
| 26 | `list` | — | p/ul/table src#36 |
| 27 | `paragraph` | — | p/ul/table src#37 |
| 28 | `paragraph` | 10. Конфиденциальность и персональные данные | p/ul/table src#39; h2 src#38 |
| 29 | `paragraph` | — | p/ul/table src#40 |
| 30 | `paragraph` | 11. Форс-мажор | p/ul/table src#42; h2 src#41 |
| 31 | `paragraph` | 12. Досудебный порядок и разрешение споров | p/ul/table src#44; h2 src#43 |
| 32 | `paragraph` | — | p/ul/table src#45 |
| 33 | `paragraph` | — | p/ul/table src#46 |
| 34 | `paragraph` | — | p/ul/table src#47 |
| 35 | `paragraph` | 13. Изменение Соглашения | p/ul/table src#49; h2 src#48 |
| 36 | `paragraph` | — | p/ul/table src#50 |

## Cookies (`cookies-page`)

Baseline `title`: Политика использования cookie-файлов

Baseline `effective_date`: `2026-03-01` (from current copy; confirm at seed).

### Source stream matrix (one row per `h2` / `p` / `ul` / `table`)

| src# | tag | § / preview | CMS ownership | notes |
|------|-----|-------------|---------------|-------|
| 1 | `h2` | 1. Общие положения | → heading of body[0] | — |
| 2 | `p` | 1.1. Настоящая Политика описывает использование cookie-файлов и аналогичных технологий… | `body[0]` `paragraph` +heading | links=https://grassigrosso.com |
| 3 | `p` | 1.2. Cookie могут относиться к информации, которая при определенных условиях может быт… | `body[1]` `paragraph` | links=/privacy |
| 4 | `h2` | 2. Что такое cookie и аналогичные технологии | → heading of body[2] | — |
| 5 | `p` | 2.1. Cookie – небольшие файлы, которые сохраняются в браузере Пользователя при посещен… | `body[2]` `paragraph` +heading | — |
| 6 | `p` | 2.2. Аналогичные технологии могут включать пиксели, теги, идентификаторы устройств и S… | `body[3]` `paragraph` | — |
| 7 | `h2` | 3. Категории cookie | → heading of body[4] | — |
| 8 | `p` | 3.1. На Сайте могут использоваться следующие категории: | `body[4]` `paragraph` +heading | — |
| 9 | `ul` | 4 ×li | `body[5]` `list` | items=4; strong runs |
| 10 | `h2` | 4. Таблица cookie по назначению | → heading of body[6] | — |
| 11 | `table` | Категория \| Назначение \| Примеры \| Правовое основание | `body[6]` `table` +heading | headers=4 rows=4 |
| 12 | `h2` | 5. Сроки хранения cookie | → heading of body[7] | — |
| 13 | `p` | 5.1. Сеансовые cookie действуют до закрытия браузера. | `body[7]` `paragraph` +heading | — |
| 14 | `p` | 5.2. Постоянные cookie могут храниться дольше, но не более срока, необходимого для дос… | `body[8]` `paragraph` | — |
| 15 | `h2` | 6. Управление cookie и отказ | → heading of body[9] | — |
| 16 | `p` | 6.1. Пользователь может управлять cookie через настройки браузера (удаление, блокировк… | `body[9]` `paragraph` +heading | — |
| 17 | `p` | 6.2. Ограничение cookie может привести к некорректной работе отдельных функций Сайта (… | `body[10]` `paragraph` | — |
| 18 | `p` | 6.3. При наличии на Сайте панели согласий Пользователь может изменить выбор категорий … | `body[11]` `paragraph` | — |
| 19 | `h2` | 7. Использование Яндекс.Метрики и иных систем аналитики | → heading of body[12] | — |
| 20 | `p` | 7.1. На Сайте используется сервис веб-аналитики Яндекс.Метрика и могут использоваться … | `body[12]` `paragraph` +heading | — |
| 21 | `p` | 7.2. Оператор стремится использовать настройки, минимизирующие риски идентификации (на… | `body[13]` `paragraph` | — |
| 22 | `p` | 7.3. Пользователь может отключить сбор данных аналитики посредством запрета соответств… | `body[14]` `paragraph` | — |
| 23 | `h2` | 8. Заключительные положения | → heading of body[15] | — |
| 24 | `p` | 8.1. Оператор вправе изменять настоящую Политику, размещая новую редакцию на Сайте. | `body[15]` `paragraph` +heading | — |
| 25 | `p` | 8.2. К Политике применяется право Российской Федерации. | `body[16]` `paragraph` | — |

### Source counts

| tag | count |
|-----|-------|
| `h2` | 8 |
| `p` | 15 |
| `ul` | 1 |
| `table` | 1 |
| **total source nodes** | **25** |

### CMS `body[]` counts (after h2→heading mapping)

| type | count |
|------|-------|
| `paragraph` | 15 |
| `list` | 1 |
| `table` | 1 |
| **`body.length`** | **17** |
| **unowned source rows** | **0** |

### CMS `body[]` index map

| body# | type | heading | source tag# |
|-------|------|---------|-------------|
| 0 | `paragraph` | 1. Общие положения | p/ul/table src#2; h2 src#1 |
| 1 | `paragraph` | — | p/ul/table src#3 |
| 2 | `paragraph` | 2. Что такое cookie и аналогичные технологии | p/ul/table src#5; h2 src#4 |
| 3 | `paragraph` | — | p/ul/table src#6 |
| 4 | `paragraph` | 3. Категории cookie | p/ul/table src#8; h2 src#7 |
| 5 | `list` | — | p/ul/table src#9 |
| 6 | `table` | 4. Таблица cookie по назначению | p/ul/table src#11; h2 src#10 |
| 7 | `paragraph` | 5. Сроки хранения cookie | p/ul/table src#13; h2 src#12 |
| 8 | `paragraph` | — | p/ul/table src#14 |
| 9 | `paragraph` | 6. Управление cookie и отказ | p/ul/table src#16; h2 src#15 |
| 10 | `paragraph` | — | p/ul/table src#17 |
| 11 | `paragraph` | — | p/ul/table src#18 |
| 12 | `paragraph` | 7. Использование Яндекс.Метрики и иных систем а… | p/ul/table src#20; h2 src#19 |
| 13 | `paragraph` | — | p/ul/table src#21 |
| 14 | `paragraph` | — | p/ul/table src#22 |
| 15 | `paragraph` | 8. Заключительные положения | p/ul/table src#24; h2 src#23 |
| 16 | `paragraph` | — | p/ul/table src#25 |

## Table contracts

### Privacy table (`body[23]`)

Headers (exact, unique): `Цель обработки` · `Субъекты` · `Персональные данные` · `Способ` · `Основание` · `Срок хранения`

Data rows: **9** (from current JSX).

### Cookies table (`body[6]`)

Headers (exact, unique): `Категория` · `Назначение` · `Примеры` · `Правовое основание`

Data rows: **4**.

Terms: **no table**.

## Visual slots → ownership

| Slot | Owner | Source |
|------|-------|--------|
| `.legal-page` / section chrome | code | `LegalPage` + CSS |
| `.legal-page-title` | cms `title` | |
| `.legal-page-date` | code prefix + cms `effective_date` | |
| `.legal-page-content` | cms `body[]` | |
| `.legal-table-wrap` / `.legal-table` | code structure; cms headers/cells | |
| `data-label` on `<td>` | **code** from headers | |
| Full HTML SSR body | **fallback** (mandatory) | parity-gated vs `LEGAL_PAGES`; generator optional implementation |

## Reject matrix (atomic)

| Condition | Result |
|-----------|--------|
| Unknown `body[].type` | reject payload |
| Unknown run `type` | reject |
| Extra / unknown root, block, item, cell, or run field | reject |
| `text.strong` missing or non-boolean | reject |
| `link.children` not a non-empty array of `text` runs | reject |
| `headers` not unique within a table | reject |
| `headers.length !== cells.length` for any row | reject |
| Empty required structured operator field | reject |
| `href` not exact allowlist match | reject |
| CMS attribute named `updatedAt` in legal page schema | schema/contract FAIL (Phase B harness) |
| Raw HTML string field for body | forbidden |

**Not in reject matrix:** vague “duplicate keys” on blocks/items/rows/runs — those are arrays; identity is order. JSON object property uniqueness is inherent to parse.

## Dual-source / parity (L14) — locked

| Artifact | Role |
|----------|------|
| `LEGAL_PAGES` (TSX defaults) | Runtime fallback + preferred generator **input** |
| `privacy.html` / `terms.html` / `cookies.html` | **Mandatory** full SSR first paint |
| Strict parity gate | **Required:** FAIL if SSR legal body ≠ `LEGAL_PAGES` (normalized). Always runs, including when HTML is generator output |
| Generator (optional Phase D) | May emit SSR HTML from `LEGAL_PAGES` to remove hand sync; **does not** replace or waive parity |

## DOM gate expectations (Phase D/E — contracted now)

1. First paint shows full legal content **before** `/api/pages/:slug` resolves.
2. After success: title / date / sections / table / links match CMS (within merge rules).
3. After failure/timeout: fallback content remains; no blank legal body.
4. Mobile: table cells expose labels (renderer `data-label`).
5. No `innerHTML`-injected CMS HTML; links only exact allowlisted hrefs.

## Allowlist expansion (C)

| Slug | Wave |
|------|------|
| index, hotels, dealers, contacts, documents, download-catalog | 1 (must not regress) |
| privacy, terms, cookies | 6 (new) |

## Unowned rows

**0** for all source `h2`/`p`/`ul`/`table` nodes on privacy (71), terms (50), cookies (25). Deferred outside Phase 6: form checkbox `#privacy` UX; email routing.

## Phase A affirm checklist

- [ ] Mechanical source matrices + CMS counts accepted (`unowned=0`)
- [ ] Exact inline JSON (`text.strong` required; `link.children` = text-run array only) accepted
- [ ] Exact three-href allowlist accepted
- [ ] L14 = mandatory full SSR + strict parity (generator optional, parity non-waivable) accepted
- [ ] No vague duplicate-keys rule; uniqueness = table headers + inherent JSON object keys accepted
- [ ] Operator-as-block + `effective_date` + code-owned prefix accepted
- [ ] Nine-slug expansion + separate phase-6 gate accepted
- [ ] **Explicit:** Phase B / code / commit still **not** started

---

*Phase A contract draft v2.1 (mechanical matrix): 2026-08-04 — awaiting affirm*
