#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const importDir = path.join(root, 'docs/catalog-import')
const productsDir = path.join(importDir, 'products')
const previewPath = path.join(importDir, 'preview.html')

const LABELS = {
  collection: {
    classic: 'Classic',
    flexi: 'Flexi',
    relax: 'Relax',
    trend: 'Trend',
    topper: 'Топеры',
  },
  firmness: {
    soft: 'Мягкий',
    medium: 'Средний',
    hard: 'Жесткий',
    dualFirmness: 'Разная жесткость сторон',
  },
  mattress_type: {
    spring: 'Пружинный',
    nospring: 'Беспружинный',
    topper: 'Топер',
    doubleSided: 'Двухсторонние',
    singleSided: 'Односторонние',
  },
  load_range: {
    upTo120: 'до 120 кг',
    upTo160: 'до 160 кг',
    upTo180: 'до 180 кг',
    over160: 'Без ограничений',
  },
  height_range: {
    low: 'Компактные до 16 см',
    mid: 'Средние 16–22 см',
    high: 'Высокие от 23 см',
  },
  fillings: {
    coir: 'Кокосовая койра',
    latex: 'Латекс',
    orthoFoam: 'Высокоэластичная пена',
    memoryEffect: 'С эффектом памяти',
    nanoFoam: 'Пена повышенной плотности',
    forplit: 'Форплит',
  },
  features: {
    removableCover: 'Съемный чехол',
    winterSummer: 'Эффект зима-лето',
    edgeSupport: 'Усиленный периметр',
  },
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return null

  const data = {}
  const lines = match[1].split('\n')
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const kv = line.match(/^([a-z_0-9]+):\s*(.*)$/)
    if (!kv) {
      index += 1
      continue
    }

    const key = kv[1]
    const raw = kv[2].trim()

    if (raw === '') {
      const items = []
      index += 1
      while (index < lines.length && lines[index].startsWith('- ')) {
        items.push(lines[index].slice(2).trim())
        index += 1
      }
      data[key] = items
      continue
    }

    if (raw === 'null') data[key] = null
    else if (raw.startsWith('[') && raw.endsWith(']')) {
      data[key] = raw
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    } else if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      data[key] = raw.slice(1, -1)
    } else if (/^-?\d+$/.test(raw)) {
      data[key] = Number(raw)
    } else {
      data[key] = raw
    }

    index += 1
  }

  const body = match[2]
  const coverMatch = body.match(/## Чехол\r?\n([\s\S]*?)(?=\r?\n## |\s*$)/)
  const layersMatch = body.match(/## Наполнение \(полный список для модалки\)\r?\n([\s\S]*?)(?=\r?\n## |\s*$)/)
  const notesMatch = body.match(/## Примечания маппинга\r?\n([\s\S]*?)(?=\r?\n## |\s*$)/)

  data.cover = coverMatch ? coverMatch[1].trim() : ''
  data.layers = layersMatch
    ? layersMatch[1]
        .split('\n')
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
    : []
  data.mapping_notes = notesMatch
    ? notesMatch[1]
        .split('\n')
        .map((line) => line.replace(/^-\s*/, '').trim())
        .filter(Boolean)
    : []

  return data
}

function label(group, slug) {
  return LABELS[group]?.[slug] || slug
}

function formatSizes(sizes) {
  return (sizes || [])
    .map((size) => String(size).replace('x', ' × '))
    .join(', ')
}

function buildModalPreview(product) {
  const rows = [
    ['Жесткость', label('firmness', product.firmness)],
    ['Тип матраса', label('mattress_type', product.mattress_type)],
    [
      'Высота',
      product.height_cm
        ? `${product.height_cm} см (${label('height_range', product.height_range)})`
        : label('height_range', product.height_range),
    ],
    ['Нагрузка', label('load_range', product.load_range)],
    ['Размер', formatSizes(product.sizes)],
    [
      'Наполнители (slug)',
      (product.filling_slugs || []).map((slug) => label('fillings', slug)).join(', '),
    ],
    [
      'Особенности',
      (product.features || []).map((slug) => label('features', slug)).join(', ') || '—',
    ],
  ]
  return rows
}

const products = fs
  .readdirSync(productsDir)
  .filter((file) => file.endsWith('.md'))
  .map((file) => parseFrontmatter(fs.readFileSync(path.join(productsDir, file), 'utf8')))
  .filter(Boolean)
  .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
  .map((product) => ({
    ...product,
    collection_label: label('collection', product.collection),
    modal_preview: buildModalPreview(product),
    layers_modal_text: (product.layers || []).map((line, index) => `${index + 1}. ${line}`).join('\n'),
  }))

const generatedAt = new Date().toISOString()

const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Тестовый каталог — валидация импорта</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f1ec;
      --card: #fff;
      --text: #1f2933;
      --muted: #6b7280;
      --line: #e5e7eb;
      --accent: #2f6b5d;
      --chip: #eef5f2;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 15px/1.5 "Segoe UI", system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    .wrap { max-width: 1400px; margin: 0 auto; padding: 24px; }
    header {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 20px 24px;
      margin-bottom: 20px;
    }
    header h1 { margin: 0 0 8px; font-size: 24px; }
    header p { margin: 0; color: var(--muted); }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-top: 16px;
    }
    input[type="search"] {
      flex: 1 1 240px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      border-radius: 10px;
      font: inherit;
    }
    .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .chip {
      border: 1px solid var(--line);
      background: var(--card);
      border-radius: 999px;
      padding: 8px 14px;
      cursor: pointer;
      font: inherit;
    }
    .chip.is-active { background: var(--accent); color: #fff; border-color: var(--accent); }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 20px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .card img {
      width: 100%;
      aspect-ratio: 1;
      object-fit: contain;
      background: #fafafa;
      border-bottom: 1px solid var(--line);
    }
    .card-body { padding: 16px 18px 18px; display: grid; gap: 12px; }
    .card h2 { margin: 0; font-size: 20px; }
    .meta { color: var(--muted); font-size: 13px; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag {
      background: var(--chip);
      color: var(--accent);
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      border-top: 1px solid var(--line);
      padding: 6px 0;
      vertical-align: top;
      text-align: left;
    }
    th { width: 38%; color: var(--muted); font-weight: 600; }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--muted);
      margin: 0;
    }
    .layers, .notes {
      margin: 0;
      padding-left: 18px;
      font-size: 13px;
    }
    .modal-box {
      background: #f8faf9;
      border: 1px dashed #c7d7d1;
      border-radius: 12px;
      padding: 12px;
    }
    .empty {
      padding: 40px;
      text-align: center;
      color: var(--muted);
    }
    code { font-size: 12px; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>Тестовый каталог для валидации</h1>
      <p>${products.length} товаров из <code>docs/catalog-import/products/*.md</code>. Сгенерировано: ${generatedAt}</p>
      <div class="toolbar">
        <input id="search" type="search" placeholder="Поиск по названию или slug…" />
        <div class="chips" id="collection-chips"></div>
      </div>
    </header>
    <div class="grid" id="grid"></div>
    <p class="empty" id="empty" hidden>Ничего не найдено</p>
  </div>
  <script>
    const PRODUCTS = ${JSON.stringify(products)};
    const COLLECTIONS = ['all', ...Array.from(new Set(PRODUCTS.map((p) => p.collection))).sort()];

    const grid = document.getElementById('grid');
    const empty = document.getElementById('empty');
    const search = document.getElementById('search');
    const chipsRoot = document.getElementById('collection-chips');

    let activeCollection = 'all';

    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    }

    function renderTable(rows) {
      return '<table><tbody>' + rows.map(([label, value]) =>
        '<tr><th>' + escapeHtml(label) + '</th><td>' + escapeHtml(value) + '</td></tr>'
      ).join('') + '</tbody></table>';
    }

    function renderCard(product) {
      const layers = (product.layers || []).map((line, index) => '<li>' + escapeHtml((index + 1) + '. ' + line) + '</li>').join('');
      const notes = (product.mapping_notes || []).map((line) => '<li>' + escapeHtml(line) + '</li>').join('');
      const tags = (product.tags || []).map((tag) => '<span class="tag">' + escapeHtml(tag) + '</span>').join('');
      const imagePath = String(product.image || '').replace(/^images\\//, 'images/');

      return '<article class="card" data-collection="' + escapeHtml(product.collection) + '">' +
        '<img src="' + escapeHtml(imagePath) + '" alt="' + escapeHtml(product.image_alt || product.name) + '" width="1034" height="1034" loading="lazy" />' +
        '<div class="card-body">' +
          '<div><h2>' + escapeHtml(product.name) + '</h2>' +
          '<div class="meta"><code>' + escapeHtml(product.slug) + '</code> · ' + escapeHtml(product.collection_label) + ' · ' + escapeHtml(product.source_pdf) + '</div></div>' +
          '<div class="tags">' + tags + '</div>' +
          '<div><p class="section-title">Параметры (Strapi / фильтры)</p>' + renderTable([
            ['Коллекция', product.collection + ' → ' + product.collection_label],
            ['Жёсткость', product.firmness_side1 != null ? (product.firmness_side1 + '/10 · ' + product.firmness_side2 + '/10 → ' + product.firmness) : product.firmness],
            ['Высота', product.height_cm + ' см → ' + product.height_range],
            ['Нагрузка', product.max_load_kg + ' кг → ' + product.load_range],
            ['Тип', product.mattress_type],
            ['Наполнители (slug)', (product.filling_slugs || []).join(', ') || '—'],
            ['Особенности', (product.features || []).join(', ') || '—'],
            ['Размеры', (product.sizes || []).join(', ')],
          ]) + '</div>' +
          '<div><p class="section-title">Чехол</p><div>' + escapeHtml(product.cover || '—') + '</div></div>' +
          '<div><p class="section-title">Наполнение — полный список (модалка)</p><ol class="layers">' + layers + '</ol></div>' +
          '<div class="modal-box"><p class="section-title">Как в модалке каталога (slug-лейблы)</p>' + renderTable(product.modal_preview) + '</div>' +
          (notes ? '<div><p class="section-title">Примечания маппинга</p><ul class="notes">' + notes + '</ul></div>' : '') +
        '</div>' +
      '</article>';
    }

    function render() {
      const query = search.value.trim().toLowerCase();
      const filtered = PRODUCTS.filter((product) => {
        if (activeCollection !== 'all' && product.collection !== activeCollection) return false;
        if (!query) return true;
        const hay = [product.name, product.slug, product.collection, ...(product.tags || [])].join(' ').toLowerCase();
        return hay.includes(query);
      });

      grid.innerHTML = filtered.map(renderCard).join('');
      empty.hidden = filtered.length > 0;
    }

    function renderChips() {
      chipsRoot.innerHTML = COLLECTIONS.map((collection) => {
        const label = collection === 'all' ? 'Все' : collection;
        const active = collection === activeCollection ? ' is-active' : '';
        return '<button type="button" class="chip' + active + '" data-collection="' + collection + '">' + label + '</button>';
      }).join('');
    }

    chipsRoot.addEventListener('click', (event) => {
      const button = event.target.closest('[data-collection]');
      if (!button) return;
      activeCollection = button.dataset.collection;
      renderChips();
      render();
    });

    search.addEventListener('input', render);
    renderChips();
    render();
  </script>
</body>
</html>`

fs.writeFileSync(previewPath, html, 'utf8')
console.log(`Wrote ${previewPath} (${products.length} products)`)
