# Catalog filter help content — design spec

**Date:** 2026-06-16  
**Status:** implemented (2026-06-16)  
**Figma:** [all modals](https://www.figma.com/design/9s3rK95Qbu9D7sKVP6Fs0e/Untitled?node-id=132-2113) · [«Если коротко» block](https://www.figma.com/design/9s3rK95Qbu9D7sKVP6Fs0e/Untitled?node-id=131-154)

## Problem

В каталоге 8 модалок «Как выбрать?» (по одной на каждый фильтр). Сейчас:

- в Strapi есть `catalog-filter-help` с repeatable `segments` (`body` + optional `photo`), но **контент пустой**;
- фронт рендерит каждый сегмент как plain `<p>` без типографики Figma;
- в JS остаются **lorem fallback**-абзацы (`catalog-filter-help-modal.ts`);
- блок **«Если коротко»** из Figma не смоделирован в админке и не отрисовывается.

Пользователь подготовил финальные тексты в Figma — нужно завести их в Strapi и отобразить в модалке с вёрсткой макета.

## Constraints / invariants

- Фронт **не ходит в Strapi напрямую** — только `GET /api/catalog/filters` → `catalog-filter-feed`.
- Контент на prod попадает через **seed `data.db` + snapshot JSON** (`public/catalog-filters.snapshot.json`).
- Share-help (`favouritesShare`, `productShare`) — отдельная сущность `catalog-share-help`; **не меняем** в этой задаче.
- Модалка — legacy DOM runtime (`catalog-filter-help-modal.ts`), не React island.
- Безопасность: **не** использовать `innerHTML` с произвольным HTML из админки; допустим ограниченный markdown-подмнож (`**bold**`) с whitelist-рендером.

## Figma inventory (8 modals)

| `filter_key` | Заголовок в Figma | Заголовок в коде сейчас | «Если коротко» в Figma |
|---|---|---|---|
| `collection` | Как выбрать коллекцию | совпадает | **да** (4 пункта: Classic / Flexi / Relax / Trend) |
| `size` | Как выбрать размер | совпадает | нет |
| `firmness` | Как выбрать жёсткость | совпадает | нет |
| `type` | Как выбрать тип конструкции | совпадает | нет |
| `loadRange` | Как выбрать нагрузку | совпадает | нет |
| `heightRange` | Как выбрать высоту матраса | совпадает | нет |
| `fillings` | **Как выбрать состав** | Как выбрать **наполнитель** | нет |
| `features` | **Как выбрать доп. особенности** | Как выбрать **особенности** | нет |

### Типографика и блоки внутри модалки (общий паттерн)

1. **Заголовок модалки** — Bounded Light 32px / `#283e37` (уже есть `.catalogue-new-filter-help-modal-title`).
2. **«Если коротко»** (только collection в макете, но поле нужно у всех 8):
   - фон `#f9f2dd`, левый бордер 3px `#f2e6c9`, radius 16px, padding 20×24;
   - заголовок блока «Если коротко» — Bounded Regular 19px;
   - список: маркер 6px, текст 15px, **жирный акцент** в конце строки (Classic, Flexi…).
3. **Intro** — Nunito 18px / line-height 28px, допускает inline bold.
4. **Section heading** — Bounded Regular 21px, отступ сверху +16px.
5. **Paragraph** — Nunito 17px / 26px, inline bold.
6. **Bullet list** — маркер 8px, gap 12px, bold prefix + текст (размеры 90×200…, виды пружин…).
7. **Numbered list** — только в «жёсткость» (1/2/3, Unbounded 17px + bold lead).

### Расположение «Если коротко» — расхождение с Figma

В макете collection блок «Если коротко» стоит **в конце** body.  
**Требование заказчика:** в продукте блок размещать **сразу после заголовка модалки** (первым элементом body, до intro/основного текста).

## Root cause

Текущая модель `filter-help-segment { body, photo }` рассчитана на плоские абзацы без:

- типов блоков (intro / heading / list);
- inline bold;
- summary-callout;
- нумерованных списков.

## Proposed data contract

Расширяем ответ `filterHelp` в `GET /api/catalog/filters`:

```json
{
  "filterHelp": {
    "collection": {
      "modalTitle": "Как выбрать коллекцию",
      "summary": {
        "title": "Если коротко",
        "items": [
          { "lead": "Нужен надёжный базовый матрас — ", "highlight": "Classic" },
          { "lead": "Нужен беспружинный матрас с акцентом на анатомичность пен — ", "highlight": "Flexi" }
        ]
      },
      "segments": [
        { "variant": "intro", "text": "Коллекции — это не про дизайн..." },
        { "variant": "paragraph", "text": "**Classic** — базовая коллекция..." },
        { "variant": "heading", "text": "Точность размеров" },
        { "variant": "listItem", "text": "**90×200** — стандартное односпальное..." },
        { "variant": "numberedListItem", "listIndex": 1, "text": "**Вы сомневаетесь в выборе.** Можно..." }
      ]
    }
  }
}
```

`summary` опционален (пустой/отсутствует → блок не рендерим).  
`segments[].variant` enum:

| variant | Назначение |
|---|---|
| `intro` | lead-параграф 18px |
| `heading` | подзаголовок секции 21px Bounded |
| `paragraph` | обычный текст 17px |
| `listItem` | элемент маркированного списка |
| `numberedListItem` | элемент нумерованного списка (`listIndex` 1…n) |

Inline bold в `text`: только `**фрагмент**` → `<strong>`.

## Strapi admin model

### Новый component `catalog.filter-help-summary-item`

| Field | Type | Notes |
|---|---|---|
| `lead` | text | текст до акцента |
| `highlight` | string | жирный акцент в конце (Classic, Flexi…) |

### Расширение `catalog-filter-help`

| Field | Type | Notes |
|---|---|---|
| `summary_title` | string | default «Если коротко» |
| `summary_items` | component[] `filter-help-summary-item` | optional |
| `segments` | (existing) + новые поля ниже | |

### Расширение `catalog.filter-help-segment`

| Field | Type | Notes |
|---|---|---|
| `variant` | enum | intro / heading / paragraph / listItem / numberedListItem; default `paragraph` |
| `list_index` | integer | только для numberedListItem |
| `body` | text | unchanged field name in DB; maps to API `text` |

RU labels в `strapi-catalog/src/admin/translations/ru.json`.

## Frontend rendering

Файл `src/catalog/catalog-filter-help-modal.ts`:

1. `renderHelpBody()` — сначала summary (если есть items), затем segments.
2. Новый helper `parseHelpInlineBold(text)` — безопасный парс `**…**`.
3. Группировка подряд идущих `listItem` / `numberedListItem` в `<ul>` / `<ol>`.
4. Убрать lorem defaults для filter keys после seed (fallback только на пустой body + console warn, или минимальный «Контент скоро появится» — **на согласование**).

CSS `src/styles/catalog-page.css`:

- `.catalogue-new-filter-help-modal-summary` — callout по Figma;
- variant-классы для intro / heading / list;
- **ширина dialog не меняем** — остаётся `min(560px, 100%)`;
- padding/spacing подгоняем под 560px контейнер.

## Content seed strategy

- Одноразовый idempotent bootstrap `seed-catalog-filter-help-content.js` (или JSON + importer) с **полным текстом из Figma** для всех 8 modals.
- Bootstrap **не перезаписывает** записи, если `segments.length > 0` (редакции в админке сохраняются).
- После seed: `npm run strapi:sync-seed` → `npm run catalog:export-snapshot` → commit `data.db` + snapshot.

## Success criteria

- [ ] В админке у каждой «Подсказки к фильтру» есть блок «Если коротко» (title + repeatable items).
- [ ] У сегментов есть выбор типа блока (intro / heading / paragraph / list / numbered).
- [ ] Все 8 modals показывают тексты из Figma (не lorem).
- [ ] «Если коротко» у collection — **под заголовком**, до основного текста.
- [ ] Типографика визуально соответствует Figma (callout, headings, lists, bold).
- [ ] `GET /api/catalog/filters` и snapshot содержат новые поля.
- [ ] `npm run check:catalog-api` + ручной smoke `/catalog` → открыть каждый «Как выбрать?».

## Phase 0 decisions (2026-06-16)

| # | Решение |
|---|---|
| 1 | **Заголовки modals** `fillings` / `features` → как в Figma: «Как выбрать состав», «Как выбрать доп. особенности» (см. таблицу «Где меняется» ниже) |
| 2 | **«Если коротко»** — у **всех 8** фильтров, тексты генерируем/заполняем (не пустые поля) |
| 3 | **Fallback** — контент не должен быть пустым нигде; seed + snapshot обязаны содержать полный набор |
| 4 | **Ширина модалки** — **оставляем 560px** (текущая), Figma 640px не переносим |

### Где меняется заголовок «Как выбрать …»

Речь **не** о названии секции фильтра в сайдбаре (там уже «Состав / Наполнитель» и «Доп. особенности»). Меняется **заголовок внутри модалки** при клике «Как выбрать?»:

| Место | Сейчас | Станет (Figma) |
|---|---|---|
| Strapi `modal_title` у `fillings` | Как выбрать наполнитель | **Как выбрать состав** |
| Strapi `modal_title` у `features` | Как выбрать особенности | **Как выбрать доп. особенности** |
| `aria-label` кнопки помощи (accessibility) | то же | синхронно с modal_title |
| JS fallback defaults | то же | синхронно |
| Bootstrap seed titles | то же | синхронно |

Сайдбар (`title: 'Состав / Наполнитель'`) **не трогаем** — он уже совпадает по смыслу.

## «Если коротко» — черновики для 7 фильтров (на согласование)

Collection — из Figma as-is. Остальные — сжатие основного текста Figma в формат lead + **highlight**:

### size
1. Замеряйте **внутреннюю нишу** кровати, не внешний габарит — **точный размер**
2. Одному человеку стандарт — **90×200**
3. Пара в обычном телосложении — **160×200**
4. Нужна вся ширина без «потерь» на борт — **беспружинный** (нет периметра 8+8 см)

### firmness
1. Спите на спине — **средний или мягкий** комфорт
2. Спите на боку — **мягкий**
3. Универсальный выбор — **средний**
4. В паре разные предпочтения — **разная жёсткость сторон** или два Twin

### type
1. Амортизация и доступная анатомичность — **пружинный**
2. Не чувствовать движения партнёра, вся ширина рабочая — **беспружинный**
3. Максимальная точечная поддержка на пружинах — **мультипокет**
4. Подстроить уже имеющийся матрас — **топер**

### loadRange
1. Нагрузка указана **на одно спальное место**, не суммарно на пару
2. Есть запас по бюджету — берите **с запасом по нагрузке**
3. Большой вес — **жёстче среднего** + усиленный периметр
4. Дети прыгают на кровати — надёжнее **беспружинный**

### heightRange
1. Сначала — **допустимая высота у производителя кровати**
2. Взрослый стандарт — **20–30 см**, чаще всего **25 см**
3. Кровать требует 16–18 см — **беспружинные**
4. Высота в карточке — **вместе с чехлом**

### fillings
1. Нужна жёсткость и изоляция от пружин — **кокосовая койра**
2. Повышенная нагрузка и ресурс — **нано-пена**
3. Максимальное расслабление — **пена с эффектом памяти**
4. Премиум и долговечность — **элакс / натуральный латекс**

### features
1. Стирка чехла дома — **съёмный чехол** с наволочкой и разъёмной молнией
2. Садитесь на край / большой вес — **усиленный периметр (~10 см)**
3. Сомневаетесь в жёсткости — **разная жёсткость сторон**
4. «Зима-лето» — смотрите **реальный состав стёжки**, не только ярлык

## Out of scope

- Share-help modals (ссылки на подборку/позицию).
- React-migration модалки.
- Rich-text WYSIWYG / HTML из админки.
- Изображения в сегментах (поле `photo` остаётся, в Figma нет картинок).
