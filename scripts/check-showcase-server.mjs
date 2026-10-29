import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'grassigrosso-showcase-'))
const apiPort = 3317
const strapiPort = 3318

const strapi = createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')
  if (req.url === '/api/catalog-feed') {
    res.end(JSON.stringify({
      items: [{
        id: 1,
        name: 'Тестовый матрас',
        slug: 'test-mattress',
        priceRub: 42000,
        price_rub: 42000,
        commerceKey: 'test-commerce-key',
        commerce_key: 'test-commerce-key',
        variants: [{ sku: 'SKU-1', priceRub: 42000 }],
      }],
    }))
    return
  }
  res.statusCode = 404
  res.end(JSON.stringify({ error: 'not found' }))
})

await new Promise((resolve, reject) => {
  strapi.once('error', reject)
  strapi.listen(strapiPort, '127.0.0.1', resolve)
})

const child = spawn(process.execPath, ['server.cjs'], {
  cwd: root,
  env: {
    ...process.env,
    SITE_MODE: 'showcase',
    NODE_ENV: 'development',
    PORT: String(apiPort),
    STRAPI_URL: `http://127.0.0.1:${strapiPort}`,
    DB_PATH: path.join(tempDir, 'leads.db'),
    BOT_TOKEN: 'test',
    CHAT_ID: '1',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '465',
    SMTP_SECURE: 'true',
    SMTP_USER: 'test@example.com',
    SMTP_PASS: 'test',
    MAIL_FROM: 'test@example.com',
    MAIL_TO: 'test@example.com',
    SPAM_DISABLE_IN_NON_PROD: 'true',
    GEMINI_API_KEY: 'must-not-be-used',
    MEDUSA_URL: 'http://127.0.0.1:65534',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let output = ''
child.stdout.on('data', (chunk) => { output += chunk })
child.stderr.on('data', (chunk) => { output += chunk })

async function waitForHealth() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${apiPort}/health`)
      if (response.ok) return response.json()
    } catch (_) {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`Showcase server did not start.\n${output}`)
}

try {
  const health = await waitForHealth()
  assert.equal(health.status, 'ok')
  assert.equal(health.siteMode, 'showcase')

  const smart = await fetch(`http://127.0.0.1:${apiPort}/api/catalog/smart-select`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: 'мягкий матрас' }),
  })
  assert.equal(smart.status, 404, 'smart selector route must not exist in showcase')

  const commerce = await fetch(`http://127.0.0.1:${apiPort}/api/commerce/catalog`)
  assert.equal(commerce.status, 404, 'commerce routes must not exist in showcase')

  const catalogue = await fetch(`http://127.0.0.1:${apiPort}/api/catalog/products`)
  assert.equal(catalogue.status, 200)
  const payload = await catalogue.json()
  assert.equal(payload.items[0].name, 'Тестовый матрас')
  for (const field of ['price', 'priceRub', 'price_rub', 'commerceKey', 'commerce_key', 'variants']) {
    assert.equal(field in payload.items[0], false, `${field} leaked from showcase catalogue API`)
  }

  assert.match(output, /SITE_MODE:\s+showcase/)
  assert.doesNotMatch(output, /must-not-be-used/)
  console.log('✅ Showcase server isolation: endpoints unavailable, catalogue commerce data removed')
} finally {
  child.kill('SIGTERM')
  await Promise.race([
    new Promise((resolve) => child.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ])
  await new Promise((resolve) => strapi.close(resolve))
  await rm(tempDir, { recursive: true, force: true })
}
