import fs from 'node:fs/promises'
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool'

const outputDir = new URL('.', import.meta.url).pathname
const outputPath = `${outputDir}grassigrosso-catalog-update-template.xlsx`
const font = 'Arial'
const dark = '#174C3C'
const input = '#FFF7D6'
const border = '#CBD8D3'

const dictionaries = {
  collections: ['Classic', 'Flexi', 'Relax', 'Trend'],
  mattressTypes: ['Пружинный', 'Беспружинный', 'Топер', 'Двухсторонний', 'Односторонний'],
  firmness: ['Мягкий', 'Средний', 'Жесткий', 'Разная жесткость сторон'],
  sizes: ['140 × 190', '140 × 200', '160 × 190', '160 × 200', '180 × 190', '180 × 200'],
  fillings: ['Кокосовая койра', 'Латекс', 'Орто-пена', 'С эффектом памяти', 'Нано-пена', 'Форплит'],
  features: ['Съемный чехол', 'Эффект зима-лето', 'Усиленный периметр', 'Разная жесткость сторон'],
  tags: ['Пружинный', 'Беспружинный', 'Средняя жесткость', 'Жесткий', 'Мягкий', 'Средний', 'Разная жесткость сторон', 'Топер'],
}

function colName(index) {
  let value = index + 1
  let name = ''
  while (value > 0) {
    const remainder = (value - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    value = Math.floor((value - 1) / 26)
  }
  return name
}

const workbook = Workbook.create()
const catalog = workbook.worksheets.add('Каталог')
const refs = workbook.worksheets.add('Варианты выбора')
for (const sheet of [catalog, refs]) {
  sheet.showGridLines = false
  sheet.getRange('A1:AZ120').format.font = { name: font, size: 10, color: '#24342F' }
}

const groups = [
  ['Товар', '#315B51', ['Название', 'Коллекция', 'Позиция в каталоге']],
  ['Характеристики', '#2D725B', ['Тип матраса', 'Высота, см', 'Максимальная нагрузка, кг', 'Жесткость', 'Жесткость стороны 1 (1–10)', 'Жесткость стороны 2 (1–10)']],
  ['Размеры', '#7B8F45', dictionaries.sizes.map((value) => `Размер: ${value}`)],
  ['Наполнители', '#8B6F3D', dictionaries.fillings.map((value) => `Наполнитель: ${value}`)],
  ['Особенности', '#75628F', dictionaries.features.map((value) => `Особенность: ${value}`)],
  ['Теги', '#4E7890', dictionaries.tags.map((value) => `Тег: ${value}`)],
  ['Описание', '#8B5F56', ['Описание товара', 'Чехол', 'Состав и слои']],
  ['Медиа', '#426B84', ['Обложка для компьютера, SVG — ссылка', 'Обложка для телефона, SVG — ссылка', 'Галерея — ссылки на изображения', 'Видео — ссылка', 'Обложка видео — ссылка', 'Фото характеристик — ссылки']],
  ['Локация', '#4E7890', ['Место съемки', 'Координаты', 'Дата и время съемки', 'Положение солнца']],
  ['Материалы', '#7A654E', ['Изображения материалов — ссылки', 'Названия материалов', 'Короткие описания материалов', 'Подробные описания материалов']],
  ['Комментарий', '#5D6864', ['Комментарий']],
]

const headers = groups.flatMap((group) => group[2])
const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]))
const lastCol = headers.length - 1
const firstDataRow = 5
const lastDataRow = 104

catalog.getRange(`A1:${colName(lastCol)}1`).merge()
catalog.getRange('A1').values = [['Актуализация каталога Grassigrosso']]
catalog.getRange(`A1:${colName(lastCol)}1`).format = { font: { name: font, size: 16, bold: true, color: dark }, rowHeight: 28 }
catalog.getRange(`A2:${colName(lastCol)}2`).merge()
catalog.getRange('A2').values = [['Одна строка — один товар. В полях со ссылками указывайте каждую ссылку с новой строки.']]
catalog.getRange(`A2:${colName(lastCol)}2`).format = { font: { name: font, italic: true, color: '#4E625B' }, rowHeight: 24 }

let groupStart = 0
for (const [name, color, fields] of groups) {
  const start = colName(groupStart)
  const end = colName(groupStart + fields.length - 1)
  catalog.getRange(`${start}3:${end}3`).merge()
  catalog.getRange(`${start}3`).values = [[name]]
  catalog.getRange(`${start}3:${end}3`).format = {
    fill: color,
    font: { name: font, bold: true, color: '#FFFFFF' },
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
    borders: { preset: 'outside', style: 'thin', color: '#FFFFFF' },
  }
  groupStart += fields.length
}

catalog.getRange(`A4:${colName(lastCol)}4`).values = [headers]
catalog.getRange(`A4:${colName(lastCol)}4`).format = {
  fill: dark,
  font: { name: font, bold: true, color: '#FFFFFF' },
  horizontalAlignment: 'center',
  verticalAlignment: 'center',
  wrapText: true,
  rowHeight: 48,
  borders: { insideVertical: { style: 'thin', color: '#FFFFFF' }, bottom: { style: 'thin', color: dark } },
}
catalog.getRange(`A${firstDataRow}:${colName(lastCol)}${lastDataRow}`).format = {
  fill: input,
  verticalAlignment: 'top',
  wrapText: true,
  borders: { insideHorizontal: { style: 'thin', color: '#E4E9E7' } },
  rowHeight: 44,
}

const table = catalog.tables.add(`A4:${colName(lastCol)}${lastDataRow}`, true, 'ClientCatalogTable')
table.style = 'TableStyleMedium4'
table.showFilterButton = true
table.showBandedRows = false
catalog.freezePanes.freezeRows(4)
catalog.freezePanes.freezeColumns(2)

const wide = new Set(['Описание товара', 'Чехол', 'Состав и слои', 'Галерея — ссылки на изображения', 'Фото характеристик — ссылки', 'Изображения материалов — ссылки', 'Названия материалов', 'Короткие описания материалов', 'Подробные описания материалов', 'Комментарий'])
for (let index = 0; index < headers.length; index += 1) {
  const header = headers[index]
  let width = wide.has(header) ? 36 : 20
  if (header === 'Название') width = 26
  if (header.startsWith('Размер:')) width = 16
  if (header.startsWith('Наполнитель:') || header.startsWith('Особенность:') || header.startsWith('Тег:')) width = 24
  catalog.getRange(`${colName(index)}:${colName(index)}`).format.columnWidth = width
}

const refGroups = [
  ['Коллекция', dictionaries.collections],
  ['Тип матраса', dictionaries.mattressTypes],
  ['Жесткость', dictionaries.firmness],
]

const refRanges = {}
let refCol = 0
for (const [title, values] of refGroups) {
  const col = colName(refCol)
  refs.getRange(`${col}1`).values = [[title]]
  refs.getRange(`${col}1`).format = { fill: dark, font: { name: font, bold: true, color: '#FFFFFF' } }
  refs.getRange(`${col}2:${col}${values.length + 1}`).values = values.map((value) => [value])
  refs.getRange(`${col}1:${col}${values.length + 1}`).format.borders = { preset: 'all', style: 'thin', color: border }
  refs.getRange(`${col}:${col}`).format.columnWidth = title === 'Теги' ? 80 : 55
  refRanges[title] = `'Варианты выбора'!$${col}$2:$${col}$${values.length + 1}`
  refCol += 1
}
refs.freezePanes.freezeRows(1)

function validateList(header, refName) {
  const col = colName(headerIndex[header])
  catalog.getRange(`${col}${firstDataRow}:${col}${lastDataRow}`).dataValidation = {
    rule: { type: 'list', formula1: `INDIRECT("${refRanges[refName]}")` },
  }
}

for (const field of ['Коллекция', 'Тип матраса', 'Жесткость']) validateList(field, field)
const checkboxHeaders = [
  ...dictionaries.sizes.map((value) => `Размер: ${value}`),
  ...dictionaries.fillings.map((value) => `Наполнитель: ${value}`),
  ...dictionaries.features.map((value) => `Особенность: ${value}`),
  ...dictionaries.tags.map((value) => `Тег: ${value}`),
]
for (const header of checkboxHeaders) {
  const col = colName(headerIndex[header])
  const range = catalog.getRange(`${col}${firstDataRow}:${col}${lastDataRow}`)
  range.values = [['☐']]
  range.dataValidation = { rule: { type: 'list', values: ['☐', '☑'] } }
  range.format = { horizontalAlignment: 'center', verticalAlignment: 'center', font: { name: font, size: 14, color: dark } }
}
catalog.getRange(`${colName(headerIndex['Позиция в каталоге'])}${firstDataRow}:${colName(headerIndex['Позиция в каталоге'])}${lastDataRow}`).dataValidation = { rule: { type: 'whole', operator: 'between', formula1: 0, formula2: 9999 } }
for (const field of ['Жесткость стороны 1 (1–10)', 'Жесткость стороны 2 (1–10)']) {
  const col = colName(headerIndex[field])
  catalog.getRange(`${col}${firstDataRow}:${col}${lastDataRow}`).dataValidation = { rule: { type: 'whole', operator: 'between', formula1: 1, formula2: 10 } }
}

workbook.recalculate()
const inspect = await workbook.inspect({ kind: 'table', range: `Каталог!A1:${colName(lastCol)}10`, include: 'values,formulas', tableMaxRows: 10, tableMaxCols: headers.length })
await fs.writeFile(`${outputDir}inspect.txt`, inspect.ndjson, 'utf8')
for (const sheetName of ['Каталог', 'Варианты выбора']) {
  const preview = await workbook.render({ sheetName, autoCrop: 'all', scale: sheetName === 'Каталог' ? 0.7 : 1, format: 'png' })
  await fs.writeFile(`${outputDir}preview-${sheetName}.png`, new Uint8Array(await preview.arrayBuffer()))
}
const errors = await workbook.inspect({ kind: 'match', searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!', options: { useRegex: true, maxResults: 300 }, summary: 'final formula error scan' })
await fs.writeFile(`${outputDir}formula-errors.txt`, errors.ndjson, 'utf8')
const output = await SpreadsheetFile.exportXlsx(workbook)
await output.save(outputPath)
console.log(outputPath)
