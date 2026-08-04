#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'

const contractPath = '.planning/phases/07-global-site-chrome/07-content-contract.json'
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'))
const expectedNav = [
  ['/hotels', 'Отелям'], ['/dealers', 'Дилерам'], ['/catalog', 'Каталог'],
  ['/documents', 'Документы'], ['/contacts', 'Контакты'],
]
const expectedFooter = [
  '/hotels', '/dealers', '/catalog', '/documents', '/contacts',
  'tel:+79782484380', 'mailto:sales@grassigrosso.com',
  '/privacy', '/terms', '/cookies',
]

function anchors(fragment) {
  return [...fragment.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
    .map((match) => [match[1], match[2].replace(/<[^>]+>/g, '').trim()])
}

function region(source, start, end) {
  const from = source.indexOf(start)
  const to = source.indexOf(end, from + start.length)
  assert.ok(from >= 0 && to > from, `missing region ${start}..${end}`)
  return source.slice(from, to)
}

function validText(value) {
  return typeof value === 'string' && value.trim() !== '' && !/[<>]/.test(value)
}
function validHref(value) {
  return contract.hrefAllowlist.includes(value) && !/[<>]/.test(value)
}
function validMedia(value) {
  return typeof value === 'string' && /^\/(?!\/)[A-Za-z0-9_./-]+$/.test(value) && !value.includes('..')
}
function exactKeys(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

assert.equal(contract.pages.length, 13)
assert.equal(contract.files.length, 13)
assert.equal(new Set(contract.pages).size, 13)
assert.equal(new Set(contract.rows.map((row) => row.path)).size, contract.rows.length)
for (const row of contract.rows) {
  for (const field of ['path', 'selector', 'owner', 'consumers', 'validator', 'fallback', 'testOwner']) {
    assert.ok(String(row[field] || '').trim(), `blank ${field} in ${row.path || 'unknown row'}`)
  }
  assert.ok(['cms', 'code', 'deferred'].includes(row.owner), `unowned ${row.path}`)
}
assert.equal(contract.rows.filter((row) => !row.owner).length, 0)

for (const file of contract.files) {
  const source = fs.readFileSync(file, 'utf8')
  for (const marker of ['class="header-top"', 'class="header-main"', 'class="nav-menu"', 'class="mobile-nav"', 'class="footer"']) {
    assert.ok(source.includes(marker), `${file}: missing ${marker}`)
  }
  const desktop = anchors(region(source, '<nav class="nav-menu">', '</nav>'))
  const mobile = anchors(region(source, '<nav class="mobile-nav">', '</nav>'))
  assert.deepEqual(desktop.map(([href, label]) => [href, label]), expectedNav, `${file}: desktop nav drift`)
  assert.deepEqual(mobile.map(([href, label]) => [href, label]), expectedNav, `${file}: mobile nav drift`)
  const footer = anchors(region(source, '<footer class="footer">', '</footer>')).map(([href]) => href)
  assert.deepEqual(footer, expectedFooter, `${file}: footer link drift`)
  assert.ok(source.includes('aria-label="Открыть меню"') && source.includes('src="/menu.svg"'), `${file}: open control drift`)
  assert.ok(source.includes('aria-label="Закрыть меню"') && source.includes('src="/menu-close.svg"'), `${file}: close control drift`)
  assert.ok(source.includes('src="/header-logo.svg"') && source.includes('src="/footer-logo.svg"'), `${file}: logo drift`)
  const ctaHrefs = [...source.matchAll(/class="(?:btn-contact|mobile-menu-cta)"[^>]*href="([^"]+)"|href="([^"]+)"[^>]*class="(?:btn-contact|mobile-menu-cta)"/g)]
    .map((match) => match[1] || match[2])
  const allowedCta = ['/contacts#contact-form', '/contacts#contact-form']
  assert.deepEqual(ctaHrefs.sort(), allowedCta.sort(), `${file}: CTA drift`)
}

assert.ok(validText('Связаться'))
assert.ok(validHref('/contacts#contact-form'))
assert.ok(validMedia('/header-logo.svg'))
assert.ok(exactKeys(contract.keySets.primaryNavigation, ['hotels', 'dealers', 'catalog', 'documents', 'contacts']))
const negatives = [
  !validText(''), !validText('<b>x</b>'), !validHref('https://evil.example'), !validHref('javascript:alert(1)'),
  !validMedia('//evil.example/x.svg'), !validMedia('/../secret'),
  !exactKeys(['hotels', 'hotels', 'catalog', 'documents', 'contacts'], contract.keySets.primaryNavigation),
  !exactKeys(['hotels', 'dealers', 'catalog', 'contacts'], contract.keySets.primaryNavigation),
  !exactKeys(['dealers', 'hotels', 'catalog', 'documents', 'contacts'], contract.keySets.primaryNavigation),
]
assert.ok(negatives.every(Boolean), 'built-in negatives must all reject')

console.log(`check:pages-cms-phase-7a PASS (pages=${contract.pages.length} rows=${contract.rows.length} unowned=0 negatives=${negatives.length})`)
