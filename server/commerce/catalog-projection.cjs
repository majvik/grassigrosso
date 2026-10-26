'use strict';

function requireKey(row, field, side) {
  const key = String(row && row[field] || '').trim();
  if (!key) throw new Error(`Incomplete ${side} catalog row: missing ${field}`);
  return key;
}

function indexUnique(rows, field, side) {
  if (!Array.isArray(rows)) throw new Error(`Incomplete ${side} catalog contract`);
  const index = new Map();
  for (const row of rows) {
    const key = requireKey(row, field, side);
    if (index.has(key)) throw new Error(`Duplicate ${side} integration key: ${key}`);
    index.set(key, row);
  }
  return index;
}

function validateVariants(variants, key) {
  if (!Array.isArray(variants) || variants.length === 0) throw new Error(`Incomplete trading product ${key}: variants`);
  const skus = new Set();
  for (const variant of variants) {
    for (const field of ['id', 'sku', 'size']) requireKey(variant, field, `variant ${key}`);
    if (skus.has(variant.sku)) throw new Error(`Duplicate variant SKU: ${variant.sku}`);
    skus.add(variant.sku);
    if (!Number.isSafeInteger(variant.priceKopecks) || variant.priceKopecks <= 0) throw new Error(`Incomplete variant price: ${variant.sku}`);
    if (!Number.isSafeInteger(variant.inventoryQuantity) || variant.inventoryQuantity < 0) throw new Error(`Incomplete variant inventory: ${variant.sku}`);
    if (variant.available !== (variant.inventoryQuantity > 0)) throw new Error(`Incomplete variant availability: ${variant.sku}`);
  }
}

function composeCatalog(contentRows, tradingRows) {
  const content = indexUnique(contentRows, 'commerceKey', 'Strapi');
  const trading = indexUnique(tradingRows, 'integrationKey', 'Medusa');
  if (content.size !== trading.size) throw new Error('Orphaned catalog integration records');
  return [...content].map(([integrationKey, contentRow]) => {
    const tradingRow = trading.get(integrationKey);
    if (!tradingRow) throw new Error(`Missing Medusa product for ${integrationKey}`);
    validateVariants(tradingRow.variants, integrationKey);
    return {
      ...contentRow,
      integrationKey,
      commerceRef: {
        strapiDocumentId: requireKey(contentRow, 'strapiDocumentId', 'Strapi'),
        medusaProductId: requireKey(tradingRow, 'medusaProductId', 'Medusa'),
        integrationKey,
      },
      variants: tradingRow.variants,
    };
  });
}

module.exports = { composeCatalog };
