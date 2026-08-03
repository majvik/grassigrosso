'use strict';

const {
  MAP_EMBED_ALLOWED_HOSTS,
  MAP_EMBED_PATH_PREFIX,
} = require('./map-allowlist');

/**
 * Normalize CMS map_iframe_html → allowlisted HTTPS map_embed_url or null.
 * Strapi feed (Phase C) + Node boundary re-check (Phase D).
 *
 * @param {unknown} html
 * @returns {string | null}
 */
function normalizeMapIframeHtml(html) {
  if (typeof html !== 'string') return null;
  const trimmed = html.trim();
  if (!trimmed) return null;

  if (/\bsrcdoc\s*=/i.test(trimmed)) return null;

  const openTags = trimmed.match(/<iframe\b/gi);
  if (!openTags || openTags.length !== 1) return null;

  const openTagMatch = trimmed.match(/<iframe\b[^>]*>/i);
  if (!openTagMatch) return null;
  const openTag = openTagMatch[0];

  if (/\bsrcdoc\s*=/i.test(openTag)) return null;

  const srcMatch = openTag.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  if (!srcMatch) return null;
  const rawSrc = srcMatch[1] ?? srcMatch[2] ?? srcMatch[3];
  if (!rawSrc || typeof rawSrc !== 'string') return null;

  let url;
  try {
    url = new URL(rawSrc);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;
  if (url.port !== '' && url.port !== '443') return null;
  if (!MAP_EMBED_ALLOWED_HOSTS.includes(url.hostname)) return null;
  if (!url.pathname.startsWith(MAP_EMBED_PATH_PREFIX)) return null;

  return url.href;
}

module.exports = {
  normalizeMapIframeHtml,
  MAP_EMBED_ALLOWED_HOSTS,
  MAP_EMBED_PATH_PREFIX,
};
