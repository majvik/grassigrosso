'use strict';

const { loadCanonicalPageData, LegalContractError } = require('./serialize-page-feed');

/**
 * Factory for public read-only page feed controllers (`auth: false` routes).
 * @param {string} slug
 */
function createPageFeedController(slug) {
  return {
    async index(ctx) {
      try {
        const data = await loadCanonicalPageData(strapi, slug);
        if (!data) {
          ctx.status = 404;
          ctx.body = { data: null };
          return;
        }
        // Feed envelope: { data } only — no source (Node adds source in Phase D / C).
        ctx.body = { data };
      } catch (err) {
        if (err instanceof LegalContractError || err?.name === 'LegalContractError') {
          // Atomic reject: do not emit invalid legal payload.
          ctx.status = 422;
          ctx.body = { data: null };
          return;
        }
        throw err;
      }
    },
  };
}

module.exports = { createPageFeedController };
