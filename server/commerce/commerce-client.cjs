'use strict';

function normalizeBaseUrl(value, fallback) {
  return String(value || fallback).trim().replace(/\/+$/, '');
}

async function requestJson(url, options = {}) {
  const timeoutMs = Math.max(250, Number(options.timeoutMs || 2500));
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json', ...(options.headers || {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (_) {
    throw new Error('UPSTREAM_UNAVAILABLE');
  }
  if (!response.ok) throw new Error('UPSTREAM_UNAVAILABLE');
  try {
    return await response.json();
  } catch (_) {
    throw new Error('UPSTREAM_INVALID_CONTRACT');
  }
}

function createStrapiCommerceClient(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl, 'http://127.0.0.1:1337');
  const timeoutMs = options.timeoutMs;
  const headers = options.token ? { Authorization: `Bearer ${options.token}` } : {};
  return {
    async probe() {
      try {
        const response = await fetch(`${baseUrl}/_health`, { signal: AbortSignal.timeout(timeoutMs || 2500) });
        return response.ok;
      } catch (_) {
        return false;
      }
    },
    async getCatalog() {
      const payload = await requestJson(`${baseUrl}/api/catalog-feed`, { timeoutMs, headers });
      if (!payload || !Array.isArray(payload.items)) throw new Error('UPSTREAM_INVALID_CONTRACT');
      return payload.items;
    },
  };
}

function createMedusaCommerceClient(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl, 'http://127.0.0.1:9000');
  const timeoutMs = options.timeoutMs;
  return {
    async probe() {
      try {
        const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(timeoutMs || 2500) });
        return response.ok;
      } catch (_) {
        return false;
      }
    },
    async getCatalog() {
      const payload = await requestJson(`${baseUrl}/commerce/catalog`, { timeoutMs });
      if (!payload || !Array.isArray(payload.items)) throw new Error('UPSTREAM_INVALID_CONTRACT');
      return payload.items;
    },
  };
}

function createCommerceClients(options = {}) {
  return {
    strapiClient: createStrapiCommerceClient(options.strapi),
    medusaClient: createMedusaCommerceClient(options.medusa),
  };
}

module.exports = { createCommerceClients, createStrapiCommerceClient, createMedusaCommerceClient, requestJson };
