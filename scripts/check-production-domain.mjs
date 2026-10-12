import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readdir, readFile } from 'node:fs/promises'
import { extname, relative, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)

let canonicalDomain
try {
  canonicalDomain = require('../lib/canonical-domain.cjs')
} catch (error) {
  if (error?.code === 'MODULE_NOT_FOUND') {
    assert.fail('canonical-domain helper is missing')
  }
  throw error
}

const { PRIMARY_HOST, buildCanonicalRedirect } = canonicalDomain

const redirectCases = [
  {
    name: 'canonical apex URL does not redirect',
    input: { hostHeader: 'grassigrosso.ru', originalUrl: '/catalog?source=test' },
    expected: null,
  },
  {
    name: 'old apex keeps path and query',
    input: { hostHeader: 'grassigrosso.com', originalUrl: '/catalog?source=test' },
    expected: 'https://grassigrosso.ru/catalog?source=test',
  },
  {
    name: 'old www host redirects to the new apex',
    input: { hostHeader: 'www.grassigrosso.com', originalUrl: '/documents' },
    expected: 'https://grassigrosso.ru/documents',
  },
  {
    name: 'new www host redirects to the new apex',
    input: { hostHeader: 'www.grassigrosso.ru', originalUrl: '/contacts' },
    expected: 'https://grassigrosso.ru/contacts',
  },
  {
    name: 'host ports are ignored during canonical comparison',
    input: { hostHeader: 'grassigrosso.ru:443', originalUrl: '/catalog' },
    expected: null,
  },
  {
    name: 'legacy html URL redirects in one hop',
    input: { hostHeader: 'grassigrosso.com', originalUrl: '/catalog.html?source=test' },
    expected: 'https://grassigrosso.ru/catalog?source=test',
  },
  {
    name: 'index html maps to the root URL',
    input: { hostHeader: 'grassigrosso.ru', originalUrl: '/index.html?source=test' },
    expected: 'https://grassigrosso.ru/?source=test',
  },
]

assert.equal(PRIMARY_HOST, 'grassigrosso.ru')
assert.equal(typeof buildCanonicalRedirect, 'function')

for (const testCase of redirectCases) {
  assert.equal(
    buildCanonicalRedirect(testCase.input),
    testCase.expected,
    testCase.name,
  )
}

const serverSource = await readFile(resolve(root, 'server.cjs'), 'utf8')
const requiredMailboxes = [
  'sales@grassigrosso.com',
  'hotels@grassigrosso.com',
  'b2b@grassigrosso.com',
  'callback@grassigrosso.com',
]

for (const mailbox of requiredMailboxes) {
  assert(serverSource.includes(mailbox), `required mailbox changed or missing: ${mailbox}`)
}

assert(!serverSource.includes('@grassigrosso.ru'), 'mail routing must stay on @grassigrosso.com')

const textExtensions = new Set(['.cjs', '.html', '.js', '.json', '.md', '.mjs', '.ts', '.tsx', '.txt', '.xml'])
const runtimeFiles = [
  resolve(root, '.env.example'),
  resolve(root, 'vite.config.mjs'),
  resolve(root, 'server.cjs'),
]

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.html')) {
    runtimeFiles.push(resolve(root, entry.name))
  }
}

async function collectTextFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name)
    if (entry.isDirectory()) {
      await collectTextFiles(absolutePath)
    } else if (textExtensions.has(extname(entry.name))) {
      runtimeFiles.push(absolutePath)
    }
  }
}

for (const directory of [
  'public',
  'templates',
  'src',
  'lib',
  'scripts/fixtures/pages-cms',
  'strapi-catalog/src/api/pages-cms',
]) {
  await collectTextFiles(resolve(root, directory))
}

const websiteDomainViolations = []
const ruMailboxViolations = []

for (const file of runtimeFiles) {
  const source = await readFile(file, 'utf8')
  const lines = source.split('\n')
  lines.forEach((line, index) => {
    if (/(?<!@)grassigrosso\.com/.test(line)) {
      websiteDomainViolations.push(`${relative(root, file)}:${index + 1}`)
    }
    if (/@grassigrosso\.ru\b/.test(line)) {
      ruMailboxViolations.push(`${relative(root, file)}:${index + 1}`)
    }
  })
}

assert.deepEqual(
  websiteDomainViolations,
  [],
  `website references still use grassigrosso.com:\n${websiteDomainViolations.join('\n')}`,
)
assert.deepEqual(
  ruMailboxViolations,
  [],
  `mailboxes must stay on grassigrosso.com:\n${ruMailboxViolations.join('\n')}`,
)

const sitemap = await readFile(resolve(root, 'public/sitemap.xml'), 'utf8')
const robots = await readFile(resolve(root, 'public/robots.txt'), 'utf8')
const envExample = await readFile(resolve(root, '.env.example'), 'utf8')
assert(sitemap.includes('<loc>https://grassigrosso.ru/</loc>'), 'sitemap root must use grassigrosso.ru')
assert(robots.includes('Sitemap: https://grassigrosso.ru/sitemap.xml'), 'robots sitemap must use grassigrosso.ru')
assert.match(
  envExample,
  /^CORS_ALLOWED_ORIGINS=.*https:\/\/grassigrosso\.ru/m,
  '.env.example CORS allowlist must include the production .ru origin',
)

console.log(`Production domain redirect contract: OK (${redirectCases.length} cases)`)
