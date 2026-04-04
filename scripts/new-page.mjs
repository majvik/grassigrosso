#!/usr/bin/env node
/**
 * Создаёт новую HTML-страницу из templates/marketing-page.html и регистрирует её в vite.config.mjs.
 * Usage: npm run new-page -- <slug> "Заголовок – Grassigrosso"
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

const slug = process.argv[2]
const titleArg = process.argv.slice(3).join(' ').trim()
const pageTitle = titleArg || 'Заголовок страницы – Grassigrosso'

if (!slug || !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
  console.error('Usage: npm run new-page -- <slug> ["Page title – Grassigrosso"]')
  console.error('Slug: латиница, цифры, дефис.')
  process.exit(1)
}

const htmlName = slug.endsWith('.html') ? slug : `${slug}.html`
const outPath = path.join(root, htmlName)
if (fs.existsSync(outPath)) {
  console.error(`Файл уже существует: ${htmlName}`)
  process.exit(1)
}

const templatePath = path.join(root, 'templates', 'marketing-page.html')
if (!fs.existsSync(templatePath)) {
  console.error('Нет шаблона:', templatePath)
  process.exit(1)
}

let html = fs.readFileSync(templatePath, 'utf8')
html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeXml(pageTitle)}</title>`)
html = html.replace(/data-page="PAGE_SLUG"/, `data-page="${slug}"`)

const h1Text = pageTitle
  .replace(/\s*[–—-]\s*Grassigrosso\s*$/i, '')
  .trim() || 'Заголовок страницы'
html = html.replace(/<h1 class="legal-page-title">[^<]*<\/h1>/, `<h1 class="legal-page-title">${escapeXml(h1Text)}</h1>`)

fs.writeFileSync(outPath, html, 'utf8')
console.log('Создан:', htmlName)

const vitePath = path.join(root, 'vite.config.mjs')
let viteSrc = fs.readFileSync(vitePath, 'utf8')

const keyForConfig = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(slug) ? slug : `'${slug}'`
const newLine = `        ${keyForConfig}: './${htmlName}',`

if (viteSrc.includes(`'./${htmlName}'`)) {
  console.log('vite.config.mjs: путь к странице уже есть.')
  process.exit(0)
}

const anchor = "unsubscribe: './unsubscribe.html',"
if (!viteSrc.includes(anchor)) {
  console.error('Не найдена строка-якорь unsubscribe в vite.config.mjs — добавьте input вручную.')
  process.exit(1)
}

viteSrc = viteSrc.replace(anchor, `${anchor}\n${newLine}`)
fs.writeFileSync(vitePath, viteSrc, 'utf8')
console.log('Обновлён: vite.config.mjs (rollup input)')
console.log('Дальше: правьте <main>, при необходимости meta/og, затем npm run build.')

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
