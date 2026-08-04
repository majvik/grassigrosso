#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'grassigrosso-submit-queue-'))
const sockets = new Set()
let child
let smtpMessages = 0

const slowSmtp = net.createServer((socket) => {
  sockets.add(socket)
  socket.on('close', () => sockets.delete(socket))
  let buffer = ''
  let dataMode = false

  // External delivery is deliberately slower than durable HTTP acceptance.
  setTimeout(() => socket.write('220 qa-smtp ESMTP\r\n'), 2_500)
  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8')
    if (dataMode) {
      if (!buffer.includes('\r\n.\r\n')) return
      smtpMessages += 1
      dataMode = false
      buffer = ''
      socket.write('250 2.0.0 queued\r\n')
      return
    }

    const lines = buffer.split('\r\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const command = line.toUpperCase()
      if (command.startsWith('EHLO') || command.startsWith('HELO')) {
        socket.write('250-qa-smtp\r\n250 AUTH PLAIN\r\n')
      } else if (command.startsWith('AUTH PLAIN')) {
        socket.write('235 2.7.0 authenticated\r\n')
      } else if (command.startsWith('MAIL FROM') || command.startsWith('RCPT TO')) {
        socket.write('250 2.1.0 ok\r\n')
      } else if (command === 'DATA') {
        dataMode = true
        buffer = ''
        socket.write('354 End data with <CR><LF>.<CR><LF>\r\n')
      } else if (command === 'QUIT') {
        socket.end('221 2.0.0 bye\r\n')
      } else if (command) {
        socket.write('250 2.0.0 ok\r\n')
      }
    }
  })
})

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve(server.address().port))
  })
}

async function waitForHealth(baseUrl, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`)
      if (response.ok) return response.json()
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('server did not become healthy')
}

async function waitForDelivery(baseUrl, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const health = await (await fetch(`${baseUrl}/health`)).json()
    if (health.queueSize === 0 && smtpMessages >= 2) return health
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error(`delivery did not finish (smtpMessages=${smtpMessages})`)
}

async function main() {
  const smtpPort = await listen(slowSmtp)
  const probe = net.createServer()
  const appPort = await listen(probe)
  await new Promise((resolve) => probe.close(resolve))

  child = spawn(process.execPath, ['server.cjs'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: String(appPort),
      DB_PATH: path.join(tempDir, 'leads.db'),
      BOT_TOKEN: '',
      CHAT_ID: '',
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: String(smtpPort),
      SMTP_SECURE: 'false',
      SMTP_USER: 'qa@example.test',
      SMTP_PASS: 'qa-password',
      MAIL_FROM: 'qa@example.test',
      MAIL_TO: 'sales@example.test',
      QUEUE_RETRY_INTERVAL_MS: '60000',
      DELIVERY_CHANNEL_TIMEOUT_MS: '5000',
    },
  })

  const baseUrl = `http://127.0.0.1:${appPort}`
  await waitForHealth(baseUrl)

  const startedAt = Date.now()
  const response = await fetch(`${baseUrl}/api/submit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Queue QA',
      phone: '+7 (999) 000-00-04',
      email: 'qa@example.test',
      page: 'Скачать каталог',
      website: '',
    }),
    signal: AbortSignal.timeout(2_000),
  })
  const elapsedMs = Date.now() - startedAt
  const body = await response.json()

  assert.equal(response.status, 202)
  assert.deepEqual(
    { success: body.success, delivery: body.delivery, queued: body.queued },
    { success: true, delivery: 'queued', queued: true },
  )
  assert.ok(Number.isInteger(body.leadId) && body.leadId > 0)
  assert.ok(elapsedMs < 1_500, `durable acceptance took ${elapsedMs}ms`)

  const pendingHealth = await (await fetch(`${baseUrl}/health`)).json()
  assert.equal(pendingHealth.queueSize, 1, 'accepted lead must remain durable during slow SMTP delivery')
  await waitForDelivery(baseUrl)
  assert.equal(smtpMessages, 2, 'lead email and user confirmation must both be sent')

  const source = fs.readFileSync('server.cjs', 'utf8')
  const workerStart = source.indexOf('async function processQueue()')
  const submitStart = source.indexOf("app.post('/api/submit'")
  assert.ok(workerStart >= 0 && submitStart > workerStart)
  assert.ok(source.slice(workerStart, submitStart).includes('sendConfirmationToUser(lead)'))
  assert.ok(!source.slice(submitStart).includes('await deliverLeadWithFallback(lead)'))
  assert.ok(source.includes('timeout: DELIVERY_CHANNEL_TIMEOUT_MS'))
  assert.ok(source.includes('socketTimeout: DELIVERY_CHANNEL_TIMEOUT_MS'))

  console.log(`check:submit-queue-fast PASS (status=202 elapsedMs=${elapsedMs} durablePending=1 smtpMessages=2)`)
}

try {
  await main()
} finally {
  if (child && child.exitCode === null) {
    child.kill('SIGTERM')
    await new Promise((resolve) => {
      child.once('exit', resolve)
      setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL')
        resolve()
      }, 2_000).unref()
    })
  }
  for (const socket of sockets) socket.destroy()
  await new Promise((resolve) => slowSmtp.close(resolve))
  fs.rmSync(tempDir, { recursive: true, force: true })
}
