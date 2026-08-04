'use strict';

/**
 * Phase 6B legal pages — Strapi feed allowlist (Node /api/pages proxy stays Wave-1 six until Phase C).
 */

const LEGAL_PAGES_CMS_SLUGS = Object.freeze(['privacy', 'terms', 'cookies']);

const LEGAL_SLUG_TO_UID = Object.freeze({
  privacy: 'api::privacy-page.privacy-page',
  terms: 'api::terms-page.terms-page',
  cookies: 'api::cookies-page.cookies-page',
});

const LEGAL_FEED_PATH_BY_SLUG = Object.freeze({
  privacy: '/api/privacy-page-feed',
  terms: '/api/terms-page-feed',
  cookies: '/api/cookies-page-feed',
});

/** Exact href allowlist (contract v2.1). */
const LEGAL_HREF_ALLOWLIST = Object.freeze([
  'https://grassigrosso.com',
  'mailto:office@grassigrosso.com',
  '/privacy',
]);

const LEGAL_BLOCK_TYPES = Object.freeze(['paragraph', 'list', 'table', 'operator']);
const LEGAL_RUN_TYPES = Object.freeze(['text', 'link']);

/** Mechanical CMS body.length from Phase A matrix. */
const LEGAL_BODY_LENGTH_BY_SLUG = Object.freeze({
  privacy: 55,
  terms: 37,
  cookies: 17,
});

const COMPONENT_TO_BLOCK_TYPE = Object.freeze({
  'legal.paragraph-block': 'paragraph',
  'legal.list-block': 'list',
  'legal.table-block': 'table',
  'legal.operator-block': 'operator',
});

module.exports = {
  LEGAL_PAGES_CMS_SLUGS,
  LEGAL_SLUG_TO_UID,
  LEGAL_FEED_PATH_BY_SLUG,
  LEGAL_HREF_ALLOWLIST,
  LEGAL_BLOCK_TYPES,
  LEGAL_RUN_TYPES,
  LEGAL_BODY_LENGTH_BY_SLUG,
  COMPONENT_TO_BLOCK_TYPE,
};
