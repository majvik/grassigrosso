'use strict';

/**
 * Sync Content Manager edit/list labels for Wave 1 page components + single types
 * from schema attribute displayName (Russian). CM caches English attr names on first load.
 */
async function syncPagesCmsAdminLabels(strapi) {
  const componentUids = Object.keys(strapi.components || {}).filter((uid) => uid.startsWith('page.'));
  const singleTypeUids = Object.keys(strapi.contentTypes || {}).filter((uid) => {
    const ct = strapi.contentTypes[uid];
    return ct?.kind === 'singleType' && /^(api::)(index|hotels|dealers|contacts|documents|download-catalog)-page\./.test(uid);
  });

  let patched = 0;

  const patchStore = async (storeKey, attributes) => {
    const labels = {};
    for (const [name, attr] of Object.entries(attributes || {})) {
      if (attr?.displayName) labels[name] = attr.displayName;
    }
    if (!Object.keys(labels).length) return;

    const row = await strapi.db.connection('strapi_core_store_settings').where({ key: storeKey }).first();
    if (!row?.value) return;

    let cfg;
    try {
      cfg = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
    } catch {
      return;
    }
    if (!cfg.metadatas) cfg.metadatas = {};
    let changed = false;
    for (const [name, label] of Object.entries(labels)) {
      if (!cfg.metadatas[name]) {
        cfg.metadatas[name] = {
          edit: { label, description: '', placeholder: '', visible: true, editable: true },
          list: { label, searchable: true, sortable: true },
        };
        changed = true;
        continue;
      }
      if (cfg.metadatas[name].edit && cfg.metadatas[name].edit.label !== label) {
        cfg.metadatas[name].edit.label = label;
        changed = true;
      }
      if (cfg.metadatas[name].list && cfg.metadatas[name].list.label !== label) {
        cfg.metadatas[name].list.label = label;
        changed = true;
      }
    }
    if (!changed) return;
    await strapi.db
      .connection('strapi_core_store_settings')
      .where({ id: row.id })
      .update({ value: JSON.stringify(cfg) });
    patched += 1;
  };

  for (const uid of componentUids) {
    await patchStore(
      `plugin_content_manager_configuration_components::${uid}`,
      strapi.components[uid].attributes,
    );
  }
  for (const uid of singleTypeUids) {
    await patchStore(
      `plugin_content_manager_configuration_content_types::${uid}`,
      strapi.contentTypes[uid].attributes,
    );
  }

  if (patched) {
    strapi.log.info(`Pages CMS: synced RU Content Manager labels for ${patched} schema configuration(s)`);
  }
}

module.exports = { syncPagesCmsAdminLabels };
