'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/cookies-page-feed',
      handler: 'cookies-page-feed.index',
      config: { auth: false },
    },
  ],
};
