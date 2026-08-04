#!/usr/bin/env node
import fs from 'node:fs'
import crypto from 'node:crypto'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const page = fs.readFileSync('download-catalog.html', 'utf8')
const catalog = fs.readFileSync('catalog.html', 'utf8')
const main = fs.readFileSync('src/main.js', 'utf8')
const vite = fs.readFileSync('vite.config.mjs', 'utf8')
const server = fs.readFileSync('server.cjs', 'utf8')

assert(vite.includes("'download-catalog': './download-catalog.html'"), 'download-catalog missing from Vite inputs')
assert((page.match(/class="download-catalog-cover"/g) || []).length === 1, 'page must contain exactly one cover')
assert(!page.includes('data-download-slide') && !page.includes('data-download-prev'), 'slider controls are forbidden')
assert(page.includes('data-download-doc="catalog"'), 'download form contract missing')
assert(page.includes('/download-catalog/slide-01.avif'), 'approved cover missing')
assert(fs.existsSync('public/icons/arrow-back-left.svg'), 'approved back-arrow icon missing')
assert(!page.includes('./public/'), 'public assets must use root paths')
assert(
  crypto.createHash('sha256').update(fs.readFileSync('public/download-catalog/slide-01.avif')).digest('hex') ===
    'cf6fe2d7d217639a49929637a224797da9c0130f361a443f8be8cb41a35bbf1c',
  'cover must be byte-identical to the approved dev asset',
)

const hero = catalog.match(/<a href="\/download-catalog" class="btn-primary-large">Скачать в электронном виде<\/a>/)
assert(hero, 'catalog hero must link directly to /download-catalog')
assert(!hero[0].includes('data-document') && !hero[0].includes('data-open-catalog'), 'catalog hero must not open a modal')

assert(
  /class="documents-commercial-item" data-document="catalog"[\s\S]*?data-request-document/.test(catalog),
  'Catalog product — PDF document block must retain the document modal trigger',
)
assert(main.includes("download.href = '/download-catalog'"), 'shared header/footer download link missing')
assert(main.includes("heading !== 'Решения'"), 'footer link must be placed in Solutions')
assert(main.includes('catalogItem.after(item)'), 'footer link must follow Catalog mattresses')
assert(main.includes("'download-catalog': 'Скачать каталог'"), 'download page form routing label missing')
assert(server.includes("'Скачать каталог':      ['sales@grassigrosso.com']"), 'server email routing missing')

console.log('check:download-catalog-sales PASS (single cover, chrome links, hero route, PDF modal only)')
