#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = 'strapi-catalog'
const schemaFiles = {
  'chrome.link': `${root}/src/components/chrome/link.json`,
  'chrome.navigation-group': `${root}/src/components/chrome/navigation-group.json`,
  'chrome.header': `${root}/src/components/chrome/header.json`,
  'chrome.footer': `${root}/src/components/chrome/footer.json`,
  'api::site-chrome.site-chrome': `${root}/src/api/site-chrome/content-types/site-chrome/schema.json`,
}
const schemas = Object.fromEntries(Object.entries(schemaFiles).map(([uid, file]) => [uid, JSON.parse(fs.readFileSync(file, 'utf8'))]))
const chromeRu = (await import(`../${root}/src/admin/translations/chrome-ru.mjs`)).default
const { canonicalizeSiteChrome, SiteChromeContractError, SITE_CHROME_POPULATE } = require(`../${root}/src/api/pages-cms/utils/site-chrome-contract.js`)

for (const [uid, schema] of Object.entries(schemas)) {
  assert.ok(schema.info?.displayName && /[А-Яа-яЁё]/.test(schema.info.displayName), `${uid}: RU displayName`)
  for (const [name, attr] of Object.entries(schema.attributes || {})) {
    assert.ok(attr.displayName && /[А-Яа-яЁё]/.test(attr.displayName), `${uid}.${name}: RU displayName`)
    assert.equal(attr.required, true, `${uid}.${name}: required`)
    const cmKey = uid.startsWith('api::') ? `content-manager.content-types.${uid}.${name}` : `content-manager.components.${uid}.${name}`
    const ctbKey = uid.startsWith('api::') ? `content-type-builder.content-types.${uid}.attributes.${name}` : `content-type-builder.components.${uid}.attributes.${name}`
    assert.equal(chromeRu[cmKey], attr.displayName, `${uid}.${name}: CM RU`)
    assert.equal(chromeRu[ctbKey], attr.displayName, `${uid}.${name}: CTB RU`)
  }
}
assert.equal(schemas['api::site-chrome.site-chrome'].kind, 'singleType')
assert.deepEqual(Object.keys(schemas['api::site-chrome.site-chrome'].attributes), ['header', 'footer'])
assert.equal(schemas['chrome.header'].attributes.primary_navigation.component, 'chrome.link')
assert.equal(schemas['chrome.footer'].attributes.navigation_groups.component, 'chrome.navigation-group')
assert.equal(schemas['chrome.navigation-group'].attributes.links.component, 'chrome.link')
assert.ok(SITE_CHROME_POPULATE.header.populate.logo && SITE_CHROME_POPULATE.footer.populate.navigation_groups)

const link = (key, label) => ({ key, label, href: key === 'catalog' ? '/catalog' : `/${key}` })
const fallback = {
  header: {
    greeting: 'Доброе утро!', phone_label: '+ 7 (978) 248-43-80', phone_href: 'tel:+79782484380', schedule: 'Пн-Пт: 9:00 - 18:00',
    logo: { url: '/header-logo.svg' }, logo_alt: 'Grassigrosso', logo_home_href: '/',
    primary_navigation: [['hotels','Отелям'],['dealers','Дилерам'],['catalog','Каталог'],['documents','Документы'],['contacts','Контакты']].map(([key,label]) => link(key,label)),
    contact_cta_label: 'Связаться', contact_cta_href: '/contacts#contact-form',
  },
  footer: {
    logo: { url: '/footer-logo.svg' }, logo_alt: 'Grassigrosso', description: 'Продуманные решения для естественного восстановления.',
    inn_label: 'ИНН:', inn: '9102292969', ogrn_label: 'ОГРН:', ogrn: '1239100014548',
    navigation_groups: [
      { key: 'solutions', title: 'Решения', links: [['hotels','Отелям'],['dealers','Дилерам'],['catalog','Каталог матрасов']].map(([key,label]) => link(key,label)) },
      { key: 'information', title: 'Информация', links: [['documents','Документы'],['contacts','Контакты']].map(([key,label]) => link(key,label)) },
    ],
    contacts_title: 'Связь', phone_label: 'Телефон:', phone_value: '+ 7 (978) 248-43-80', phone_href: 'tel:+79782484380',
    email_label: 'Email:', email_value: 'sales@grassigrosso.com', email_href: 'mailto:sales@grassigrosso.com', schedule_label: 'Режим работы:', schedule: 'Пн-Пт: 9:00 - 18:00 МСК',
    policy_links: [['privacy','Политика конфиденциальности'],['terms','Пользовательское соглашение'],['cookies','Использование cookie']].map(([key,label]) => link(key,label)),
    copyright_brand: '© Grassigrosso, 2026.', copyright_legal_text: 'Все материалы сайта охраняются законодательством Российской Федерации.',
  },
}
assert.deepEqual(canonicalizeSiteChrome(fallback), fallback)

function rejects(mutator) {
  const value = structuredClone(fallback); mutator(value)
  assert.throws(() => canonicalizeSiteChrome(value), SiteChromeContractError)
}
const negatives = [
  (x) => { x.extra = true }, (x) => { x.header.greeting = '' }, (x) => { x.header.greeting = '<b>x</b>' },
  (x) => { x.header.phone_href = 'tel:+100' }, (x) => { x.header.logo.url = '//evil/x.svg' },
  (x) => { x.header.primary_navigation.pop() }, (x) => { x.header.primary_navigation[1].key = 'hotels' },
  (x) => { [x.header.primary_navigation[0], x.header.primary_navigation[1]] = [x.header.primary_navigation[1], x.header.primary_navigation[0]] },
  (x) => { x.header.primary_navigation[0].href = '/dealers' }, (x) => { x.footer.inn = '123' },
  (x) => { x.footer.navigation_groups[0].extra = true }, (x) => { x.footer.navigation_groups.reverse() },
  (x) => { x.footer.navigation_groups[0].links.pop() }, (x) => { x.footer.policy_links[0].href = 'https://evil.example' },
  (x) => { x.footer.email_href = 'mailto:evil@example.com' },
]
negatives.forEach(rejects)

const route = fs.readFileSync(`${root}/src/api/pages-cms/routes/site-chrome-feed.js`, 'utf8')
const controller = fs.readFileSync(`${root}/src/api/pages-cms/controllers/site-chrome-feed.js`, 'utf8')
assert.ok(route.includes("path: '/site-chrome-feed'") && route.includes('auth: false'))
assert.ok(controller.includes('loadCanonicalSiteChrome') && controller.includes('ctx.body = { data }'))

console.log(`check:pages-cms-phase-7b PASS (schemas=${Object.keys(schemas).length} negatives=${negatives.length} feed=ok RU=ok)`)
