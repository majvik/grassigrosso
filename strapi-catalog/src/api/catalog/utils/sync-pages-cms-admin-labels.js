'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Sync Content Manager edit/list labels from schema attribute displayName (Russian).
 * CM caches English attr names on first load. Prefer labels from on-disk schema JSON
 * because Strapi may strip non-standard `displayName` from runtime attribute objects.
 */
async function syncPagesCmsAdminLabels(strapi) {
  const appRoot = strapi.dirs?.app?.root || process.cwd();
  const labelsByUid = collectDisplayNamesFromDisk(appRoot);

  let patched = 0;

  const patchStore = async (storeKey, labels) => {
    if (!labels || !Object.keys(labels).length) return;

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

  for (const [uid, labels] of Object.entries(labelsByUid.components)) {
    await patchStore(`plugin_content_manager_configuration_components::${uid}`, labels);
  }
  for (const [uid, labels] of Object.entries(labelsByUid.contentTypes)) {
    await patchStore(`plugin_content_manager_configuration_content_types::${uid}`, labels);
  }

  if (patched) {
    strapi.log.info(`Pages CMS: synced RU Content Manager labels for ${patched} schema configuration(s)`);
  }
}

function collectDisplayNamesFromDisk(appRoot) {
  const components = {};
  const contentTypes = {};

  const componentsRoot = path.join(appRoot, 'src', 'components');
  if (fs.existsSync(componentsRoot)) {
    for (const category of fs.readdirSync(componentsRoot)) {
      const catDir = path.join(componentsRoot, category);
      if (!fs.statSync(catDir).isDirectory()) continue;
      for (const file of fs.readdirSync(catDir).filter((f) => f.endsWith('.json'))) {
        const schema = readJson(path.join(catDir, file));
        const uid = `${category}.${path.basename(file, '.json')}`;
        const labels = attrLabels(schema);
        if (Object.keys(labels).length) components[uid] = labels;
      }
    }
  }

  const apiRoot = path.join(appRoot, 'src', 'api');
  if (fs.existsSync(apiRoot)) {
    for (const apiName of fs.readdirSync(apiRoot)) {
      const ctRoot = path.join(apiRoot, apiName, 'content-types');
      if (!fs.existsSync(ctRoot)) continue;
      for (const ctName of fs.readdirSync(ctRoot)) {
        const schemaPath = path.join(ctRoot, ctName, 'schema.json');
        if (!fs.existsSync(schemaPath)) continue;
        const schema = readJson(schemaPath);
        const uid = `api::${apiName}.${ctName}`;
        const labels = attrLabels(schema);
        if (Object.keys(labels).length) contentTypes[uid] = labels;
      }
    }
  }

  return { components, contentTypes };
}

function attrLabels(schema) {
  const labels = {};
  for (const [name, attr] of Object.entries(schema?.attributes || {})) {
    if (attr?.displayName) labels[name] = attr.displayName;
  }
  return labels;
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

module.exports = { syncPagesCmsAdminLabels };
