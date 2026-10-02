#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const {
  SUMMARY_TITLE,
  CATALOG_FILTER_HELP_CONTENT,
} = require('../strapi-catalog/src/api/catalog/utils/seed-catalog-filter-help-content-data.js')
const { mapFilterHelpRows } = require('../strapi-catalog/src/api/catalog/utils/map-help-rows.js')
const {
  COPY_REVISION_MARKER,
  seedCatalogFilterHelpContent,
} = require('../strapi-catalog/src/api/catalog/utils/seed-catalog-filter-help-content.js')

const failures = []
function check(cond, message) {
  if (!cond) failures.push(message)
}

const EXPECTED_KEYS = [
  'collection',
  'size',
  'firmness',
  'type',
  'loadRange',
  'heightRange',
  'fillings',
  'features',
]

const EXPECTED_TITLES = {
  collection: 'Как выбрать коллекцию',
  size: 'Как выбрать размер',
  firmness: 'Как выбрать жёсткость',
  type: 'Как выбрать тип конструкции',
  loadRange: 'Как выбрать нагрузку',
  heightRange: 'Как выбрать высоту матраса',
  fillings: 'Как выбрать состав',
  features: 'Как выбрать доп. особенности',
}

const REQUIRED_PHRASES = {
  collection: ['Classic → Trend → Relax / Flexi'],
  firmness: [
    'опорно-двигательного',
    'предпочитают менять сторону матраса',
    'спящие меняются изделиями',
    'пышную стёжку чехла',
    'Берутся два одинаковых',
  ],
  type: [
    'за счёт монолитности конструкции',
    '(1–2 см)',
    'конструкция этого типа матрасов позволяет',
    'Сейчас, в большинстве случаев, термин «зима-лето»',
    'а не несёт под собой',
    'без необходимости переворачивать',
  ],
  loadRange: [
    'обычно 80–100 см ширины',
    'упираются руками в матрас',
    'нетканого полотна',
    'При гармоничных пропорциях тела вес распределяется',
    'Мы не используем этот устаревший тип конструкции.',
  ],
  heightRange: ['от **10 до 16 см**', 'Это даёт высоту в 18 см', 'подвержены более быстрому износу'],
  fillings: ['например **22/36**', 'Форплит', 'компании «Эгида»', 'Элакс — запатентованное', 'Холкон — синтетическое'],
  features: [
    'По периметру пружинного матраса',
    'в разделе **«Как выбрать жёсткость»**',
    'обратно не надевается',
    'снять и надеть чехол',
  ],
}

const FORBIDDEN_PHRASES = [
  'ЗАКОНЧИЛИ ТУТ',
  'Если есть проблемы с суставами',
  'панбонда',
  '«Иида»',
  'в попапе',
  'опорно-дигательного',
  'Предпочитают',
  'нектарного',
  'подверженны',
  'Elax',
  'Холлкон',
  'не одевается',
  'одеть чехол',
]

function joinedBodies(content) {
  return (content?.segments || []).map((segment) => String(segment.body || '')).join('\n')
}

const keys = Object.keys(CATALOG_FILTER_HELP_CONTENT)
check(keys.length === 8, `canonical has 8 keys, got ${keys.length}`)
check(
  JSON.stringify(keys) === JSON.stringify(EXPECTED_KEYS),
  `canonical key order is ${EXPECTED_KEYS.join(', ')}`,
)
check(SUMMARY_TITLE === 'Если коротко', 'summary title stays «Если коротко»')

for (const key of EXPECTED_KEYS) {
  const content = CATALOG_FILTER_HELP_CONTENT[key]
  check(Boolean(content), `canonical includes ${key}`)
  check(content?.modal_title === EXPECTED_TITLES[key], `${key} modal title matches`)
  check(Array.isArray(content?.summary_items) && content.summary_items.length === 4, `${key} keeps 4 summary items`)
  check(Array.isArray(content?.segments) && content.segments.length > 0, `${key} has segments`)
}

const collectionSummary = CATALOG_FILTER_HELP_CONTENT.collection.summary_items.map((item) => item.highlight)
check(
  JSON.stringify(collectionSummary) === JSON.stringify(['Classic', 'Flexi', 'Relax', 'Trend']),
  'collection summary highlights stay Classic/Flexi/Relax/Trend',
)
check(
  CATALOG_FILTER_HELP_CONTENT.size.summary_items[0].highlight === 'точный размер',
  'non-collection summaries are preserved (size)',
)

const firmnessNumbers = CATALOG_FILTER_HELP_CONTENT.firmness.segments.filter(
  (segment) => segment.variant === 'numberedListItem',
)
check(firmnessNumbers.length === 3, 'firmness has 3 numbered items')
check(
  JSON.stringify(firmnessNumbers.map((item) => item.list_index)) === JSON.stringify([1, 2, 3]),
  'firmness numbered list keeps 1/2/3',
)

for (const [key, phrases] of Object.entries(REQUIRED_PHRASES)) {
  const blob = `${CATALOG_FILTER_HELP_CONTENT[key].modal_title}\n${joinedBodies(CATALOG_FILTER_HELP_CONTENT[key])}`
  for (const phrase of phrases) {
    check(blob.includes(phrase), `${key} contains «${phrase}»`)
  }
}

for (const key of EXPECTED_KEYS) {
  const blob = joinedBodies(CATALOG_FILTER_HELP_CONTENT[key])
  for (const phrase of FORBIDDEN_PHRASES) {
    check(!blob.includes(phrase), `${key} does not contain «${phrase}»`)
  }
}

const mapped = mapFilterHelpRows(
  EXPECTED_KEYS.map((filter_key) => {
    const content = CATALOG_FILTER_HELP_CONTENT[filter_key]
    return {
      filter_key,
      modal_title: content.modal_title,
      summary_title: SUMMARY_TITLE,
      summary_items: content.summary_items,
      segments: content.segments.map((segment) => ({
        variant: segment.variant,
        body: segment.body,
        list_index: segment.list_index,
      })),
    }
  }),
)
check(Object.keys(mapped).length === 8, 'mapper emits 8 filterHelp keys')
check(mapped.collection?.summary?.items?.length === 4, 'mapper keeps collection summary')
const numbered = (mapped.firmness?.segments || []).filter((segment) => segment.variant === 'numberedListItem')
check(numbered.length === 3 && numbered[0].listIndex === 1, 'mapper preserves numbered listIndex')
check(
  (mapped.fillings?.segments || []).some(
    (segment) => segment.variant === 'heading' && segment.text === 'Форплит',
  ),
  'mapper keeps Markdown-free heading text',
)
check(
  (mapped.features?.segments || []).some((segment) => segment.text.includes('**«Как выбрать жёсткость»**')),
  'mapper keeps Markdown bold in body',
)

function createFakeStrapi(existingRows, storeRows = []) {
  const rows = existingRows.map((row) => ({ ...row }))
  return {
    strapi: {
      documents() {
        return {
          async findFirst({ filters }) {
            return rows.find((row) => row.filter_key === filters.filter_key) || null
          },
          async create({ data }) {
            const row = { documentId: `doc-${data.filter_key}`, ...data }
            rows.push(row)
            return row
          },
          async update({ documentId, data }) {
            const row = rows.find((item) => item.documentId === documentId)
            Object.assign(row, data)
            return row
          },
        }
      },
      db: {
        connection() {
          return {
            where({ key }) {
              return {
                async first() {
                  return storeRows.find((row) => row.key === key) || null
                },
              }
            },
            async insert(row) {
              storeRows.push({ ...row })
            },
          }
        },
      },
      log: { info() {}, warn() {} },
    },
    rows,
    storeRows,
  }
}

const staleRows = EXPECTED_KEYS.map((filter_key) => ({
  documentId: `doc-${filter_key}`,
  filter_key,
  modal_title: 'OLD',
  segments: [{ variant: 'paragraph', body: 'stale copy' }],
  summary_items: [{ lead: 'old — ', highlight: 'x' }],
}))
const first = createFakeStrapi(staleRows)
const firstResult = await seedCatalogFilterHelpContent(first.strapi)
check(firstResult.revision?.applied === true, 'first revision run applies')
check(firstResult.revision?.updated === 8, 'first revision updates 8 existing keys')
check(
  first.storeRows.some((row) => row.key === COPY_REVISION_MARKER),
  'revision writes core store marker',
)
check(
  first.rows.length === 8 && first.rows.every((row) => row.filter_key && row.modal_title !== 'OLD'),
  'revision does not create duplicates',
)
check(
  first.rows.find((row) => row.filter_key === 'firmness')?.segments?.some((segment) => String(segment.body).includes('опорно-двигательного')),
  'revision writes new firmness copy',
)

const second = createFakeStrapi(
  first.rows.map((row) => ({ ...row, segments: row.segments.map((segment) => ({ ...segment })) })),
  [...first.storeRows],
)
second.rows.find((row) => row.filter_key === 'collection').segments[0].body = 'admin edit'
const secondResult = await seedCatalogFilterHelpContent(second.strapi)
check(secondResult.revision?.applied === false, 'second revision run is a no-op')
check(
  second.rows.find((row) => row.filter_key === 'collection')?.segments?.[0]?.body === 'admin edit',
  'later bootstrap preserves admin edits',
)
check(second.storeRows.filter((row) => row.key === COPY_REVISION_MARKER).length === 1, 'marker is not duplicated')

const snapshotPath = path.join(root, 'public', 'catalog-filters.snapshot.json')
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'))
const snapshotHelp = snapshot.filterHelp || {}
for (const key of EXPECTED_KEYS) {
  check(Boolean(snapshotHelp[key]), `snapshot has ${key}`)
  check(snapshotHelp[key]?.modalTitle === EXPECTED_TITLES[key], `snapshot ${key} title matches`)
}
const snapshotBlob = JSON.stringify(snapshotHelp)
check(snapshotBlob.includes('опорно-двигательного'), 'snapshot has corrected firmness copy')
check(snapshotBlob.includes('Элакс — запатентованное'), 'snapshot has Elax copy in Russian')
check(snapshotBlob.includes('Форплит'), 'snapshot keeps Форплит heading')
check(!snapshotBlob.includes('ЗАКОНЧИЛИ ТУТ'), 'snapshot has no editorial leftover')
check(!String(snapshotHelp.heightRange?.segments?.map((segment) => segment.text).join('\n') || '').includes('Если есть проблемы с суставами'), 'snapshot dropped joints section')

if (failures.length) {
  console.error('check:catalog-filter-help-copy FAILED')
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}
console.log('check:catalog-filter-help-copy PASS')
