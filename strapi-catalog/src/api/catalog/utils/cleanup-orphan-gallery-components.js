'use strict';

const COMPONENT_TYPE = 'catalog.product-gallery-item';

/**
 * Remove gallery component rows left behind after low-level product deletes.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi
 * @returns {Promise<number>} number of removed component rows
 */
async function cleanupOrphanGalleryComponents(strapi) {
  const conn = strapi.db.connection;
  const orphanRows = await conn('components_catalog_product_gallery_items as g')
    .leftJoin('products_cmps as pc', function joinProductsCmps() {
      this.on('pc.cmp_id', '=', 'g.id').andOn(
        'pc.component_type',
        '=',
        conn.raw('?', [COMPONENT_TYPE])
      );
    })
    .whereNull('pc.id')
    .select('g.id');

  if (!orphanRows.length) return 0;

  const ids = orphanRows.map((row) => row.id);
  await conn('files_related_mph')
    .where({ related_type: COMPONENT_TYPE })
    .whereIn('related_id', ids)
    .del();
  await conn('components_catalog_product_gallery_items').whereIn('id', ids).del();

  return ids.length;
}

module.exports = {
  cleanupOrphanGalleryComponents,
};
