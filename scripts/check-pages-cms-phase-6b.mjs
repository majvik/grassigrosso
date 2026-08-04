#!/usr/bin/env node
/**
 * Phase 6B hard gate — legal schemas + RU + feeds + contract negatives.
 * Owned Strapi on a dynamic non-forbidden port; cleanup in finally.
 * Does NOT: seed sync, Node /api/pages proxy expansion, push, Phase C/D.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import {
  FORBIDDEN_PORTS,
  listListeners,
  freePort,
} from './lib/pages-cms-isolated-stack.mjs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const strapiRoot = path.join(root, 'strapi-catalog')
const pagesCmsUtils = path.join(strapiRoot, 'src/api/pages-cms/utils')

const {
  canonicalizeLegalPageData,
  LegalContractError,
  assertNoHtmlLike,
} = require(path.join(pagesCmsUtils, 'legal-page-contract.js'))
const {
  LEGAL_PAGES_CMS_SLUGS,
  LEGAL_SLUG_TO_UID,
  LEGAL_FEED_PATH_BY_SLUG,
  LEGAL_HREF_ALLOWLIST,
  LEGAL_BODY_LENGTH_BY_SLUG,
} = require(path.join(pagesCmsUtils, 'legal-allowlist.js'))
const {
  PAGES_CMS_SLUGS,
  SLUG_TO_UID,
  DEEP_POPULATE_BY_SLUG,
  getDeepPopulateForSlug,
  assertNoStarPopulate,
} = require(path.join(pagesCmsUtils, 'deep-populate.js'))
const { syncDistRuntimeAssets } = require(path.join(strapiRoot, 'scripts/prepare-dist.cjs'))

const contract = JSON.parse(
  fs.readFileSync(path.join(root, '.planning/phases/06-legal-pages/06-content-contract.json'), 'utf8'),
)
const ru = JSON.parse(fs.readFileSync(path.join(strapiRoot, 'src/admin/translations/ru.json'), 'utf8'))

const WAVE1_FEED_PATHS = Object.freeze({
  index: '/api/index-page-feed',
  hotels: '/api/hotels-page-feed',
  dealers: '/api/dealers-page-feed',
  contacts: '/api/contacts-page-feed',
  documents: '/api/documents-page-feed',
  'download-catalog': '/api/download-catalog-page-feed',
})

const failures = []
function fail(message) {
  failures.push(message)
}
function assert(cond, message) {
  if (!cond) fail(message)
}

function expectReject(label, payload, needle) {
  try {
    canonicalizeLegalPageData(payload)
    fail(`negative ${label}: expected reject`)
  } catch (err) {
    if (!(err instanceof LegalContractError) && err?.name !== 'LegalContractError') {
      fail(`negative ${label}: wrong error ${err}`)
      return
    }
    if (needle && !String(err.message).includes(needle)) {
      fail(`negative ${label}: message missing "${needle}": ${err.message}`)
    }
  }
}

function compareAttr(prefix, expected, actual) {
  if (!actual) {
    fail(`${prefix}: missing on disk`)
    return
  }
  assert(actual.type === expected.type, `${prefix}: type ${actual.type} !== ${expected.type}`)
  assert(
    Boolean(actual.required) === Boolean(expected.required),
    `${prefix}: required mismatch (${prefix})`,
  )
  if (expected.type === 'enumeration') {
    assert(
      JSON.stringify(actual.enum) === JSON.stringify(expected.enum),
      `${prefix}: enum mismatch`,
    )
  }
  if (expected.type === 'component') {
    assert(actual.component === expected.component, `${prefix}: component uid`)
    assert(Boolean(actual.repeatable) === Boolean(expected.repeatable), `${prefix}: repeatable`)
  }
  if (expected.type === 'dynamiczone') {
    assert(
      JSON.stringify([...(actual.components || [])].sort()) ===
        JSON.stringify([...(expected.components || [])].sort()),
      `${prefix}: dz components`,
    )
  }
}

function walkForbidden(node, pathKey = '') {
  if (Array.isArray(node)) {
    node.forEach((item, i) => walkForbidden(item, `${pathKey}[${i}]`))
    return
  }
  if (!node || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node)) {
    const p = pathKey ? `${pathKey}.${key}` : key
    if (key === 'updatedAt' || key === 'updated_at') fail(`authored updatedAt forbidden at ${p}`)
    if (key === 'type' && (value === 'richtext' || value === 'customField')) {
      fail(`raw HTML/richtext forbidden at ${p}`)
    }
    if (key === 'data-label' || key === 'data_label') fail(`data-label must not be in schema at ${p}`)
    walkForbidden(value, p)
  }
}

function expectedRuKeys() {
  const keys = new Set()
  for (const uid of contract.legalComponents) {
    const def = contract.definitions.components[uid]
    keys.add(def.displayName)
    for (const attr of Object.keys(def.attributes)) {
      keys.add(`content-manager.components.${uid}.${attr}`)
      keys.add(`content-type-builder.components.${uid}.attributes.${attr}`)
    }
    for (const [attrName, attr] of Object.entries(def.attributes)) {
      if (attr.type !== 'enumeration') continue
      for (const value of attr.enum) keys.add(`${uid}.${attrName}.${value}`)
    }
  }
  for (const uid of contract.legalSingleTypes) {
    const def = contract.definitions.singleTypes[uid]
    const api = `api::${uid}.${uid}`
    keys.add(def.displayName)
    for (const attr of Object.keys(def.attributes)) {
      keys.add(`content-manager.content-types.${api}.${attr}`)
      keys.add(`content-type-builder.content-types.${api}.attributes.${attr}`)
    }
  }
  return [...keys]
}

const validMinimal = {
  title: 'Тест',
  effective_date: '2026-03-01',
  body: [
    {
      type: 'paragraph',
      heading: '1. Общие положения',
      runs: [
        { type: 'text', value: 'Текст ', strong: false },
        {
          type: 'link',
          href: 'https://grassigrosso.com',
          children: [{ type: 'text', value: 'сайта', strong: false }],
        },
      ],
    },
    {
      type: 'operator',
      role_label: 'Оператор',
      legal_name: 'ООО «Грасси»',
      ogrn: '1239100014548',
      inn: '9102292969',
      address: 'Республика Крым',
      email: 'office@grassigrosso.com',
    },
    {
      type: 'list',
      items: [
        {
          runs: [
            { type: 'text', value: 'Сайт', strong: true },
            { type: 'text', value: ' – описание', strong: false },
          ],
        },
      ],
    },
    {
      type: 'table',
      headers: ['A', 'B'],
      rows: [
        {
          cells: [
            { runs: [{ type: 'text', value: '1', strong: false }] },
            { runs: [{ type: 'text', value: '2', strong: false }] },
          ],
        },
      ],
    },
  ],
}

// ========== Static gates ==========
assert(contract.unowned === 0, 'unowned must be 0')
assert(LEGAL_BODY_LENGTH_BY_SLUG.privacy === 55, 'privacy body length 55')
assert(LEGAL_BODY_LENGTH_BY_SLUG.terms === 37, 'terms body length 37')
assert(LEGAL_BODY_LENGTH_BY_SLUG.cookies === 17, 'cookies body length 17')
for (const slug of LEGAL_PAGES_CMS_SLUGS) {
  assert(
    LEGAL_BODY_LENGTH_BY_SLUG[slug] === contract.mechanicalBodyLength[slug],
    `mechanical length mismatch ${slug}`,
  )
}

assert(LEGAL_PAGES_CMS_SLUGS.length === 3, 'exactly 3 legal slugs')
assert(contract.legalSingleTypes.length === 3, 'exactly 3 legal single types')
assert(PAGES_CMS_SLUGS.length === contract.wave1SlugCount, 'Wave 1 slug count must stay 6')
assert(!PAGES_CMS_SLUGS.includes('privacy'), 'Node Wave-1 allowlist must not include privacy yet (Phase C)')
assert(!( 'privacy' in SLUG_TO_UID), 'SLUG_TO_UID Wave-1 map must not include privacy')
assert(LEGAL_SLUG_TO_UID.privacy === 'api::privacy-page.privacy-page', 'privacy uid')

assert(
  JSON.stringify([...LEGAL_HREF_ALLOWLIST]) === JSON.stringify(contract.hrefAllowlist),
  'href allowlist mismatch',
)

// Schema files vs contract
for (const uid of contract.legalComponents) {
  const [cat, name] = uid.split('.')
  const schema = JSON.parse(
    fs.readFileSync(path.join(strapiRoot, `src/components/${cat}/${name}.json`), 'utf8'),
  )
  const def = contract.definitions.components[uid]
  assert(schema.info.displayName === def.displayName, `${uid} displayName`)
  walkForbidden(schema)
  for (const [attr, expected] of Object.entries(def.attributes)) {
    compareAttr(`${uid}.${attr}`, expected, schema.attributes[attr])
  }
  assert(
    Object.keys(schema.attributes).length === Object.keys(def.attributes).length,
    `${uid}: unexpected attrs`,
  )
}

for (const uid of contract.legalSingleTypes) {
  const schema = JSON.parse(
    fs.readFileSync(
      path.join(strapiRoot, `src/api/${uid}/content-types/${uid}/schema.json`),
      'utf8',
    ),
  )
  const def = contract.definitions.singleTypes[uid]
  assert(schema.kind === 'singleType', `${uid} kind`)
  assert(schema.info.displayName === def.displayName, `${uid} displayName`)
  walkForbidden(schema.attributes)
  assert(!('updatedAt' in schema.attributes), `${uid}: authored updatedAt`)
  for (const [attr, expected] of Object.entries(def.attributes)) {
    compareAttr(`${uid}.${attr}`, expected, schema.attributes[attr])
  }
}

// Feeds routes/controllers exist
for (const slug of LEGAL_PAGES_CMS_SLUGS) {
  const feedName = `${slug}-page-feed`
  assert(
    fs.existsSync(path.join(strapiRoot, `src/api/pages-cms/controllers/${feedName}.js`)),
    `missing controller ${feedName}`,
  )
  assert(
    fs.existsSync(path.join(strapiRoot, `src/api/pages-cms/routes/${feedName}.js`)),
    `missing route ${feedName}`,
  )
  assert(LEGAL_FEED_PATH_BY_SLUG[slug] === contract.feedPaths[slug], `feed path ${slug}`)
  const desc = getDeepPopulateForSlug(slug)
  assert(desc.uid === LEGAL_SLUG_TO_UID[slug], `populate uid ${slug}`)
  const starFails = []
  assertNoStarPopulate(desc.populate, slug, starFails)
  assert(starFails.length === 0, `star populate ${slug}: ${starFails.join('; ')}`)
}

// RU coverage — Cyrillic required; Latin-only labels are English fallback
function isLatinOnlyLegalLabel(value) {
  const s = String(value ?? '').trim()
  if (!s) return true
  if (/[А-Яа-яЁё]/.test(s)) return false
  return /[A-Za-z]/.test(s)
}

function collectEnglishFallbackKeys(ruMap, keys) {
  return keys.filter((k) => isLatinOnlyLegalLabel(ruMap[k]))
}

const ruKeys = expectedRuKeys()
const missingRu = ruKeys.filter((k) => !(k in ru) || !String(ru[k]).trim())
assert(missingRu.length === 0, `missing RU keys: ${missingRu.slice(0, 8).join(', ')}`)

const englishRu = collectEnglishFallbackKeys(ru, ruKeys)
assert(
  englishRu.length === 0,
  `English fallback RU value(s): ${englishRu
    .slice(0, 12)
    .map((k) => `${k}=${JSON.stringify(ru[k])}`)
    .join(', ')}`,
)

// Schema displayName must also be RU (not Latin-only)
for (const uid of contract.legalComponents) {
  const [cat, name] = uid.split('.')
  const schema = JSON.parse(
    fs.readFileSync(path.join(strapiRoot, `src/components/${cat}/${name}.json`), 'utf8'),
  )
  assert(
    !isLatinOnlyLegalLabel(schema.info.displayName),
    `English schema displayName ${uid}: ${schema.info.displayName}`,
  )
  for (const [attr, defn] of Object.entries(schema.attributes || {})) {
    if (!defn.displayName) continue
    assert(
      !isLatinOnlyLegalLabel(defn.displayName),
      `English schema attr displayName ${uid}.${attr}: ${defn.displayName}`,
    )
  }
}
for (const uid of contract.legalSingleTypes) {
  const schema = JSON.parse(
    fs.readFileSync(
      path.join(strapiRoot, `src/api/${uid}/content-types/${uid}/schema.json`),
      'utf8',
    ),
  )
  assert(
    !isLatinOnlyLegalLabel(schema.info.displayName),
    `English ST displayName ${uid}: ${schema.info.displayName}`,
  )
}

assert(
  ru['content-manager.components.legal.operator-block.email'] === 'Электронная почта',
  'operator email RU label must be Электронная почта',
)
assert(
  collectEnglishFallbackKeys(
    { 'probe.email': 'Email' },
    ['probe.email'],
  ).includes('probe.email'),
  'RU probe must flag Email as English fallback',
)

// Positive canonicalize
try {
  const ok = canonicalizeLegalPageData(validMinimal)
  assert(ok.body.length === 4, 'validMinimal body length')
  assert(ok.body[0].type === 'paragraph', 'order[0] paragraph')
  assert(ok.body[1].type === 'operator', 'order[1] operator')
  assert(ok.body[2].type === 'list', 'order[2] list')
  assert(ok.body[3].type === 'table', 'order[3] table')
  assert(!JSON.stringify(ok).includes('link_label'), 'public JSON must not include link_label')
  assert(!JSON.stringify(ok).includes('data-label'), 'no data-label in feed')
  assert(!/\b"id"\s*:/.test(JSON.stringify(ok)), 'no id key in feed')
} catch (err) {
  fail(`positive canonicalize failed: ${err.message}`)
}

// Schema flattening link_label → children
try {
  const fromLabel = canonicalizeLegalPageData({
    title: 'T',
    effective_date: '2026-03-01',
    body: [
      {
        type: 'paragraph',
        runs: [
          {
            type: 'link',
            href: '/privacy',
            link_label: 'Политика',
            strong: false,
          },
        ],
      },
    ],
  })
  assert(fromLabel.body[0].runs[0].children[0].value === 'Политика', 'link_label map')
} catch (err) {
  fail(`link_label canonicalize failed: ${err.message}`)
}

// ========== Negative probes ==========
expectReject(
  'authored-updatedAt-root',
  { ...validMinimal, updatedAt: '2026-01-01' },
  'forbidden meta field',
)
expectReject(
  'raw-html-field',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [{ type: 'paragraph', runs: [{ type: 'text', value: 'x', strong: false }], html: '<b>x</b>' }],
  },
  'unknown field',
)
expectReject(
  'raw-html-value',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [{ type: 'paragraph', runs: [{ type: 'text', value: '<b>x</b>', strong: false }] }],
  },
  'HTML-like value forbidden',
)
{
  try {
    assertNoHtmlLike('<b>x</b>', 'probe')
    fail('assertNoHtmlLike must throw for <b>x</b>')
  } catch (err) {
    if (!(err instanceof LegalContractError) && err?.name !== 'LegalContractError') {
      fail(`assertNoHtmlLike wrong error: ${err}`)
    }
  }
}
expectReject(
  'unknown-block',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [{ type: 'callout', runs: [{ type: 'text', value: 'x', strong: false }] }],
  },
  'unknown block',
)
expectReject(
  'unknown-run',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [{ type: 'paragraph', runs: [{ type: 'emoji', value: 'x', strong: false }] }],
  },
  'unknown run type',
)
expectReject(
  'invalid-href',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [
      {
        type: 'paragraph',
        runs: [
          {
            type: 'link',
            href: 'https://evil.example',
            children: [{ type: 'text', value: 'x', strong: false }],
          },
        ],
      },
    ],
  },
  'href not in exact allowlist',
)
expectReject(
  'empty-link-children',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [
      {
        type: 'paragraph',
        runs: [{ type: 'link', href: '/privacy', children: [] }],
      },
    ],
  },
  'link.children',
)
expectReject(
  'missing-strong',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [{ type: 'paragraph', runs: [{ type: 'text', value: 'x' }] }],
  },
  'text.strong',
)
expectReject(
  'non-boolean-strong',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [{ type: 'paragraph', runs: [{ type: 'text', value: 'x', strong: 'yes' }] }],
  },
  'text.strong',
)
expectReject(
  'duplicate-headers',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [
      {
        type: 'table',
        headers: ['A', 'A'],
        rows: [
          {
            cells: [
              { runs: [{ type: 'text', value: '1', strong: false }] },
              { runs: [{ type: 'text', value: '2', strong: false }] },
            ],
          },
        ],
      },
    ],
  },
  'headers must be unique',
)
expectReject(
  'short-row',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [
      {
        type: 'table',
        headers: ['A', 'B'],
        rows: [{ cells: [{ runs: [{ type: 'text', value: '1', strong: false }] }] }],
      },
    ],
  },
  'cells.length',
)
expectReject(
  'long-row',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [
      {
        type: 'table',
        headers: ['A'],
        rows: [
          {
            cells: [
              { runs: [{ type: 'text', value: '1', strong: false }] },
              { runs: [{ type: 'text', value: '2', strong: false }] },
            ],
          },
        ],
      },
    ],
  },
  'cells.length',
)
expectReject(
  'extra-schema-field',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [
      {
        type: 'paragraph',
        runs: [{ type: 'text', value: 'x', strong: false }],
        cssClass: 'x',
      },
    ],
  },
  'unknown field',
)
expectReject(
  'discriminator-leak-href-on-text',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [
      {
        type: 'paragraph',
        runs: [{ type: 'text', value: 'x', strong: false, href: '/privacy' }],
      },
    ],
  },
  'discriminator leakage',
)
expectReject(
  'empty-operator-field',
  {
    title: 'T',
    effective_date: '2026-03-01',
    body: [
      {
        type: 'operator',
        role_label: 'Оператор',
        legal_name: 'ООО',
        ogrn: '1',
        inn: '2',
        address: 'addr',
        email: '',
      },
    ],
  },
  'non-empty string',
)

// Order preservation probe (permute must change output)
const ordered = canonicalizeLegalPageData(validMinimal)
const permuted = {
  ...validMinimal,
  body: [validMinimal.body[3], validMinimal.body[0], validMinimal.body[1], validMinimal.body[2]],
}
const permutedOut = canonicalizeLegalPageData(permuted)
assert(ordered.body[0].type !== permutedOut.body[0].type, 'order permute must change first type')
assert(permutedOut.body.map((b) => b.type).join(',') === 'table,paragraph,operator,list', 'permuted order')

// Node proxy still Wave-1 only
const apiSrc = fs.readFileSync(path.join(root, 'lib/pages-cms-api.cjs'), 'utf8')
assert(!apiSrc.includes("privacy: '/api/privacy-page-feed'"), 'Phase C not started: Node FEED_PATH privacy')
assert(Object.keys(WAVE1_FEED_PATHS).length === 6, 'wave1 feeds 6')

// ========== Strapi boot + feed smoke (owned dynamic port) ==========
const SAMPLE_PRIVACY_BODY = [
  {
    __component: 'legal.paragraph-block',
    heading: '1. Общие положения',
    runs: [
      { type: 'text', value: 'См. ', strong: false },
      {
        type: 'link',
        href: 'https://grassigrosso.com',
        link_label: 'сайт',
        strong: false,
      },
    ],
  },
  {
    __component: 'legal.operator-block',
    role_label: 'Оператор персональных данных',
    legal_name: 'ООО «Грасси»',
    ogrn: '1239100014548',
    inn: '9102292969',
    address: 'Республика Крым, г. Симферополь, ул. Кубанская, д. 25',
    email: 'office@grassigrosso.com',
  },
  {
    __component: 'legal.list-block',
    items: [
      {
        runs: [
          { type: 'text', value: 'пункт', strong: true },
          { type: 'text', value: ' один', strong: false },
        ],
      },
    ],
  },
  {
    __component: 'legal.table-block',
    headers: [{ value: 'Кол1' }, { value: 'Кол2' }],
    rows: [
      {
        cells: [
          { runs: [{ type: 'text', value: 'a', strong: false }] },
          { runs: [{ type: 'text', value: 'b', strong: false }] },
        ],
      },
    ],
  },
]

/**
 * Boot Strapi under an explicit NODE_ENV, exercise feeds, destroy.
 * @param {'development'|'production'} nodeEnv
 */
async function runStrapiSmokeForEnv(nodeEnv) {
  const baseline = listListeners([...FORBIDDEN_PORTS])
  let port = await freePort()
  if (FORBIDDEN_PORTS.includes(port)) port = await freePort()
  assert(!FORBIDDEN_PORTS.includes(port), `${nodeEnv}: refusing forbidden port ${port}`)

  const workDir = fs.mkdtempSync(path.join(root, '.tmp', `phase6b-${nodeEnv}-`))
  const dbPath = path.join(workDir, 'data.db')
  const seedDb = path.join(strapiRoot, 'database', 'seed', 'data.db')
  assert(fs.existsSync(seedDb), `seed db missing ${seedDb}`)
  fs.copyFileSync(seedDb, dbPath)

  syncDistRuntimeAssets(strapiRoot)

  const prevCwd = process.cwd()
  const prevEnv = {
    HOST: process.env.HOST,
    PORT: process.env.PORT,
    DATABASE_FILENAME: process.env.DATABASE_FILENAME,
    DATABASE_CLIENT: process.env.DATABASE_CLIENT,
    NODE_ENV: process.env.NODE_ENV,
  }
  process.env.HOST = '127.0.0.1'
  process.env.PORT = String(port)
  process.env.DATABASE_CLIENT = 'sqlite'
  process.env.DATABASE_FILENAME = dbPath
  process.env.NODE_ENV = nodeEnv
  process.env.APP_KEYS = process.env.APP_KEYS || 'phase6bKey1,phase6bKey2,phase6bKey3,phase6bKey4'
  process.env.API_TOKEN_SALT = process.env.API_TOKEN_SALT || 'phase6bApiTokenSalt'
  process.env.ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'phase6bAdminJwt'
  process.env.TRANSFER_TOKEN_SALT = process.env.TRANSFER_TOKEN_SALT || 'phase6bTransfer'
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'phase6bJwtSecret'
  process.env.ENCRYPTION_KEY =
    process.env.ENCRYPTION_KEY || 'phase6bEncryptionKey0123456789ab'

  process.chdir(strapiRoot)
  // Fresh require after env change (Strapi reads NODE_ENV at boot).
  const strapiPkg = path.join(strapiRoot, 'node_modules/@strapi/strapi')
  delete require.cache[require.resolve(strapiPkg)]
  const { createStrapi } = require(strapiPkg)

  let app
  try {
    app = await createStrapi({
      appDir: strapiRoot,
      distDir: path.join(strapiRoot, 'dist'),
    }).load()

    assert(String(process.env.NODE_ENV) === nodeEnv, `${nodeEnv}: NODE_ENV drifted`)
    const reportedEnv = String(
      app.config?.get?.('environment') ?? app.config?.environment ?? process.env.NODE_ENV,
    )
    assert(reportedEnv === nodeEnv, `${nodeEnv}: Strapi environment=${reportedEnv}`)

    for (const uid of Object.values(LEGAL_SLUG_TO_UID)) {
      assert(Boolean(app.contentTypes?.[uid]), `${nodeEnv}: ct registered ${uid}`)
    }
    for (const uid of contract.legalComponents) {
      assert(Boolean(app.components?.[uid]), `${nodeEnv}: component registered ${uid}`)
    }

    const privacyUid = LEGAL_SLUG_TO_UID.privacy
    const docs = app.documents(privacyUid)
    const existing = await docs.findFirst({})
    const payload = {
      title: 'Политика в отношении обработки персональных данных',
      effective_date: '2026-03-01',
      body: SAMPLE_PRIVACY_BODY,
    }
    if (existing?.documentId) {
      await docs.update({ documentId: existing.documentId, data: payload })
    } else {
      await docs.create({ data: payload })
    }

    await app.listen()
    const base = `http://127.0.0.1:${port}`

    async function fetchJson(urlPath) {
      const res = await fetch(`${base}${urlPath}`)
      const text = await res.text()
      let body
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
      return { status: res.status, body }
    }

    const privacyFeed = await fetchJson(LEGAL_FEED_PATH_BY_SLUG.privacy)
    assert(
      privacyFeed.status === 200 && privacyFeed.body && 'data' in privacyFeed.body,
      `${nodeEnv}: privacy feed envelope status=${privacyFeed.status}`,
    )
    assert(Object.keys(privacyFeed.body).join(',') === 'data', `${nodeEnv}: privacy feed keys only data`)
    const pdata = privacyFeed.body.data
    assert(pdata && Array.isArray(pdata.body) && pdata.body.length === 4, `${nodeEnv}: privacy body`)
    assert(pdata.body[0].type === 'paragraph', `${nodeEnv}: order paragraph`)
    assert(pdata.body[1].type === 'operator', `${nodeEnv}: order operator`)
    assert(pdata.body[0].runs[1].children[0].value === 'сайт', `${nodeEnv}: link children`)
    assert(!JSON.stringify(pdata).includes('createdAt'), `${nodeEnv}: no createdAt`)
    assert(!JSON.stringify(pdata).includes('updatedAt'), `${nodeEnv}: no updatedAt`)
    assert(!JSON.stringify(pdata).includes('link_label'), `${nodeEnv}: no link_label`)

    for (const slug of ['terms', 'cookies']) {
      const r = await fetchJson(LEGAL_FEED_PATH_BY_SLUG[slug])
      assert(
        (r.status === 404 || r.status === 200) && r.body && 'data' in r.body,
        `${nodeEnv}: ${slug} feed status=${r.status}`,
      )
    }

    for (const slug of PAGES_CMS_SLUGS) {
      const r = await fetchJson(WAVE1_FEED_PATHS[slug])
      assert(
        (r.status === 200 || r.status === 404) &&
          r.body &&
          Object.prototype.hasOwnProperty.call(r.body, 'data'),
        `${nodeEnv}: wave1 ${slug} status=${r.status}`,
      )
    }
  } finally {
    try {
      if (app) await app.destroy()
    } catch {
      /* ignore */
    }
    process.chdir(prevCwd)
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
    try {
      fs.rmSync(workDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    const after = listListeners([...FORBIDDEN_PORTS])
    for (const p of FORBIDDEN_PORTS) {
      assert(after[p] === baseline[p], `${nodeEnv}: forbidden port ${p} changed`)
    }
  }
}

const bootModes = []
try {
  await runStrapiSmokeForEnv('development')
  bootModes.push('development')
  await runStrapiSmokeForEnv('production')
  bootModes.push('production')
} catch (err) {
  fail(`strapi smoke: ${err && err.stack ? err.stack : err}`)
}

if (failures.length) {
  console.error('check:pages-cms-phase-6b FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log(
  `check:pages-cms-phase-6b PASS legalST=${contract.legalSingleTypes.length}` +
    ` components=${contract.legalComponents.length}` +
    ` negatives=15 mechanical=55/37/17 unowned=0 wave1=${PAGES_CMS_SLUGS.length}` +
    ` strapiBoot=${bootModes.join('+')}`,
)
