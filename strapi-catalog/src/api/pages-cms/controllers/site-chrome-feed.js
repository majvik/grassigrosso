'use strict';
const { loadCanonicalSiteChrome, SiteChromeContractError } = require('../utils/site-chrome-contract');
module.exports = { async index(ctx) { try { const data = await loadCanonicalSiteChrome(strapi); if (!data) { ctx.status = 404; ctx.body = { data: null }; return; } ctx.body = { data }; } catch (error) { if (error instanceof SiteChromeContractError) { ctx.status = 422; ctx.body = { data: null }; return; } throw error; } } };
