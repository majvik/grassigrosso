export const CONSENT_DOCUMENT_ID = 'personal-data-consent'

export const CONSENT_CHECKBOX_TEXT = 'Я даю согласие на обработку персональных данных на условиях'

export function buildConsentPayload(formId: string) {
  return {
    consentAccepted: true as const,
    consentDocumentId: CONSENT_DOCUMENT_ID,
    formId,
    pagePath: window.location.pathname,
  }
}

export function withConsent<T extends Record<string, unknown>>(payload: T, formId: string) {
  return { ...payload, ...buildConsentPayload(formId) }
}

export function findConsentCheckbox(form: ParentNode): HTMLInputElement | null {
  return form.querySelector<HTMLInputElement>(
    'input[type="checkbox"][name="consent"], input[type="checkbox"][name="privacy"], #privacy, #co-privacy, #cr-privacy, #dr-privacy, #hd-privacy, #cim-privacy',
  )
}
