#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const appRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(appRoot, 'src');
const distSrcRoot = path.join(appRoot, 'dist', 'src');

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

for (const segment of ['api', 'components', 'extensions']) {
  const source = path.join(srcRoot, segment);
  if (!fs.existsSync(source)) continue;
  copyRecursive(source, path.join(distSrcRoot, segment));
}

console.log('[strapi] Prepared dist runtime source assets');
