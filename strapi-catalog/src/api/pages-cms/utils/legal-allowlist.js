'use strict';

/**
 * Phase 6 legal pages — Strapi feed allowlist + fixture→Strapi transform (Phase C).
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

const BLOCK_TYPE_TO_COMPONENT = Object.freeze({
  paragraph: 'legal.paragraph-block',
  list: 'legal.list-block',
  table: 'legal.table-block',
  operator: 'legal.operator-block',
});

function fixtureRunsToStrapi(runs) {
  return (Array.isArray(runs) ? runs : []).map((run) => {
    if (run.type === 'link') {
      // Schema stores link caption as string `link_label`; feed maps it → children[].
      const linkLabel = (run.children || [])
        .map((child) => (child && typeof child.value === 'string' ? child.value : ''))
        .join('');
      return {
        type: 'link',
        href: run.href,
        link_label: linkLabel,
        strong: false,
      };
    }
    return {
      type: 'text',
      value: run.value,
      strong: Boolean(run.strong),
    };
  });
}

function fixtureBlockToStrapi(block) {
  const __component = BLOCK_TYPE_TO_COMPONENT[block.type];
  if (!__component) {
    throw new Error(`Unknown legal block type for seed: ${block.type}`);
  }
  if (block.type === 'paragraph') {
    return {
      __component,
      heading: block.heading == null ? null : block.heading,
      runs: fixtureRunsToStrapi(block.runs),
    };
  }
  if (block.type === 'list') {
    return {
      __component,
      heading: block.heading == null ? null : block.heading,
      items: (block.items || []).map((item) => ({
        runs: fixtureRunsToStrapi(item.runs),
      })),
    };
  }
  if (block.type === 'table') {
    return {
      __component,
      heading: block.heading == null ? null : block.heading,
      headers: (block.headers || []).map((header) =>
        typeof header === 'string' ? { value: header } : { value: header.value },
      ),
      rows: (block.rows || []).map((row) => ({
        cells: (row.cells || []).map((cell) => ({
          runs: fixtureRunsToStrapi(cell.runs),
        })),
      })),
    };
  }
  return {
    __component,
    heading: block.heading == null ? null : block.heading,
    role_label: block.role_label,
    legal_name: block.legal_name,
    inn: block.inn,
    ogrn: block.ogrn,
    address: block.address,
    email: block.email,
  };
}

/**
 * Convert canonical public fixture JSON → Strapi Document Service draft for legal single types.
 */
function fixtureToStrapiLegalData(fixture) {
  return {
    title: fixture.title,
    effective_date: fixture.effective_date,
    body: (fixture.body || []).map(fixtureBlockToStrapi),
  };
}

module.exports = {
  LEGAL_PAGES_CMS_SLUGS,
  LEGAL_SLUG_TO_UID,
  LEGAL_FEED_PATH_BY_SLUG,
  LEGAL_HREF_ALLOWLIST,
  LEGAL_BLOCK_TYPES,
  LEGAL_RUN_TYPES,
  LEGAL_BODY_LENGTH_BY_SLUG,
  COMPONENT_TO_BLOCK_TYPE,
  BLOCK_TYPE_TO_COMPONENT,
  fixtureToStrapiLegalData,
};
