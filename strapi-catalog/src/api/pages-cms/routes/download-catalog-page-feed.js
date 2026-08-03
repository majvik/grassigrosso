'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/download-catalog-page-feed',
      handler: 'download-catalog-page-feed.index',
      config: { auth: false },
    },
  ],
};
