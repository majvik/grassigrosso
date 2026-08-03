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

function rawRequest(port, reqPath, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path: reqPath, method, headers },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const body = Buffer.concat(chunks)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body,
            text: body.toString('utf8'),
          })
        })
      },
    )
    req.on('error', reject)
    req.end()
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

  const outsideDir = path.join(tmp, 'outside-dir')
  fs.mkdirSync(outsideDir)
  fs.writeFileSync(path.join(outsideDir, 'secret.png'), 'leaked')
  fs.symlinkSync(outsideDir, path.join(nested, 'linked-dir'))

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
    resolveSafeUploadPath(nested, '/uploads/linked-dir/secret.png').reason === 'symlink-escape',
    'directory-symlink escape',
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
    const fileSize = buf.length
    const ct = hit.headers.get('content-type') || ''
    assert(/image\//.test(ct) || /octet-stream/.test(ct), `unexpected content-type ${ct}`)
    assert((hit.headers.get('cache-control') || '').includes('max-age'), 'missing cache-control')

    const head = await rawRequest(nodePort, `/uploads/${sample}`, { method: 'HEAD' })
    assert(head.status === 200, `HEAD expected 200, got ${head.status}`)
    assert(head.body.length === 0, `HEAD body must be empty, got ${head.body.length} bytes`)
    const headLen = Number(head.headers['content-length'] || 0)
    assert(headLen === fileSize, `HEAD Content-Length ${headLen} !== ${fileSize}`)

    const rangeEnd = Math.min(9, fileSize - 1)
    const ranged = await rawRequest(nodePort, `/uploads/${sample}`, {
      headers: { Range: `bytes=0-${rangeEnd}` },
    })
    assert(ranged.status === 206, `range expected 206, got ${ranged.status}`)
    const cr = String(ranged.headers['content-range'] || '')
    assert(
      cr === `bytes 0-${rangeEnd}/${fileSize}`,
      `Content-Range expected bytes 0-${rangeEnd}/${fileSize}, got ${cr}`,
    )
    assert(ranged.body.length === rangeEnd + 1, `range body length ${ranged.body.length}`)
    assert(ranged.body.equals(buf.subarray(0, rangeEnd + 1)), 'range bytes mismatch')

    const unsat = await rawRequest(nodePort, `/uploads/${sample}`, {
      headers: { Range: `bytes=${fileSize + 10}-${fileSize + 20}` },
    })
    assert(unsat.status === 416, `unsatisfiable range expected 416, got ${unsat.status}`)

    const missToken = `phase5_missing_${Date.now()}.avif`
    const miss = await fetch(`http://127.0.0.1:${nodePort}/uploads/${missToken}`)
    assert(miss.status === 404, `miss expected 404, got ${miss.status}`)
    const missText = await miss.text()
    assert(missText.length > 0, 'miss body empty')
    assert(!String(miss.status).startsWith('5'), 'miss must not be 5xx')
    assert(missText.includes('Upload not found') || missText === NOT_FOUND_BODY, 'controlled 404 body')

    const trav = await rawRequest(nodePort, '/uploads/%2e%2e/package.json')
    assert(trav.status === 404, `encoded traversal expected 404, got ${trav.status}`)
    const travPlain = await rawRequest(nodePort, '/uploads/../package.json')
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
