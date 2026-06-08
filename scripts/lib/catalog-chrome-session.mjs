import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

export function createChromeSession(targetUrl, options = {}) {
  const chromePath = options.chromePath || process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  const port = Number(options.port || process.env.CHROME_DEBUG_PORT || (9200 + Math.floor(Math.random() * 400)))
  const userDataDir = options.userDataDir || fs.mkdtempSync(path.join(os.tmpdir(), options.tempPrefix || 'grass-catalog-chrome-'))

  if (!fs.existsSync(chromePath)) {
    throw new Error(`Chrome not found: ${chromePath}`)
  }

  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    ...(options.extraArgs || []),
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    targetUrl,
  ], { stdio: 'ignore' })

  return { chrome, port, userDataDir, targetUrl, chromePath }
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function waitForDevtools(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      await fetch(`http://127.0.0.1:${port}/json/version`)
      return
    } catch {}
    await delay(200)
  }
  throw new Error('Chrome DevTools endpoint did not become ready')
}

export async function findCatalogTab(port, targetUrl, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs
  let lastTabs = []
  while (Date.now() < deadline) {
    const tabs = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())
    lastTabs = tabs
    const tab = tabs.find((item) => item.type === 'page'
      && item.webSocketDebuggerUrl
      && String(item.url || '').startsWith(targetUrl))
    if (tab) return tab
    await delay(250)
  }
  const urls = lastTabs.map((item) => `${item.type}:${item.url}`).join(', ')
  throw new Error(`Catalog Chrome tab not found for ${targetUrl}. Tabs: ${urls || 'none'}`)
}

export function connectChromeDevtools(wsUrl) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(wsUrl)
    socket.addEventListener('open', () => resolve(socket))
    socket.addEventListener('error', (event) => reject(event.error || new Error('WebSocket error')))
  })
}

export function cleanupChromeSession({ chrome, userDataDir, socket, onCleanup }) {
  try { onCleanup?.() } catch {}
  try { socket?.close() } catch {}
  try { chrome?.kill('SIGKILL') } catch {}
  try { fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch {}
}

export function createCdpClient(socket) {
  let nextId = 1
  const pending = new Map()

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id) return
    const entry = pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)
    if (message.error) entry.reject(new Error(message.error.message || JSON.stringify(message.error)))
    else entry.resolve(message.result)
  })

  function send(method, params = {}, timeoutMs = 15000) {
    const id = nextId++
    socket.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      setTimeout(() => {
        if (!pending.has(id)) return
        pending.delete(id)
        reject(new Error(`${method} timed out`))
      }, timeoutMs)
    })
  }

  async function evaluate(expression, timeoutMs = 15000) {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    }, timeoutMs)
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Runtime.evaluate exception')
    }
    return result.result?.value
  }

  function failPending(reason) {
    for (const [id, entry] of pending.entries()) {
      pending.delete(id)
      entry.reject(new Error(reason))
    }
  }

  return { send, evaluate, failPending }
}

export async function startCatalogChromeSession(baseUrl, pagePath = '/catalog') {
  const normalizedBase = String(baseUrl).replace(/\/+$/, '')
  const targetUrl = `${normalizedBase}${pagePath}`
  const isRemoteHttps = normalizedBase.startsWith('https://')
  const session = createChromeSession(targetUrl, {
    tempPrefix: process.env.CATALOG_CHROME_TEMP_PREFIX || 'grass-catalog-chrome-',
    extraArgs: isRemoteHttps || process.env.CATALOG_CHROME_DISABLE_BACKGROUND_NETWORKING === '0'
      ? []
      : ['--disable-background-networking'],
  })
  await waitForDevtools(session.port)
  const tab = await findCatalogTab(session.port, targetUrl)
  const socket = await connectChromeDevtools(tab.webSocketDebuggerUrl)
  const cdp = createCdpClient(socket)
  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  return { ...session, socket, cdp, tab }
}
