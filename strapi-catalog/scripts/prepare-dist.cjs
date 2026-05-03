#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function copyRecursive(source, target) {
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

/**
 * Копирует api/components/extensions из src в dist/src (рядом с результатом tsc).
 * Нужно для `strapi develop`: после очистки dist и compile в dist попадают только .ts → .js,
 * без schema.json и прочих ассетов API — без копирования content-types не регистрируются.
 */
function syncDistRuntimeAssets(appRoot = path.resolve(__dirname, '..')) {
  const srcRoot = path.join(appRoot, 'src');
  const distSrcRoot = path.join(appRoot, 'dist', 'src');

  for (const segment of ['api', 'components', 'extensions']) {
    const source = path.join(srcRoot, segment);
    if (!fs.existsSync(source)) continue;
    copyRecursive(source, path.join(distSrcRoot, segment));
  }
}

if (require.main === module) {
  syncDistRuntimeAssets();
  console.log('[strapi] Prepared dist runtime source assets');
}

module.exports = { syncDistRuntimeAssets };
