export type SiteMode = 'showcase' | 'commerce'

export const SITE_MODE: SiteMode = __GRASSIGROSSO_SITE_MODE__
export const SITE_CAPABILITIES = Object.freeze({
  prices: SITE_MODE === 'commerce',
  smartSelector: SITE_MODE === 'commerce',
  commerce: SITE_MODE === 'commerce',
})
