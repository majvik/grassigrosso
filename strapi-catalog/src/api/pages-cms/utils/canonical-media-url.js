'use strict';

const path = require('path');

const PAGES_CMS_UPLOAD_NAME_RE = /^pages-cms__([0-9a-f]{16})__(.+)$/i;

function canonicalPagesCmsFilename(uploadName) {
  const match = PAGES_CMS_UPLOAD_NAME_RE.exec(String(uploadName || ''));
  if (!match) return null;
  const safeBase = path.basename(match[2]).replace(/[^\w.\-]+/g, '_');
  if (!safeBase || safeBase === '.' || safeBase === '..') return null;
  return `pages_cms_${match[1].toLowerCase()}_${safeBase}`;
}

function canonicalPagesCmsPublicUrl(media) {
  const filename = canonicalPagesCmsFilename(media?.name);
  return filename ? `/uploads/${filename}` : null;
}

module.exports = {
  canonicalPagesCmsFilename,
  canonicalPagesCmsPublicUrl,
};
