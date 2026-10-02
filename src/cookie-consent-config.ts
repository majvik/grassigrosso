export const COOKIE_CONSENT_STORAGE_KEY = 'grassigrosso-cookie-consent-v1'
export const COOKIE_POLICY_VERSION = '2026-10-02' as const
export const ANALYTICS_CONSENT_VERSION = '2026-09-14' as const
export const YANDEX_MAPS_CONSENT_VERSION = '2026-10-02' as const
export const YANDEX_METRIKA_COUNTER_ID = 107738086

export type OptionalConsentStatus = 'granted' | 'denied' | 'unset'

export type CookieConsentChoice = {
  status: OptionalConsentStatus
  version: string
}

export type CookieConsentRecord = {
  schemaVersion: 1
  policyVersion: typeof COOKIE_POLICY_VERSION
  choices: {
    analytics: CookieConsentChoice
    yandexMaps: CookieConsentChoice
  }
  updatedAt: string
}

export type EffectiveCookieConsent = {
  analytics: OptionalConsentStatus
  yandexMaps: OptionalConsentStatus
}

const STATUSES: readonly OptionalConsentStatus[] = ['granted', 'denied', 'unset']

function isChoice(value: unknown): value is CookieConsentChoice {
  if (!value || typeof value !== 'object') return false
  const choice = value as CookieConsentChoice
  return STATUSES.includes(choice.status) && typeof choice.version === 'string' && choice.version.length > 0
}

export function parseCookieConsentRecord(raw: unknown): CookieConsentRecord | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as CookieConsentRecord
  if (record.schemaVersion !== 1) return null
  if (record.policyVersion !== COOKIE_POLICY_VERSION) return null
  if (!record.choices || !isChoice(record.choices.analytics) || !isChoice(record.choices.yandexMaps)) return null
  if (typeof record.updatedAt !== 'string' || !record.updatedAt) return null
  return record
}

export function effectiveConsent(record: CookieConsentRecord | null): EffectiveCookieConsent {
  if (!record) return { analytics: 'unset', yandexMaps: 'unset' }
  return {
    analytics:
      record.choices.analytics.version === ANALYTICS_CONSENT_VERSION
        ? record.choices.analytics.status
        : 'unset',
    yandexMaps:
      record.choices.yandexMaps.version === YANDEX_MAPS_CONSENT_VERSION
        ? record.choices.yandexMaps.status
        : 'unset',
  }
}

export function createConsentRecord(
  analytics: CookieConsentChoice,
  yandexMaps: CookieConsentChoice,
  updatedAt = new Date().toISOString(),
): CookieConsentRecord {
  return {
    schemaVersion: 1,
    policyVersion: COOKIE_POLICY_VERSION,
    choices: { analytics, yandexMaps },
    updatedAt,
  }
}
