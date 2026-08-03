'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/documents-page-feed',
      handler: 'documents-page-feed.index',
      config: { auth: false },
    },
  ],
};
