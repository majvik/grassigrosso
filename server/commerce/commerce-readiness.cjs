'use strict';

const STRAPI_SCOPES = new Set(['catalog', 'product', 'favourites', 'smartSelector']);
const ALL_SCOPES = new Set(['catalog', 'product', 'favourites', 'smartSelector', 'cart', 'checkout', 'auth', 'profile', 'orders']);

async function probeDependency(client) {
  try {
    return (await client.probe()) === true;
  } catch (_) {
    return false;
  }
}

async function getCommerceReadiness(scope, options) {
  const normalizedScope = ALL_SCOPES.has(scope) ? scope : 'catalog';
  const dependencies = [{ name: 'medusa', client: options.medusaClient }];
  if (STRAPI_SCOPES.has(normalizedScope)) dependencies.unshift({ name: 'strapi', client: options.strapiClient });
  const results = await Promise.all(dependencies.map(async ({ name, client }) => ({ name, ready: await probeDependency(client) })));
  const failedDependencies = results.filter((result) => !result.ready).map((result) => result.name);
  return {
    ready: failedDependencies.length === 0,
    status: failedDependencies.length === 0 ? 200 : 503,
    failedDependencies,
    requestId: String(options.requestId || ''),
  };
}

module.exports = { getCommerceReadiness, STRAPI_SCOPES, ALL_SCOPES };
