'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/dealers-page-feed',
      handler: 'dealers-page-feed.index',
      config: { auth: false },
    },
  ],
};
