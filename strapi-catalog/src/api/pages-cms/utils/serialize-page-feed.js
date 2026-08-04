'use strict';

const { preferAvifVariant } = require('../../catalog/utils/prefer-avif');
const { getDeepPopulateForSlug, DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS } = require('./deep-populate');
const { LEGAL_PAGES_CMS_SLUGS, COMPONENT_TO_BLOCK_TYPE } = require('./legal-allowlist');
const { canonicalizeLegalPageData, LegalContractError } = require('./legal-page-contract');
const { canonicalPagesCmsPublicUrl } = require('./canonical-media-url');
const { normalizeMapIframeHtml } = require('./normalize-map-iframe');

const STRAPI_META_KEYS = new Set([
  'id',
  'documentId',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'locale',
  'localizations',
  'status',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isMediaObject(node) {
  if (!isPlainObject(node) || typeof node.url !== 'string') return false;
  return (
    'mime' in node ||
    'provider' in node ||
    'hash' in node ||
    'ext' in node ||
    'size' in node ||
    'width' in node ||
    'height' in node ||
    'formats' in node
  );
}

function serializeMedia(media) {
  return {
    url: canonicalPagesCmsPublicUrl(media) || preferAvifVariant(media.url || ''),
  };
}

/**
 * Recursively strip Strapi meta, shape media to `{ url }`, convert map HTML → embed URL.
 */
function serializeNode(node) {
  if (Array.isArray(node)) return node.map((item) => serializeNode(item));
  if (!isPlainObject(node)) return node;

  if (isMediaObject(node)) return serializeMedia(node);

  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (STRAPI_META_KEYS.has(key)) continue;
    if (key === 'map_iframe_html') {
      out.map_embed_url = normalizeMapIframeHtml(value);
      continue;
    }
    out[key] = serializeNode(value);
  }
  return out;
}

function stripDownloadCatalogTextsForbidden(data) {
  const out = { ...data };
  for (const key of DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS) {
    delete out[key];
  }
  return out;
}

/**
 * Load one Wave 1 / legal page via explicit deep-populate and return canonical public `data`.
 * @param {import('@strapi/types').Core.Strapi} strapi
 * @param {string} slug
 * @returns {Promise<object | null>}
 */
async function loadCanonicalPageData(strapi, slug) {
  const { uid, populate } = getDeepPopulateForSlug(slug);
  const docs = strapi.documents(uid);

  let entry =
    (await docs.findFirst({ status: 'published', populate })) ||
    (await docs.findFirst({ populate }));

  if (!entry) return null;

  if (LEGAL_PAGES_CMS_SLUGS.includes(slug)) {
    const withTypes = mapLegalDynamicZoneTypes(entry);
    const stripped = serializeNode(withTypes);
    return canonicalizeLegalPageData(stripped);
  }

  let data = serializeNode(entry);
  if (slug === 'download-catalog') {
    data = stripDownloadCatalogTextsForbidden(data);
  }
  return data;
}

/**
 * Preserve block type before serializeNode strips `__component`.
 */
function mapLegalDynamicZoneTypes(entry) {
  if (!entry || typeof entry !== 'object') return entry;
  const body = Array.isArray(entry.body)
    ? entry.body.map((block) => {
        if (!block || typeof block !== 'object') return block;
        const mappedType =
          block.type ||
          (typeof block.__component === 'string'
            ? COMPONENT_TO_BLOCK_TYPE[block.__component]
            : undefined);
        return mappedType ? { ...block, type: mappedType } : block;
      })
    : entry.body;
  return { ...entry, body };
}

module.exports = {
  loadCanonicalPageData,
  serializeNode,
  stripDownloadCatalogTextsForbidden,
  isMediaObject,
  LegalContractError,
  mapLegalDynamicZoneTypes,
};
