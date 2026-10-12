import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

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

console.log(`Production domain redirect contract: OK (${redirectCases.length} cases)`)
