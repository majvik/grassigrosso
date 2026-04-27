'use strict';

module.exports = {
  register(/*{ strapi }*/) {},

  async bootstrap({ strapi }) {
    const standardSizes = [
      '80 × 190',
      '80 × 200',
      '90 × 190',
      '90 × 200',
      '120 × 190',
      '120 × 200',
      '140 × 190',
      '140 × 200',
      '160 × 190',
      '160 × 200',
      '180 × 200',
      '200 × 200',
      '140 × 220',
      '160 × 220',
      '180 × 220',
      '200 × 220',
      '220 × 220',
    ];

    const sizeRepo = strapi.db.query('api::mattress-size.mattress-size');
    for (let i = 0; i < standardSizes.length; i += 1) {
      const name = standardSizes[i];
      const slug = name.replace(/\s*×\s*/g, 'x');
      const existing = await sizeRepo.findOne({ where: { slug } });
      if (existing) {
        await sizeRepo.update({
          where: { id: existing.id },
          data: { name, sort_order: i },
        });
      } else {
        await sizeRepo.create({
          data: { name, slug, sort_order: i },
        });
      }
    }
    strapi.log.info('Catalog bootstrap: ensured standardized mattress sizes list (auto-link disabled)');
  },
};
