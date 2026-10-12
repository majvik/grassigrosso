'use strict';

const PRIMARY_HOST = 'grassigrosso.ru';
const CANONICAL_REDIRECT_BYPASS_HOSTS = new Set([
  'majvik-grassigrosso-e3cd.twc1.net',
]);

function normalizeHost(hostHeader) {
  return String(hostHeader || '').trim().replace(/:\d+$/, '').toLowerCase();
}

function canonicalizePath(pathname) {
  if (pathname === '/index.html') return '/';
  if (pathname.endsWith('.html')) return pathname.slice(0, -5) || '/';
  return pathname;
}

function buildCanonicalRedirect({ hostHeader, originalUrl }) {
  const host = normalizeHost(hostHeader);
  const rawUrl = String(originalUrl || '/');
  const queryIndex = rawUrl.indexOf('?');
  const rawPath = queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
  const query = queryIndex >= 0 ? rawUrl.slice(queryIndex) : '';
  const pathname = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  const canonicalPath = canonicalizePath(pathname);

  if (CANONICAL_REDIRECT_BYPASS_HOSTS.has(host)) return null;
  if ((!host || host === PRIMARY_HOST) && pathname === canonicalPath) return null;
  return `https://${PRIMARY_HOST}${canonicalPath}${query}`;
}

module.exports = { PRIMARY_HOST, buildCanonicalRedirect };
