'use strict';
const fs = require('fs');
const path = require('path');
const mimeTypes = require('mime-types');

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    const collectionsInput = [
      { name: 'Classic', slug: 'classic', sort_order: 1 },
      { name: 'Flexi', slug: 'flexi', sort_order: 2 },
      { name: 'Relax', slug: 'relax', sort_order: 3 },
      { name: 'Trend', slug: 'trend', sort_order: 4 }
    ];

    const tagsInput = [
      { name: 'Пружинный', slug: 'spring' },
      { name: 'Беспружинный', slug: 'nospring' },
      { name: 'Средняя жесткость', slug: 'medium' },
      { name: 'Жесткий', slug: 'hard' },
      { name: 'Мягкий', slug: 'soft' }
    ];

    const collectionsBySlug = {};
    for (const item of collectionsInput) {
      const existing = await strapi.documents('api::collection.collection').findMany({
        filters: { slug: { $eq: item.slug } },
        pagination: { pageSize: 1 }
      });
      if (Array.isArray(existing) && existing[0]) {
        collectionsBySlug[item.slug] = existing[0];
      } else {
        const created = await strapi.documents('api::collection.collection').create({ data: item });
        collectionsBySlug[item.slug] = created;
      }
    }

    const tagsBySlug = {};
    for (const item of tagsInput) {
      const existing = await strapi.documents('api::tag.tag').findMany({
        filters: { slug: { $eq: item.slug } },
        pagination: { pageSize: 1 }
      });
      if (Array.isArray(existing) && existing[0]) {
        tagsBySlug[item.slug] = existing[0];
      } else {
        const created = await strapi.documents('api::tag.tag').create({ data: item });
        tagsBySlug[item.slug] = created;
      }
    }

    const productsInput = [
      {
        name: 'Classic',
        slug: 'classic',
        collectionSlug: 'classic',
        firmness: 'medium',
        mattress_type: 'spring',
        height_cm: 22,
        max_load_kg: 140,
        image_url: '/collection-Classic.png',
        tagSlugs: ['spring', 'medium'],
        sort_order: 1
      },
      {
        name: 'Flexi',
        slug: 'flexi',
        collectionSlug: 'flexi',
        firmness: 'hard',
        mattress_type: 'nospring',
        height_cm: 24,
        max_load_kg: 160,
        image_url: '/collection-Flexi.png',
        tagSlugs: ['nospring', 'hard'],
        sort_order: 2
      },
      {
        name: 'Relax',
        slug: 'relax',
        collectionSlug: 'relax',
        firmness: 'soft',
        mattress_type: 'nospring',
        height_cm: 26,
        max_load_kg: 170,
        image_url: '/collection-Relax.png',
        tagSlugs: ['nospring', 'soft'],
        sort_order: 3
      },
      {
        name: 'Trend',
        slug: 'trend',
        collectionSlug: 'trend',
        firmness: 'medium',
        mattress_type: 'spring',
        height_cm: 23,
        max_load_kg: 150,
        image_url: '/collection-Trend.png',
        tagSlugs: ['spring', 'medium'],
        sort_order: 4
      }
    ];

    async function ensureUploadedImage(imageRelativePath, altText) {
      const fileName = imageRelativePath.replace(/^\//, '');
      const existing = await strapi.db.query('plugin::upload.file').findOne({
        where: { name: fileName }
      });
      if (existing) return existing;

      const sourcePath = path.join(strapi.dirs.app.root, '..', 'public', fileName);
      if (!fs.existsSync(sourcePath)) return null;
      const stat = fs.statSync(sourcePath);
      const uploaded = await strapi.plugin('upload').service('upload').upload({
        data: {
          fileInfo: {
            name: fileName,
            alternativeText: altText || '',
            caption: altText || ''
          }
        },
        files: {
          filepath: sourcePath,
          originalFilename: fileName,
          mimetype: mimeTypes.lookup(fileName) || 'image/png',
          size: stat.size
        }
      });
      return Array.isArray(uploaded) ? uploaded[0] || null : uploaded || null;
    }

    const existingProducts = await strapi.documents('api::product.product').findMany({
      fields: ['documentId', 'slug', 'name'],
      populate: { media: true },
      pagination: { pageSize: 200 }
    });

    if (!Array.isArray(existingProducts) || existingProducts.length === 0) {
      for (const item of productsInput) {
        const uploadedFile = await ensureUploadedImage(item.image_url, `Коллекция ${item.name}`);
        await strapi.documents('api::product.product').create({
          data: {
            name: item.name,
            slug: item.slug,
            collection: collectionsBySlug[item.collectionSlug]?.documentId || null,
            firmness: item.firmness,
            mattress_type: item.mattress_type,
            height_cm: item.height_cm,
            max_load_kg: item.max_load_kg,
            image_url: item.image_url,
            media: uploadedFile?.id || null,
            is_active: true,
            sort_order: item.sort_order,
            tags: item.tagSlugs.map((slug) => tagsBySlug[slug]?.documentId).filter(Boolean)
          }
        });
      }
      strapi.log.info('Catalog seed data created');
      return;
    }

    // Existing DB path: attach media to already seeded products if missing.
    const productSeedBySlug = Object.fromEntries(productsInput.map((item) => [item.slug, item]));
    for (const product of existingProducts) {
      if (product.media) continue;
      const seed = productSeedBySlug[product.slug];
      if (!seed) continue;
      const uploadedFile = await ensureUploadedImage(seed.image_url, `Коллекция ${seed.name}`);
      if (!uploadedFile) continue;
      await strapi.documents('api::product.product').update({
        documentId: product.documentId,
        data: { media: uploadedFile.id }
      });
    }
    strapi.log.info('Catalog media sync completed');
  },
};
