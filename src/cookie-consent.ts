import {
  ANALYTICS_CONSENT_VERSION,
  COOKIE_CONSENT_STORAGE_KEY,
  type CookieConsentChoice,
  type CookieConsentRecord,
  type EffectiveCookieConsent,
  type OptionalConsentStatus,
  YANDEX_MAPS_CONSENT_VERSION,
  createConsentRecord,
  effectiveConsent,
  parseCookieConsentRecord,
} from './cookie-consent-config'

export const COOKIE_CONSENT_EVENT = 'grassigrosso:cookie-consent'

type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function storage(): StorageLike | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readStoredConsent(store: StorageLike | null = storage()): CookieConsentRecord | null {
  if (!store) return null
  const raw = store.getItem(COOKIE_CONSENT_STORAGE_KEY)
  if (!raw) return null
  try {
    return parseCookieConsentRecord(JSON.parse(raw))
  } catch {
    return null
  }
}

export function readEffectiveConsent(store: StorageLike | null = storage()): EffectiveCookieConsent {
  return effectiveConsent(readStoredConsent(store))
}

function writeRecord(record: CookieConsentRecord, store: StorageLike | null = storage()) {
  store?.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: effectiveConsent(record) }))
  }
}

function currentChoice(status: OptionalConsentStatus, version: string): CookieConsentChoice {
  return { status, version }
}

export function saveCookieChoices(analytics: OptionalConsentStatus, yandexMaps: OptionalConsentStatus) {
  writeRecord(
    createConsentRecord(
      currentChoice(analytics, ANALYTICS_CONSENT_VERSION),
      currentChoice(yandexMaps, YANDEX_MAPS_CONSENT_VERSION),
    ),
  )
}

export function acceptAllCookieConsent() {
  saveCookieChoices('granted', 'granted')
}

export function rejectOptionalCookieConsent() {
  saveCookieChoices('denied', 'denied')
}

/** Grants maps only. Analytics keeps its stored choice, or stays unset when no record exists. */
export function grantYandexMapsConsent() {
  const stored = readStoredConsent()
  const analytics = stored?.choices.analytics ?? currentChoice('unset', ANALYTICS_CONSENT_VERSION)
  writeRecord(
    createConsentRecord(analytics, currentChoice('granted', YANDEX_MAPS_CONSENT_VERSION)),
  )
}

function bannerRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cookie-banner')
}

let returnFocus: HTMLElement | null = null
let mode: 'prompt' | 'settings' | 'hidden' = 'hidden'

function choiceChecked(status: OptionalConsentStatus) {
  return status === 'granted'
}

const CLOSE_BUTTON = `<button type="button" class="modal-close" data-cookie-close aria-label="Закрыть"><svg width="28" height="28" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 12L36 36M36 12L12 36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></button>`

const CHECKBOX_MARK = `<span class="checkbox-custom"><svg class="checkbox-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path class="checkbox-fill" d="M0 4C0 1.79086 1.79086 0 4 0H20C22.2091 0 24 1.79086 24 4V20C24 22.2091 22.2091 24 20 24H4C1.79086 24 0 22.2091 0 20V4Z" fill="white"/><path d="M4 0.5H20C21.933 0.5 23.5 2.067 23.5 4V20C23.5 21.933 21.933 23.5 20 23.5H4C2.067 23.5 0.5 21.933 0.5 20V4C0.5 2.067 2.067 0.5 4 0.5Z" stroke="#283E37" stroke-opacity="0.1"/><path class="checkmark" d="M6 10.5L11 16L18 8" stroke="#283E37" stroke-width="2"/></svg></span>`

function settingRow(id: string, label: string, inputAttrs: string) {
  return `<div class="form-checkbox"><input type="checkbox" id="${id}" ${inputAttrs} /><label for="${id}">${CHECKBOX_MARK}<span class="checkbox-text">${label}</span></label></div>`
}

function renderBanner() {
  const root = bannerRoot()
  if (!root) return
  const effective = readEffectiveConsent()
  const showPrompt = effective.analytics === 'unset' || effective.yandexMaps === 'unset'
  if (mode === 'hidden' && !showPrompt) {
    root.hidden = true
    root.innerHTML = ''
    return
  }
  if (mode === 'hidden') mode = 'prompt'
  root.hidden = false
  root.classList.remove('hiding')
  root.classList.toggle('is-settings', mode === 'settings')
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-labelledby', 'cookie-consent-title')
  root.setAttribute('aria-describedby', 'cookie-consent-desc')
  root.setAttribute('aria-modal', 'false')

  if (mode === 'settings') {
    root.innerHTML = `
      ${CLOSE_BUTTON}
      <div class="cookie-banner-panel cookie-banner-panel--stack">
        <div class="cookie-banner-copy">
          <h2 class="commercial-offer-title" id="cookie-consent-title">Настройки cookie</h2>
          <p class="cookie-text" id="cookie-consent-desc">Необходимые технологии включены всегда. Аналитика и интерактивные Яндекс Карты включаются отдельно.</p>
        </div>
        <div class="cookie-settings-list">
          ${settingRow('cookie-necessary', 'Необходимые', 'checked disabled')}
          ${settingRow('cookie-analytics', 'Аналитика', `data-cookie-analytics ${choiceChecked(effective.analytics) ? 'checked' : ''}`)}
          ${settingRow('cookie-maps', 'Интерактивные Яндекс Карты', `data-cookie-maps ${choiceChecked(effective.yandexMaps) ? 'checked' : ''}`)}
        </div>
        <div class="section-divider cookie-banner-divider" aria-hidden="true"></div>
        <div class="cookie-banner-actions">
          <button type="button" class="btn-contact" data-cookie-save>Сохранить выбор</button>
        </div>
      </div>`
  } else {
    root.innerHTML = `
      ${CLOSE_BUTTON}
      <div class="cookie-banner-panel cookie-banner-panel--stack">
        <div class="cookie-banner-copy">
          <h2 class="commercial-offer-title" id="cookie-consent-title">Настройки cookie</h2>
          <p class="cookie-text" id="cookie-consent-desc">Сайт использует необходимые технологии для работы. Яндекс Метрика и интерактивные Яндекс Карты загружаются только после вашего выбора. <span class="cookie-banner-links"><a class="cookie-link" href="/cookies">Подробнее</a><span class="separator" aria-hidden="true"></span><a href="#cookie-settings" class="cookie-link" data-cookie-configure>Настроить</a></span></p>
        </div>
        <div class="section-divider cookie-banner-divider" aria-hidden="true"></div>
        <div class="cookie-banner-actions">
          <button type="button" class="btn-contact is-secondary" data-cookie-necessary>Только необходимые</button>
          <button type="button" class="btn-contact" data-cookie-accept-all>Принять все</button>
        </div>
      </div>`
  }
  bindBanner(root)
}

function bindBanner(root: HTMLElement) {
  root.querySelector('[data-cookie-accept-all]')?.addEventListener('click', () => {
    acceptAllCookieConsent()
    mode = 'hidden'
    returnFocus = null
    renderBanner()
  })
  root.querySelector('[data-cookie-necessary]')?.addEventListener('click', () => {
    rejectOptionalCookieConsent()
    mode = 'hidden'
    returnFocus = null
    renderBanner()
  })
  root.querySelector('[data-cookie-configure]')?.addEventListener('click', (event) => {
    event.preventDefault()
    mode = 'settings'
    renderBanner()
  })
  root.querySelector('[data-cookie-save]')?.addEventListener('click', () => {
    const analytics = root.querySelector<HTMLInputElement>('[data-cookie-analytics]')?.checked ? 'granted' : 'denied'
    const maps = root.querySelector<HTMLInputElement>('[data-cookie-maps]')?.checked ? 'granted' : 'denied'
    saveCookieChoices(analytics, maps)
    const focus = returnFocus
    returnFocus = null
    mode = 'hidden'
    renderBanner()
    focus?.focus()
  })
  root.querySelector('[data-cookie-close]')?.addEventListener('click', () => {
    if (mode === 'settings') {
      closeSettings()
      return
    }
    rejectOptionalCookieConsent()
    mode = 'hidden'
    returnFocus = null
    renderBanner()
  })
}

function closeSettings() {
  const focus = returnFocus
  returnFocus = null
  const effective = readEffectiveConsent()
  mode = effective.analytics === 'unset' || effective.yandexMaps === 'unset' ? 'prompt' : 'hidden'
  renderBanner()
  focus?.focus()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  const root = bannerRoot()
  if (!root || root.hidden) return
  if (mode === 'settings') {
    event.preventDefault()
    closeSettings()
    return
  }
  event.preventDefault()
}

export function openCookieSettings(trigger?: HTMLElement | null) {
  returnFocus = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
  mode = 'settings'
  renderBanner()
  bannerRoot()?.querySelector<HTMLElement>('[data-cookie-analytics]')?.focus()
}

export function initCookieConsent() {
  if (document.documentElement.dataset.cookieConsentInit === 'true') {
    renderBanner()
    return
  }
  document.documentElement.dataset.cookieConsentInit = 'true'
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('click', (event) => {
    const trigger = (event.target as Element | null)?.closest?.('[data-cookie-settings]')
    if (!(trigger instanceof HTMLElement)) return
    event.preventDefault()
    openCookieSettings(trigger)
  })
  const effective = readEffectiveConsent()
  mode = effective.analytics === 'unset' || effective.yandexMaps === 'unset' ? 'prompt' : 'hidden'
  renderBanner()
}
