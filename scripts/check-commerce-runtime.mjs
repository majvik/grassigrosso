import { spawn, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkBackupRestore } from './commerce/check-backup-restore.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const composeFile = path.join(root, 'docker-compose.commerce.yml')
const commerceRoot = path.join(root, 'medusa-commerce')
const env = {
  ...process.env,
  NODE_ENV: 'development',
  PORT: '9000',
  MEDUSA_PORT: '9000',
  DATABASE_URL: 'postgres://medusa:medusa_local_only@127.0.0.1:5433/grassigrosso_commerce',
  REDIS_URL: 'redis://127.0.0.1:6380',
  STORE_CORS: 'http://127.0.0.1:5174',
  ADMIN_CORS: 'http://127.0.0.1:9000',
  AUTH_CORS: 'http://127.0.0.1:9000,http://127.0.0.1:5174',
  MEDUSA_BACKEND_URL: 'http://127.0.0.1:9000',
  JWT_SECRET: 'local-commerce-jwt-change-me',
  COOKIE_SECRET: 'local-commerce-cookie-change-me',
  MEDUSA_DISABLE_TELEMETRY: 'true',
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  })
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `${command} ${args.join(' ')} failed`)
  }
  return result.stdout
}

async function waitForHealth(url, child, timeoutMs = 90_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`Medusa exited before health check (code ${child.exitCode})`)
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) })
      if (response.ok) return response.status
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function main() {
  let server
  try {
    run('docker', ['compose', '-f', composeFile, 'up', '-d', '--wait'])
    const postgres = run('docker', [
      'compose', '-f', composeFile, 'exec', '-T', 'postgres', 'pg_isready', '-U', 'medusa', '-d', 'grassigrosso_commerce',
    ]).trim()
    const redis = run('docker', [
      'compose', '-f', composeFile, 'exec', '-T', 'redis', 'redis-cli', 'ping',
    ]).trim()
    if (!postgres.includes('accepting connections')) throw new Error(`PostgreSQL health mismatch: ${postgres}`)
    if (redis !== 'PONG') throw new Error(`Redis health mismatch: ${redis}`)

    run('npm', ['run', 'db:migrate'], { cwd: commerceRoot })
    checkBackupRestore()

    const russianTranslation = path.join(
      commerceRoot,
      'node_modules/@medusajs/dashboard/src/i18n/translations/ru.json',
    )
    if (!existsSync(russianTranslation)) throw new Error('Russian Medusa Admin translation is absent')

    server = spawn('npm', ['run', 'start'], {
      cwd: commerceRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let serverOutput = ''
    server.stdout.on('data', (chunk) => (serverOutput += chunk.toString()))
    server.stderr.on('data', (chunk) => (serverOutput += chunk.toString()))
    await waitForHealth('http://127.0.0.1:9000/health', server)
    console.log(
      'Commerce runtime PASS: PostgreSQL accepting connections; Redis PONG; backup/restore PASS; Russian Admin locale present; /health 200.',
    )
  } finally {
    if (server && server.exitCode === null) {
      server.kill('SIGTERM')
      await new Promise((resolve) => setTimeout(resolve, 500))
      if (server.exitCode === null) server.kill('SIGKILL')
    }
    run('docker', ['compose', '-f', composeFile, 'down'])
  }
}

main().catch((error) => {
  console.error(`Commerce runtime FAIL: ${error.message}`)
  process.exitCode = 1
})
