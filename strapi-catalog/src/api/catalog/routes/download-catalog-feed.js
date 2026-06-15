'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/download-catalog-feed',
      handler: 'download-catalog-feed.index',
      config: {
        auth: false,
      },
    },
  ],
};
