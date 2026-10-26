'use strict';

const { errors } = require('@strapi/utils');

module.exports = {
  async beforeUpdate(event) {
    if (!Object.prototype.hasOwnProperty.call(event.params.data || {}, 'commerce_key')) return;
    const existing = await strapi.db.query('api::product.product').findOne({ where: event.params.where });
    const current = String(existing?.commerce_key || '').trim();
    const requested = String(event.params.data.commerce_key || '').trim();
    if (current && requested !== current) {
      throw new errors.ApplicationError('commerce_key неизменяем после первого присвоения');
    }
  },
};
