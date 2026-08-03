#!/usr/bin/env node
/**
 * Phase 5 D1 — disk-first /uploads unit + HTTP gate (no Strapi required).
 */
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  resolveSafeUploadPath,
  createUploadsDiskFirstMiddleware,
  NOT_FOUND_BODY,
  defaultUploadsRoot,
} = require('../lib/uploads-disk-first.cjs')

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const uploadsRoot = defaultUploadsRoot(root)
const failures = []

function assert(cond, msg) {
  if (!cond) failures.push(msg)
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer()
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close((err) => (err ? reject(err) : resolve(port)))
    })
    s.on('error', reject)
  })
}

// --- Path safety unit tests ---
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-d1-'))
  const nested = path.join(tmp, 'safe')
  fs.mkdirSync(nested)
  const file = path.join(nested, 'ok.png')
  fs.writeFileSync(file, Buffer.from([0x89, 0x50, 0x4e, 0x47]))
  const outside = path.join(tmp, 'outside.png')
  fs.writeFileSync(outside, 'secret')
  fs.symlinkSync(outside, path.join(nested, 'escape-link.png'))
  fs.mkdirSync(path.join(nested, 'subdir'))

  assert(resolveSafeUploadPath(nested, '/uploads/ok.png').ok, 'hit ok.png')
  assert(resolveSafeUploadPath(nested, '/uploads/missing.png').reason === 'missing', 'missing')
  assert(resolveSafeUploadPath(nested, '/uploads/../outside.png').reason === 'traversal', 'plain traversal')
  assert(
    resolveSafeUploadPath(nested, '/uploads/%2e%2e/outside.png').reason === 'traversal',
    'encoded traversal',
  )
  assert(resolveSafeUploadPath(nested, '/uploads/subdir').reason === 'directory', 'directory')
  assert(
    resolveSafeUploadPath(nested, '/uploads/escape-link.png').reason === 'symlink-escape',
    'symlink escape',
  )
  assert(
    resolveSafeUploadPath(nested, '/uploads/%E0%A4%A').reason === 'malformed-encoding',
    'malformed encoding',
  )
  assert(resolveSafeUploadPath(nested, '/uploads/ok%00.png').reason === 'nul', 'nul encoded')

  fs.rmSync(tmp, { recursive: true, force: true })
}

// --- HTTP against short-lived server.cjs (STRAPI_URL points at dead port) ---
let child = null
const deadStrapiPort = await freePort()
const nodePort = await freePort()
const sample = fs.readdirSync(uploadsRoot).find((n) => n.endsWith('.avif') || n.endsWith('.png'))
assert(sample, 'expected at least one upload file on disk')

try {
  const env = {
    ...process.env,
    PORT: String(nodePort),
    NODE_ENV: 'development',
    STRAPI_URL: `http://127.0.0.1:${deadStrapiPort}`,
    BOT_TOKEN: 'fake',
    CHAT_ID: '123',
    SMTP_HOST: '127.0.0.1',
    SMTP_PORT: '465',
    SMTP_SECURE: 'true',
    SMTP_USER: 'test',
    SMTP_PASS: 'test',
    MAIL_FROM: 'test@example.com',
    MAIL_TO: 'test@example.com',
    DB_PATH: path.join(root, '.tmp/leads-d1-check.db'),
  }
  child = spawn(process.execPath, [path.join(root, 'server.cjs')], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let ready = false
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${nodePort}/health`)
      if (r.ok) {
        ready = true
        break
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 100))
  }
  assert(ready, 'server.cjs health not ready')

  if (ready && sample) {
    const hit = await fetch(`http://127.0.0.1:${nodePort}/uploads/${sample}`)
    assert(hit.status === 200, `disk hit expected 200, got ${hit.status}`)
    const buf = Buffer.from(await hit.arrayBuffer())
    assert(buf.length > 0, 'disk hit body empty')
    const ct = hit.headers.get('content-type') || ''
    assert(/image\//.test(ct) || /octet-stream/.test(ct), `unexpected content-type ${ct}`)
    assert((hit.headers.get('cache-control') || '').includes('max-age'), 'missing cache-control')

    const head = await fetch(`http://127.0.0.1:${nodePort}/uploads/${sample}`, { method: 'HEAD' })
    assert(head.status === 200, `HEAD expected 200, got ${head.status}`)

    const missToken = `phase5_missing_${Date.now()}.avif`
    const miss = await fetch(`http://127.0.0.1:${nodePort}/uploads/${missToken}`)
    assert(miss.status === 404, `miss expected 404, got ${miss.status}`)
    const missText = await miss.text()
    assert(missText.length > 0, 'miss body empty')
    assert(!String(miss.status).startsWith('5'), 'miss must not be 5xx')
    assert(missText.includes('Upload not found') || missText === NOT_FOUND_BODY, 'controlled 404 body')

    // fetch() normalizes ../ before the wire — use raw http path for traversal negatives.
    async function rawGet(reqPath) {
      return new Promise((resolve, reject) => {
        http
          .get({ host: '127.0.0.1', port: nodePort, path: reqPath }, (res) => {
            const chunks = []
            res.on('data', (c) => chunks.push(c))
            res.on('end', () =>
              resolve({
                status: res.statusCode,
                body: Buffer.concat(chunks).toString('utf8'),
                reject: res.headers['x-uploads-reject'],
              }),
            )
          })
          .on('error', reject)
      })
    }
    const trav = await rawGet('/uploads/%2e%2e/package.json')
    assert(trav.status === 404, `encoded traversal expected 404, got ${trav.status}`)
    const travPlain = await rawGet('/uploads/../package.json')
    assert(travPlain.status === 404, `plain traversal expected 404, got ${travPlain.status}`)
  }
} finally {
  if (child && !child.killed) {
    child.kill('SIGTERM')
    await new Promise((r) => setTimeout(r, 200))
    try {
      child.kill('SIGKILL')
    } catch {
      /* ignore */
    }
  }
}

if (failures.length) {
  console.error('check:pages-cms-uploads-disk-first FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}
console.log('check:pages-cms-uploads-disk-first PASS')
