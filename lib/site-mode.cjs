const SITE_MODES = Object.freeze({
  SHOWCASE: 'showcase',
  COMMERCE: 'commerce',
});

const COMMERCIAL_FIELDS = new Set([
  'price',
  'priceRub',
  'price_rub',
  'commerceKey',
  'commerce_key',
  'commerceId',
  'commerce_id',
  'medusaId',
  'medusa_id',
  'sku',
  'variants',
]);

function normalizeSiteMode(value) {
  return String(value || '').trim().toLowerCase() === SITE_MODES.COMMERCE
    ? SITE_MODES.COMMERCE
    : SITE_MODES.SHOWCASE;
}

function getSiteCapabilities(value) {
  const enabled = normalizeSiteMode(value) === SITE_MODES.COMMERCE;
  return Object.freeze({
    prices: enabled,
    smartSelector: enabled,
    commerce: enabled,
  });
}

function stripCommercialFields(value) {
  if (Array.isArray(value)) return value.map(stripCommercialFields);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !COMMERCIAL_FIELDS.has(key))
      .map(([key, item]) => [key, stripCommercialFields(item)]),
  );
}

function sanitizeCatalogPayload(payload, mode) {
  return normalizeSiteMode(mode) === SITE_MODES.COMMERCE
    ? payload
    : stripCommercialFields(payload);
}

module.exports = {
  SITE_MODES,
  normalizeSiteMode,
  getSiteCapabilities,
  sanitizeCatalogPayload,
};
