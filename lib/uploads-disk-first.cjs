'use strict';

/**
 * Deterministic disk-first /uploads handler (Phase 5 D1).
 * GET/HEAD only; miss → 404 without contacting Strapi.
 */

const fs = require('fs');
const path = require('path');
const send = require('send');

const CACHE_LONG_MEDIA = 'public, max-age=2592000';
const NOT_FOUND_BODY = 'Upload not found\n';

const MIME_BY_EXT = Object.freeze({
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.ico': 'image/x-icon',
});

function defaultUploadsRoot(projectRoot) {
  return path.join(projectRoot, 'strapi-catalog', 'public', 'uploads');
}

function rootPrefixOf(rootReal) {
  return rootReal.endsWith(path.sep) ? rootReal : rootReal + path.sep;
}

function isInsideRoot(rootReal, absPath) {
  const prefix = rootPrefixOf(rootReal);
  return absPath === rootReal || absPath.startsWith(prefix);
}

/**
 * @returns {{ ok: true, absPath: string } | { ok: false, reason: string }}
 */
function resolveSafeUploadPath(uploadsRoot, requestPath) {
  const root = path.resolve(uploadsRoot);
  let rootReal;
  try {
    rootReal = fs.realpathSync(root);
  } catch {
    return { ok: false, reason: 'root-missing' };
  }

  const raw = String(requestPath || '');
  if (!raw || raw.includes('\0') || /%00/i.test(raw)) {
    return { ok: false, reason: 'nul' };
  }

  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return { ok: false, reason: 'malformed-encoding' };
  }
  if (decoded.includes('\0')) {
    return { ok: false, reason: 'nul' };
  }

  let rel = decoded.replace(/^\/+/, '');
  if (rel.toLowerCase().startsWith('uploads/')) {
    rel = rel.slice('uploads/'.length);
  }
  rel = rel.replace(/^\/+/, '');

  if (!rel || rel.includes('\0')) {
    return { ok: false, reason: 'empty' };
  }

  const segments = rel.split(/[/\\]+/);
  if (segments.some((s) => s === '..' || s === '.')) {
    return { ok: false, reason: 'traversal' };
  }

  const candidate = path.resolve(rootReal, rel);
  if (!isInsideRoot(rootReal, candidate)) {
    return { ok: false, reason: 'escape' };
  }

  // Always realpath existing paths so intermediate directory symlinks cannot escape.
  let real;
  try {
    real = fs.realpathSync(candidate);
  } catch {
    return { ok: false, reason: 'missing' };
  }

  if (!isInsideRoot(rootReal, real)) {
    return { ok: false, reason: 'symlink-escape' };
  }

  let st;
  try {
    st = fs.statSync(real);
  } catch {
    return { ok: false, reason: 'missing' };
  }

  if (st.isDirectory()) {
    return { ok: false, reason: 'directory' };
  }
  if (!st.isFile()) {
    return { ok: false, reason: 'not-file' };
  }
  return { ok: true, absPath: real };
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function sendNotFound(res) {
  if (res.headersSent) return;
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(NOT_FOUND_BODY);
}

/**
 * Express middleware. Mount at `/uploads` or use as path filter on `app.use`.
 */
function createUploadsDiskFirstMiddleware(options = {}) {
  const uploadsRoot = options.uploadsRoot
    || defaultUploadsRoot(options.projectRoot || process.cwd());
  const notFoundBody = options.notFoundBody || NOT_FOUND_BODY;

  return function uploadsDiskFirst(req, res, next) {
    const method = String(req.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      return next();
    }

    const urlPath = String(req.originalUrl || req.url || '').split('?')[0];
    if (!urlPath.startsWith('/uploads')) {
      return next();
    }

    const resolved = resolveSafeUploadPath(uploadsRoot, urlPath);
    if (!resolved.ok) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Uploads-Reject', resolved.reason);
      return res.end(notFoundBody);
    }

    const type = contentTypeFor(resolved.absPath);
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', CACHE_LONG_MEDIA);

    const stream = send(req, resolved.absPath, {
      acceptRanges: true,
      cacheControl: false,
      etag: true,
      lastModified: true,
    });
    stream.on('error', (err) => {
      if (err.status === 404) {
        sendNotFound(res);
        return;
      }
      // send emits 416 for unsatisfiable ranges
      if (!res.headersSent) {
        res.statusCode = err.status || 500;
        if (err.status === 416) {
          res.setHeader('Content-Range', `bytes */${err.length ?? 0}`);
        }
        res.end(err.status === 416 ? '' : String(err.message || 'send error'));
      }
    });
    stream.pipe(res);
  };
}

module.exports = {
  CACHE_LONG_MEDIA,
  NOT_FOUND_BODY,
  defaultUploadsRoot,
  resolveSafeUploadPath,
  contentTypeFor,
  createUploadsDiskFirstMiddleware,
};
