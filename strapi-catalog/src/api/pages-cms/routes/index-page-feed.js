'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/index-page-feed',
      handler: 'index-page-feed.index',
      config: { auth: false },
    },
  ],
};
