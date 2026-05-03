#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const routes = [
  { path: '/', htmlFile: 'index.html' },
  { path: '/hotels', htmlFile: 'hotels.html' },
  { path: '/dealers', htmlFile: 'dealers.html' },
  { path: '/catalog', htmlFile: 'catalog.html' },
  { path: '/documents', htmlFile: 'documents.html' },
  { path: '/contacts', htmlFile: 'contacts.html' },
  { path: '/privacy', htmlFile: 'privacy.html' },
  { path: '/terms', htmlFile: 'terms.html' },
  { path: '/cookies', htmlFile: 'cookies.html' },
  { path: '/404', htmlFile: '404.html' },
  { path: '/unsubscribe', htmlFile: 'unsubscribe.html' },
]

const failures = []

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

for (const route of routes) {
  const abs = path.join(root, route.htmlFile)
  if (!fs.existsSync(abs)) failures.push(`Missing route html file: ${route.htmlFile}`)
  if (route.path !== '/' && route.path.endsWith('.html')) failures.push(`Route path must be clean: ${route.path}`)
}

const htmlFiles = routes.map((route) => route.htmlFile).concat(['templates/marketing-page.html'])
const dirtyHrefRe = /\b(?:href|action)=["'][^"']+\.html(?:[#?][^"']*)?["']/g
const requiredHtmlSnippets = [
  ['vite-critical-css placeholder', '<style id="vite-critical-css"></style>'],
  ['Yandex.Metrika script', 'mc.yandex.ru/metrika/tag.js'],
  ['main stylesheet', '<link rel="stylesheet" href="./src/style.css" />'],
  ['apple touch icon', '<link rel="apple-touch-icon"'],
  ['site manifest', '<link rel="manifest" href="./public/site.webmanifest" />'],
  ['preloader', 'id="preloader"'],
  ['cookie banner', 'class="cookie-banner"'],
  ['main module script', '<script type="module" src="./src/main.js"></script>'],
]

for (const route of routes) {
  const source = read(route.htmlFile)
  const expectedCanonical = `<link rel="canonical" href="%%SITE_ORIGIN%%${route.path}" />`

  if (!source.includes(expectedCanonical)) {
    failures.push(`${route.htmlFile}: missing clean canonical ${expectedCanonical}`)
  }
}

for (const file of htmlFiles) {
  const source = read(file)
  const matches = source.match(dirtyHrefRe) || []
  if (matches.length > 0) {
    failures.push(`${file}: internal .html URLs remain: ${matches.slice(0, 5).join(', ')}`)
  }

  for (const [label, snippet] of requiredHtmlSnippets) {
    if (!source.includes(snippet)) {
      failures.push(`${file}: missing ${label}`)
    }
  }
}

const template = read('templates/marketing-page.html')
if (!template.includes('<link rel="canonical" href="%%SITE_ORIGIN%%/__CANONICAL_SLUG__" />')) {
  failures.push('templates/marketing-page.html: missing clean canonical placeholder')
}

const routing = JSON.parse(read('src/contracts/lead-routing.json'))
const requiredLabels = Array.isArray(routing.labels) ? routing.labels : []
const server = read('server.cjs')
const clientRoutingSources = [
  'src/main.js',
  'src/resource-modals.js',
]
const clientRoutingSource = clientRoutingSources
  .map((file) => read(file))
  .join('\n')
const routingBlock = server.match(/const PAGE_EMAIL_ROUTING = \{([\s\S]*?)\n\};/)
if (!routingBlock) {
  failures.push('server.cjs: PAGE_EMAIL_ROUTING block not found')
} else {
  const serverLabels = new Set([...routingBlock[1].matchAll(/^\s*'([^']+)'\s*:/gm)].map((match) => match[1]))
  for (const label of requiredLabels) {
    if (!serverLabels.has(label)) failures.push(`PAGE_EMAIL_ROUTING missing label: ${label}`)
  }
}

for (const label of requiredLabels) {
  if (!clientRoutingSource.includes(label)) failures.push(`client form routing missing page label: ${label}`)
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`Route contract ok: ${routes.length} routes, ${requiredLabels.length} form labels.`)
