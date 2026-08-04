'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/terms-page-feed',
      handler: 'terms-page-feed.index',
      config: { auth: false },
    },
  ],
};
