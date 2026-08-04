'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/privacy-page-feed',
      handler: 'privacy-page-feed.index',
      config: { auth: false },
    },
  ],
};
