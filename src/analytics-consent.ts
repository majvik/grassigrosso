import { YANDEX_METRIKA_COUNTER_ID } from './cookie-consent-config'
import { COOKIE_CONSENT_EVENT, readEffectiveConsent } from './cookie-consent'

const SCRIPT_ID = 'yandex-metrika-tag'
let booted = false

function deleteMetrikaCookies() {
  const names = document.cookie
    .split(';')
    .map((part) => part.trim().split('=')[0])
    .filter((name) => name.startsWith('_ym') || name === 'yandexuid' || name === 'yuidss')
  for (const name of names) {
    document.cookie = `${name}=; Max-Age=0; path=/`
    document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname}`
  }
}

function bootMetrika() {
  if (booted || document.getElementById(SCRIPT_ID)) return
  booted = true
  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.async = true
  script.src = `https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_COUNTER_ID}`
  script.onload = () => {
    const ym = (window as unknown as { ym?: (...args: unknown[]) => void }).ym
    ym?.(YANDEX_METRIKA_COUNTER_ID, 'init', {
      ssr: true,
      webvisor: false,
      clickmap: false,
      accurateTrackBounce: true,
      trackLinks: true,
    })
  }
  const ymQueue = (window as unknown as { ym?: ((...args: unknown[]) => void) & { a?: unknown[]; l?: number } }).ym
  if (!ymQueue) {
    const queue = function ym(this: unknown, ...args: unknown[]) {
      ;(queue.a = queue.a || []).push(args)
    } as ((...args: unknown[]) => void) & { a?: unknown[]; l?: number }
    queue.l = Date.now()
    ;(window as unknown as { ym: typeof queue }).ym = queue
  }
  document.head.appendChild(script)
}

function syncAnalytics() {
  const { analytics } = readEffectiveConsent()
  if (analytics === 'granted') {
    bootMetrika()
    return
  }
  if (document.getElementById(SCRIPT_ID)) {
    deleteMetrikaCookies()
    window.location.reload()
  }
}

export function initAnalyticsConsent() {
  if (document.documentElement.dataset.analyticsConsentInit === 'true') return
  document.documentElement.dataset.analyticsConsentInit = 'true'
  syncAnalytics()
  window.addEventListener(COOKIE_CONSENT_EVENT, () => syncAnalytics())
}
