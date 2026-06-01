'use strict';

const MEDIA_FIELDS = ['slide_image', 'slide_video', 'poster'];

function isNumericId(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return true;
  return typeof value === 'string' && /^\d+$/.test(value);
}

function numericId(value) {
  return typeof value === 'number' ? value : Number(value);
}

/**
 * Resolve Strapi upload id from admin / API payloads.
 * Media relations in components accept numeric id, not documentId.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi
 * @param {unknown} value
 * @returns {Promise<number|null>}
 */
async function resolveUploadId(strapi, value) {
  if (value == null) return null;
  if (isNumericId(value)) return numericId(value);

  if (typeof value === 'string') {
    const file = await strapi.db.query('plugin::upload.file').findOne({
      where: { documentId: value },
      select: ['id'],
    });
    return file?.id ?? null;
  }

  if (typeof value === 'object') {
    const row = /** @type {Record<string, unknown>} */ (value);
    if (isNumericId(row.id)) return numericId(row.id);
    if (typeof row.documentId === 'string') {
      return resolveUploadId(strapi, row.documentId);
    }
    if (Array.isArray(row.connect) && row.connect.length > 0) {
      return resolveUploadId(strapi, row.connect[0]);
    }
    if ('set' in row) {
      return resolveUploadId(strapi, row.set);
    }
  }

  return null;
}

/**
 * @param {import('@strapi/types').Core.Strapi} strapi
 * @param {unknown} gallery
 * @returns {Promise<Array<Record<string, unknown>>|undefined>}
 */
async function normalizeGalleryInput(strapi, gallery) {
  if (!Array.isArray(gallery)) return gallery;

  const normalized = [];
  for (const row of gallery) {
    if (!row || typeof row !== 'object') {
      normalized.push(row);
      continue;
    }

    const next = { ...row };
    for (const field of MEDIA_FIELDS) {
      if (!(field in next)) continue;
      const resolvedId = await resolveUploadId(strapi, next[field]);
      if (resolvedId != null) {
        next[field] = resolvedId;
      } else if (next[field] === null) {
        next[field] = null;
      } else {
        delete next[field];
      }
    }
    normalized.push(next);
  }

  return normalized;
}

module.exports = {
  MEDIA_FIELDS,
  normalizeGalleryInput,
  resolveUploadId,
};
