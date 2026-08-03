/**
 * Phase 5 D2 — fully isolated owned stack (Strapi + Node + Vite) on free ports.
 * Never binds or stops :1337 / :3000 / :5174.
 */
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fork, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const strapiRoot = path.join(root, 'strapi-catalog')
const FORBIDDEN_PORTS = Object.freeze([1337, 3000, 5174])

export { FORBIDDEN_PORTS, root, strapiRoot }

export function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close((err) => (err ? reject(err) : resolve(port)))
    })
    s.on('error', reject)
  })
}

export async function allocateIsolatedPorts() {
  const ports = []
  for (let i = 0; i < 3; i++) {
    let port
    for (let attempt = 0; attempt < 20; attempt++) {
      port = await freePort()
      if (!FORBIDDEN_PORTS.includes(port) && !ports.includes(port)) break
      port = null
    }
    if (!port) throw new Error('failed to allocate free non-forbidden port')
    ports.push(port)
  }
  return { strapiPort: ports[0], nodePort: ports[1], vitePort: ports[2] }
}

export function listListeners(ports) {
  const out = {}
  for (const port of ports) {
    try {
      const { spawnSync } = require('node:child_process')
      const r = spawnSync('lsof', [`-iTCP:${port}`, '-sTCP:LISTEN', '-n', '-P'], {
        encoding: 'utf8',
      })
      out[port] = String(r.stdout || '').trim()
    } catch {
      out[port] = ''
    }
  }
  return out
}

export function gitPorcelain() {
  const { spawnSync } = require('node:child_process')
  const r = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' })
  if (r.status !== 0) throw new Error('git status failed')
  return String(r.stdout || '')
}

function killTree(child) {
  if (!child || child.killed) return
  try {
    if (process.platform !== 'win32' && child.pid) {
      try {
        process.kill(-child.pid, 'SIGTERM')
      } catch {
        child.kill('SIGTERM')
      }
    } else {
      child.kill('SIGTERM')
    }
  } catch {
    /* ignore */
  }
}

function forceKillTree(child) {
  if (!child || child.killed) return
  try {
    if (process.platform !== 'win32' && child.pid) {
      try {
        process.kill(-child.pid, 'SIGKILL')
      } catch {
        child.kill('SIGKILL')
      }
    } else {
      child.kill('SIGKILL')
    }
  } catch {
    /* ignore */
  }
}

/**
 * @returns {Promise<{
 *   ports: { strapiPort: number, nodePort: number, vitePort: number },
 *   dbPath: string,
 *   snapshotDir: string,
 *   strapi: import('node:child_process').ChildProcess,
 *   node: import('node:child_process').ChildProcess,
 *   vite: import('node:child_process').ChildProcess | null,
 *   ipc: (msg: object, timeoutMs?: number) => Promise<object>,
 *   stopStrapiOnly: () => Promise<void>,
 *   dispose: () => Promise<void>,
 *   baselineListeners: Record<number, string>,
 *   baselinePorcelain: string,
 * }>}
 */
export async function startIsolatedPagesCmsStack(options = {}) {
  const withVite = options.withVite !== false
  const ports = await allocateIsolatedPorts()
  const { strapiPort, nodePort, vitePort } = ports

  for (const p of FORBIDDEN_PORTS) {
    if ([strapiPort, nodePort, vitePort].includes(p)) {
      throw new Error(`refusing forbidden port ${p}`)
    }
  }

  const baselineListeners = listListeners([...FORBIDDEN_PORTS])
  const baselinePorcelain = gitPorcelain()

  const workDir = fs.mkdtempSync(path.join(root, '.tmp', 'phase5-stack-'))
  const dbPath = path.join(workDir, 'data.db')
  const seedDb = path.join(strapiRoot, 'database', 'seed', 'data.db')
  if (!fs.existsSync(seedDb)) throw new Error(`seed db missing: ${seedDb}`)
  fs.copyFileSync(seedDb, dbPath)
  const snapshotDir = path.join(workDir, 'snapshots')
  fs.mkdirSync(snapshotDir, { recursive: true })

  // Always seed pages fixtures so referenced /uploads exist on disk (D4 must not hide misses).
  // Signal-only smoke can skip seeding to avoid mutating uploads and keep the gate fast.
  if (options.seedFixtures !== false) {
    await seedHarnessDb(dbPath)
  }

  const childPath = path.join(root, 'scripts/lib/pages-cms-strapi-harness-child.cjs')
  const strapiEnv = {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(strapiPort),
    DATABASE_CLIENT: 'sqlite',
    DATABASE_FILENAME: dbPath,
    APP_KEYS: process.env.APP_KEYS || 'phase5Key1,phase5Key2,phase5Key3,phase5Key4',
    API_TOKEN_SALT: process.env.API_TOKEN_SALT || 'phase5ApiTokenSalt',
    ADMIN_JWT_SECRET: process.env.ADMIN_JWT_SECRET || 'phase5AdminJwt',
    TRANSFER_TOKEN_SALT: process.env.TRANSFER_TOKEN_SALT || 'phase5Transfer',
    JWT_SECRET: process.env.JWT_SECRET || 'phase5JwtSecret',
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'phase5EncryptionKey0123456789ab',
  }

  const strapi = fork(childPath, [], {
    cwd: strapiRoot,
    env: strapiEnv,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    detached: process.platform !== 'win32',
  })

  let strapiLog = ''
  strapi.stdout?.on('data', (c) => {
    strapiLog += String(c)
  })
  strapi.stderr?.on('data', (c) => {
    strapiLog += String(c)
  })

  const ready = await waitIpc(strapi, (m) => m && m.type === 'ready', 120000)
  if (!ready.ok) {
    forceKillTree(strapi)
    throw new Error(`Strapi harness failed: ${ready.error || strapiLog.slice(-2000)}`)
  }

  let ipcSeq = 1
  let strapiStopped = false
  const pending = new Map()
  strapi.on('message', (msg) => {
    if (msg && msg.id != null && pending.has(msg.id)) {
      pending.get(msg.id)(msg)
      pending.delete(msg.id)
    }
  })
  strapi.on('error', () => {
    /* ignore IPC/channel errors after shutdown */
  })

  function ipc(msg, timeoutMs = 30000) {
    const id = ipcSeq++
    return new Promise((resolve, reject) => {
      if (strapiStopped || strapi.killed || strapi.exitCode != null || !strapi.connected) {
        reject(new Error(`IPC unavailable for ${msg.type}`))
        return
      }
      const t = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`IPC timeout for ${msg.type}`))
      }, timeoutMs)
      pending.set(id, (m) => {
        clearTimeout(t)
        resolve(m)
      })
      try {
        strapi.send({ ...msg, id })
      } catch (err) {
        clearTimeout(t)
        pending.delete(id)
        reject(err)
      }
    })
  }

  const nodeEnv = {
    ...process.env,
    NODE_ENV: 'development',
    PORT: String(nodePort),
    STRAPI_URL: `http://127.0.0.1:${strapiPort}`,
    PAGES_STRAPI_CACHE_TTL_MS: '0',
    PAGES_STRAPI_CACHE_STALE_MS: '0',
    CATALOG_STRAPI_CACHE_TTL_MS: '0',
    PAGES_CMS_SNAPSHOT_DIR: snapshotDir,
    BOT_TOKEN: 'fake',
    CHAT_ID: '123',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '465',
    SMTP_SECURE: 'true',
    SMTP_USER: 'test',
    SMTP_PASS: 'test',
    MAIL_FROM: 'test@example.com',
    MAIL_TO: 'test@example.com',
    DB_PATH: path.join(workDir, 'leads.db'),
  }

  const node = spawn(process.execPath, [path.join(root, 'server.cjs')], {
    cwd: root,
    env: nodeEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  })
  let nodeLog = ''
  node.stdout?.on('data', (c) => {
    nodeLog += String(c)
  })
  node.stderr?.on('data', (c) => {
    nodeLog += String(c)
  })

  await waitHttpOk(`http://127.0.0.1:${nodePort}/health`, 30000, () => nodeLog)

  let vite = null
  if (withVite) {
    vite = spawn(
      process.execPath,
      [
        path.join(root, 'node_modules/vite/bin/vite.js'),
        '--host',
        '127.0.0.1',
        '--port',
        String(vitePort),
        '--strictPort',
      ],
      {
        cwd: root,
        env: { ...process.env, DEV_API_PORT: String(nodePort) },
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: process.platform !== 'win32',
      },
    )
    let viteLog = ''
    vite.stdout?.on('data', (c) => {
      viteLog += String(c)
    })
    vite.stderr?.on('data', (c) => {
      viteLog += String(c)
    })
    await waitHttpOk(`http://127.0.0.1:${vitePort}/catalog`, 60000, () => viteLog)
  }

  async function stopStrapiOnly() {
    if (strapiStopped) return
    strapiStopped = true
    try {
      await ipc({ type: 'shutdown' }, 10000)
    } catch {
      /* ignore */
    }
    killTree(strapi)
    await delay(500)
    forceKillTree(strapi)
  }

  let disposed = false
  async function dispose() {
    if (disposed) return
    disposed = true
    removeSignalHandlers()
    try {
      await stopStrapiOnly()
    } catch {
      /* ignore */
    }
    killTree(node)
    killTree(vite)
    await delay(300)
    forceKillTree(strapi)
    forceKillTree(node)
    forceKillTree(vite)
    try {
      fs.rmSync(workDir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }

  /** Sync teardown for SIGINT/SIGTERM — try/finally alone is not enough. */
  function syncTeardownOwned() {
    disposed = true
    forceKillTree(strapi)
    forceKillTree(node)
    forceKillTree(vite)
    for (let i = 0; i < 10; i++) {
      try {
        fs.rmSync(workDir, { recursive: true, force: true })
        if (!fs.existsSync(workDir)) break
      } catch {
        /* retry while SQLite locks clear */
      }
      const { spawnSync } = require('node:child_process')
      spawnSync(process.execPath, ['-e', 'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,50)'])
    }
  }

  const onSigInt = () => {
    removeSignalHandlers()
    syncTeardownOwned()
    process.exit(130)
  }
  const onSigTerm = () => {
    removeSignalHandlers()
    syncTeardownOwned()
    process.exit(143)
  }
  function removeSignalHandlers() {
    process.removeListener('SIGINT', onSigInt)
    process.removeListener('SIGTERM', onSigTerm)
  }

  const installSignals = options.installSignalHandlers !== false
  if (installSignals) {
    process.on('SIGINT', onSigInt)
    process.on('SIGTERM', onSigTerm)
  }

  return {
    ports,
    dbPath,
    snapshotDir,
    workDir,
    strapi,
    node,
    vite,
    ipc,
    stopStrapiOnly,
    dispose,
    syncTeardownOwned,
    baselineListeners,
    baselinePorcelain,
    get strapiStopped() {
      return strapiStopped
    },
  }
}

async function seedHarnessDb(dbPath) {
  const { syncDistRuntimeAssets } = require(path.join(strapiRoot, 'scripts/prepare-dist.cjs'))
  syncDistRuntimeAssets(strapiRoot)
  const prev = process.cwd()
  process.chdir(strapiRoot)
  const prevDb = process.env.DATABASE_FILENAME
  process.env.DATABASE_FILENAME = dbPath
  process.env.HOST = '127.0.0.1'
  if (!process.env.APP_KEYS) process.env.APP_KEYS = 'phase5Key1,phase5Key2,phase5Key3,phase5Key4'
  if (!process.env.API_TOKEN_SALT) process.env.API_TOKEN_SALT = 'phase5ApiTokenSalt'
  if (!process.env.ADMIN_JWT_SECRET) process.env.ADMIN_JWT_SECRET = 'phase5AdminJwt'
  if (!process.env.TRANSFER_TOKEN_SALT) process.env.TRANSFER_TOKEN_SALT = 'phase5Transfer'
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'phase5JwtSecret'
  if (!process.env.ENCRYPTION_KEY) process.env.ENCRYPTION_KEY = 'phase5EncryptionKey0123456789ab'

  try {
    const { createStrapi } = require(path.join(strapiRoot, 'node_modules/@strapi/strapi'))
    const { seedPagesCmsFromFixtures } = require(path.join(root, 'scripts/pages-cms/seed-core.cjs'))
    const { resolveFixtureMediaUrl } = await import(
      path.join(root, 'scripts/pages-cms/media-resolve.mjs')
    )
    const fixturesDir = path.join(root, 'scripts/fixtures/pages-cms')
    const fixturesBySlug = {}
    for (const name of fs.readdirSync(fixturesDir)) {
      if (!name.endsWith('.json')) continue
      const slug = name.replace(/\.json$/, '')
      fixturesBySlug[slug] = JSON.parse(fs.readFileSync(path.join(fixturesDir, name), 'utf8'))
    }
    const app = await createStrapi({
      appDir: strapiRoot,
      distDir: path.join(strapiRoot, 'dist'),
    }).load()
    try {
      await seedPagesCmsFromFixtures(app, {
        fixturesBySlug,
        resolveMedia: (url) => {
          const resolved = resolveFixtureMediaUrl(url, { repoRoot: root })
          return { absolutePath: resolved.absolutePath }
        },
      })
    } finally {
      await app.destroy()
    }
  } finally {
    process.chdir(prev)
    if (prevDb == null) delete process.env.DATABASE_FILENAME
    else process.env.DATABASE_FILENAME = prevDb
  }
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function waitIpc(child, pred, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('IPC ready timeout')), timeoutMs)
    const onMsg = (msg) => {
      if (pred(msg)) {
        clearTimeout(t)
        child.off('message', onMsg)
        resolve(msg)
      }
    }
    child.on('message', onMsg)
    child.on('exit', (code) => {
      clearTimeout(t)
      reject(new Error(`Strapi child exited ${code}`))
    })
  })
}

async function waitHttpOk(url, timeoutMs, logFn) {
  const deadline = Date.now() + timeoutMs
  let lastErr = ''
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url)
      if (r.status > 0 && r.status < 500) return
      lastErr = `status ${r.status}`
    } catch (e) {
      lastErr = String(e && e.message ? e.message : e)
    }
    await delay(250)
  }
  throw new Error(`HTTP not ready ${url}: ${lastErr}\n${logFn ? logFn().slice(-1500) : ''}`)
}

export function assertForbiddenPortsUntouched(baselineListeners) {
  const now = listListeners([...FORBIDDEN_PORTS])
  for (const port of FORBIDDEN_PORTS) {
    if (now[port] !== baselineListeners[port]) {
      throw new Error(
        `forbidden port :${port} listener changed\n before=${baselineListeners[port] || '(none)'}\n after=${now[port] || '(none)'}`,
      )
    }
  }
}
