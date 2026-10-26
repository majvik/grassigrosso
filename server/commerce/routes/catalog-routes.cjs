'use strict';

const crypto = require('crypto');
const express = require('express');
const { composeCatalog } = require('../catalog-projection.cjs');
const { getCommerceReadiness } = require('../commerce-readiness.cjs');

function requestId(req) {
  return String(req.get('x-request-id') || crypto.randomUUID());
}

function sendUnavailable(res, readiness, failedDependencies = readiness.failedDependencies) {
  res.set('Retry-After', '30');
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('X-Request-Id', readiness.requestId);
  res.set('Cache-Control', 'no-store');
  return res.status(503).json({
    ready: false,
    status: 503,
    failedDependencies,
    requestId: readiness.requestId,
  });
}

function createCommerceCatalogRouter({ strapiClient, medusaClient }) {
  const router = express.Router();
  const readinessFor = (scope, req) => getCommerceReadiness(scope, {
    strapiClient,
    medusaClient,
    requestId: requestId(req),
  });

  router.get('/readiness', async (req, res) => {
    const scope = String(req.query.scope || 'catalog');
    const readiness = await readinessFor(scope, req);
    if (readiness.ready && ['catalog', 'product', 'favourites', 'smartSelector'].includes(scope)) {
      try {
        const [content, trading] = await Promise.all([strapiClient.getCatalog(), medusaClient.getCatalog()]);
        composeCatalog(content, trading);
      } catch (_) {
        return sendUnavailable(res, readiness, ['contract']);
      }
    }
    res.set('X-Request-Id', readiness.requestId);
    res.set('Cache-Control', 'no-store');
    return res.status(readiness.status).json(readiness);
  });

  const loadCatalog = async (req, res) => {
    const readiness = await readinessFor(req.params.key ? 'product' : 'catalog', req);
    if (!readiness.ready) return sendUnavailable(res, readiness);
    try {
      const [content, trading] = await Promise.all([strapiClient.getCatalog(), medusaClient.getCatalog()]);
      const items = composeCatalog(content, trading);
      res.set('X-Request-Id', readiness.requestId);
      res.set('Cache-Control', 'no-store');
      if (req.params.key) {
        const key = String(req.params.key).trim().toUpperCase();
        const item = items.find((candidate) => candidate.integrationKey === key);
        if (!item) return res.status(404).json({ error: 'Product not found', requestId: readiness.requestId });
        return res.status(200).json({ item, requestId: readiness.requestId });
      }
      return res.status(200).json({ items, requestId: readiness.requestId });
    } catch (_) {
      return sendUnavailable(res, readiness, ['contract']);
    }
  };

  router.get('/catalog', loadCatalog);
  router.get('/products/:key', loadCatalog);
  return router;
}

module.exports = { createCommerceCatalogRouter, sendUnavailable };
