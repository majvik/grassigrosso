import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), 'utf8'))

test('Medusa runtime pins the accepted Core-only package set', async () => {
  const pkg = await readJson('medusa-commerce/package.json')
  assert.equal(pkg.engines.node, '^20.19.0 || >=22.12.0')
  assert.equal(pkg.dependencies['@medusajs/medusa'], '2.21.2')
  assert.equal(pkg.dependencies['@medusajs/framework'], '2.21.2')
  assert.equal(pkg.dependencies['@medusajs/cli'], '2.21.2')
  assert.equal(pkg.dependencies['@medusajs/admin-sdk'], '2.21.2')
  assert.equal(pkg.dependencies['@medusajs/ui'], '4.2.6')
  assert.equal(pkg.devDependencies.react, '18.3.1')
  assert.equal(pkg.devDependencies['react-dom'], '18.3.1')
  assert.equal(pkg.devDependencies['ts-node'], '10.9.2')
  assert.equal(pkg.dependencies['@medusajs/rbac'], undefined)
  assert.equal(pkg.dependencies['@medusajs/auth-oidc'], undefined)
})

test('runtime config requires PostgreSQL and Redis without Enterprise flags', async () => {
  const config = await readFile(path.join(root, 'medusa-commerce/medusa-config.ts'), 'utf8')
  assert.match(config, /databaseUrl:\s*process\.env\.DATABASE_URL/)
  assert.match(config, /redisUrl:\s*process\.env\.REDIS_URL/)
  assert.match(config, /process\.env\.NODE_ENV\s*===\s*['"]production['"]/)
  assert.doesNotMatch(config, /MEDUSA_FF_RBAC|auth-oidc|@medusajs\/rbac/)
})

test('seed contract creates a RUB Russia sales region and Russian Admin remains available', async () => {
  const seed = await readFile(path.join(root, 'medusa-commerce/src/scripts/seed.ts'), 'utf8')
  assert.match(seed, /currency_code:\s*["']rub["']/i)
  assert.match(seed, /countries:\s*\[["']ru["']\]/i)

  const runtime = await readJson('medusa-commerce/runtime-contract.json')
  assert.equal(runtime.adminLocales.includes('ru'), true)
  assert.equal(runtime.defaultCurrency, 'rub')
  assert.deepEqual(runtime.countries, ['ru'])
})

test('local compose pins PostgreSQL and Redis images, healthchecks, ports and named volumes', async () => {
  const compose = await readFile(path.join(root, 'docker-compose.commerce.yml'), 'utf8')
  assert.match(compose, /postgres:16[^\s]*@sha256:[a-f0-9]{64}/)
  assert.match(compose, /redis:7\.2[^\s]*@sha256:[a-f0-9]{64}/)
  assert.match(compose, /pg_isready/)
  assert.match(compose, /redis-cli.*ping/)
  assert.match(compose, /127\.0\.0\.1:5433:5432/)
  assert.match(compose, /127\.0\.0\.1:6380:6379/)
  assert.match(compose, /commerce_postgres_data:/)
  assert.match(compose, /commerce_redis_data:/)
})

test('environment example uses dedicated ports and non-production placeholders', async () => {
  const env = await readFile(path.join(root, '.env.commerce.example'), 'utf8')
  assert.match(env, /^MEDUSA_PORT=9000$/m)
  assert.match(env, /^DATABASE_URL=postgres:\/\/medusa:medusa_local_only@127\.0\.0\.1:5433\/grassigrosso_commerce$/m)
  assert.match(env, /^REDIS_URL=redis:\/\/127\.0\.0\.1:6380$/m)
  assert.doesNotMatch(env, /MEDUSA_FF_RBAC|production|twc1\.net/i)
})
