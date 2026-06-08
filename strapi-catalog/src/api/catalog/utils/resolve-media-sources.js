'use strict';

const fs = require('fs');
const path = require('path');

function getStrapiPublicDir() {
  try {
    const fromStrapi = strapi && strapi.dirs && strapi.dirs.app && strapi.dirs.app.root;
    if (fromStrapi) {
      return path.join(fromStrapi, 'public');
    }
  } catch {}
  const candidates = [
    path.resolve(__dirname, '..', '..', '..', '..', 'public'),
    path.resolve(__dirname, '..', '..', '..', '..', '..', 'public'),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {}
  }
  return candidates[0];
}

function stripQuery(url) {
  return String(url || '').split('?')[0];
}

function withQuery(basePath, originalUrl) {
  const queryIndex = String(originalUrl || '').indexOf('?');
  if (queryIndex < 0) return basePath;
  return `${basePath}${originalUrl.slice(queryIndex)}`;
}

function fileExistsForUploadUrl(url) {
  if (!url || !String(url).startsWith('/uploads/')) return false;
  const relativePath = stripQuery(url).replace(/^\//, '');
  const absPath = path.join(getStrapiPublicDir(), relativePath);
  try {
    return fs.existsSync(absPath);
  } catch {
    return false;
  }
}

function rasterBaseUrl(url) {
  const clean = stripQuery(url);
  const match = clean.match(/^(.+\.)(png|jpe?g|webp|avif)$/i);
  if (!match) return null;
  return match[1];
}

/**
 * @param {string} originalUrl URL from Strapi DB (typically /uploads/foo.png)
 * @returns {{ src: string, fallbackSrc: string, sources: Array<{ type: string, src: string }> }}
 */
function resolveImageMedia(originalUrl) {
  const url = String(originalUrl || '').trim();
  if (!url) {
    return { src: '', fallbackSrc: '', sources: [] };
  }

  const base = rasterBaseUrl(url);
  if (!base) {
    return { src: url, fallbackSrc: url, sources: [] };
  }

  const avifUrl = withQuery(`${base}avif`, url);
  const webpUrl = withQuery(`${base}webp`, url);
  const dbFallback = url.match(/\.(png|jpe?g)(\?.*)?$/i) ? url : withQuery(`${base}png`, url);

  const sources = [];
  if (fileExistsForUploadUrl(avifUrl)) {
    sources.push({ type: 'image/avif', src: avifUrl });
  }
  if (fileExistsForUploadUrl(webpUrl)) {
    sources.push({ type: 'image/webp', src: webpUrl });
  }

  return {
    src: sources[0]?.src || dbFallback,
    fallbackSrc: dbFallback,
    sources,
  };
}

/**
 * @param {string} originalUrl
 * @returns {{ src: string, fallbackSrc: string, mime: string }}
 */
function resolveVideoMedia(originalUrl) {
  const url = String(originalUrl || '').trim();
  if (!url) {
    return { src: '', fallbackSrc: '', mime: 'video/mp4' };
  }

  const clean = stripQuery(url);
  const match = clean.match(/^(.+\.)(mp4|mov|webm)$/i);
  if (!match) {
    return { src: url, fallbackSrc: url, mime: 'video/mp4' };
  }

  const webmUrl = withQuery(`${match[1]}webm`, url);
  const fallbackSrc = url;
  if (fileExistsForUploadUrl(webmUrl)) {
    return { src: webmUrl, fallbackSrc, mime: 'video/webm' };
  }

  const ext = match[2].toLowerCase();
  return {
    src: fallbackSrc,
    fallbackSrc,
    mime: ext === 'mov' ? 'video/quicktime' : ext === 'webm' ? 'video/webm' : 'video/mp4',
  };
}

/**
 * @param {string} originalUrl
 * @returns {{ src: string, fallbackSrc: string, sources: Array<{ type: string, src: string }> }}
 */
function resolvePosterMedia(originalUrl) {
  return resolveImageMedia(originalUrl);
}

module.exports = {
  resolveImageMedia,
  resolveVideoMedia,
  resolvePosterMedia,
  fileExistsForUploadUrl,
};
