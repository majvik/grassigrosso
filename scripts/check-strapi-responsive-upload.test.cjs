'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const sharp = require('sharp');

const {
  generateUploadResponsiveVariants,
  isSupportedRasterUpload,
} = require('../strapi-catalog/src/extensions/upload/responsive-upload');
const { extendUploadPlugin } = require('../strapi-catalog/src/extensions/upload/strapi-server');

test('recognizes raster uploads but leaves svg and video untouched', () => {
  assert.equal(isSupportedRasterUpload({ ext: '.png', mime: 'image/png' }), true);
  assert.equal(isSupportedRasterUpload({ ext: '.jpg', mime: 'image/jpeg' }), true);
  assert.equal(isSupportedRasterUpload({ ext: '.svg', mime: 'image/svg+xml' }), false);
  assert.equal(isSupportedRasterUpload({ ext: '.mp4', mime: 'video/mp4' }), false);
});

test('creates complete slot variants next to a newly uploaded local file', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grassigrosso-upload-hook-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const uploadsDir = path.join(root, 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const source = path.join(uploadsDir, 'new-product.png');
  await sharp({ create: { width: 1200, height: 1200, channels: 4, background: '#fff' } }).png().toFile(source);

  const result = await generateUploadResponsiveVariants({
    file: { url: '/uploads/new-product.png', ext: '.png', mime: 'image/png' },
    publicDir: root,
    slots: [{ id: 'catalog-card', width: 470, height: 470, fit: 'cover' }],
  });

  assert.equal(result.generated.length, 6);
  for (const name of ['new-product--catalog-card.avif', 'new-product--catalog-card.webp', 'new-product--catalog-card.png', 'new-product--catalog-card@2x.avif', 'new-product--catalog-card@2x.webp', 'new-product--catalog-card@2x.png']) {
    await fs.access(path.join(uploadsDir, 'responsive', name));
  }
});

test('does not upscale undersized uploads', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grassigrosso-upload-hook-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const uploadsDir = path.join(root, 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  await sharp({ create: { width: 300, height: 300, channels: 4, background: '#fff' } }).png().toFile(path.join(uploadsDir, 'small.png'));
  const result = await generateUploadResponsiveVariants({
    file: { url: '/uploads/small.png', ext: '.png', mime: 'image/png' },
    publicDir: root,
    slots: [{ id: 'catalog-card', width: 470, height: 470, fit: 'cover' }],
  });
  assert.deepEqual(result.generated, []);
  assert.deepEqual(result.skipped, ['catalog-card']);
});

test('fullscreen variants preserve portrait proportions without enlargement', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grassigrosso-fullscreen-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const uploads = path.join(root, 'uploads');
  await fs.mkdir(uploads);
  await sharp({ create: { width: 300, height: 600, channels: 4, background: '#fff' } }).png().toFile(path.join(uploads, 'portrait.png'));
  const result = await generateUploadResponsiveVariants({
    file: { url: '/uploads/portrait.png', ext: '.png', mime: 'image/png' },
    publicDir: root,
    slots: [{ id: 'product-fullscreen', width: 500, height: 500, fit: 'inside' }],
  });
  assert.equal(result.generated.length, 6);
  for (const file of result.generated) {
    const {width,height} = await sharp(file).metadata();
    assert.deepEqual([width,height], file.includes('@2x') ? [300,600] : [250,500]);
  }
});

test('removes stale variants when a replacement is too small', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grassigrosso-upload-hook-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const uploadsDir = path.join(root, 'uploads');
  const responsiveDir = path.join(uploadsDir, 'responsive');
  await fs.mkdir(responsiveDir, { recursive: true });
  await sharp({ create: { width: 300, height: 300, channels: 4, background: '#fff' } }).png().toFile(path.join(uploadsDir, 'replacement.png'));
  await fs.writeFile(path.join(responsiveDir, 'replacement--catalog-card@2x.webp'), 'stale');
  await generateUploadResponsiveVariants({
    file: { url: '/uploads/replacement.png', ext: '.png', mime: 'image/png' },
    publicDir: root,
    slots: [{ id: 'catalog-card', width: 470, height: 470, fit: 'cover' }],
  });
  await assert.rejects(fs.access(path.join(responsiveDir, 'replacement--catalog-card@2x.webp')));
});

test('Strapi extension generates variants after both upload and replace', async () => {
  const calls = [];
  const plugin = {
    services: {
      upload: () => ({
        async upload() { return [{ url: '/uploads/new.png', mime: 'image/png', ext: '.png' }]; },
        async replace() { return { url: '/uploads/replaced.png', mime: 'image/png', ext: '.png' }; },
      }),
    },
  };
  extendUploadPlugin(plugin, {
    publicDir: '/virtual/public',
    logger: { info() {}, warn() {}, error() {} },
    async generate(args) {
      calls.push(args);
      return { generated: ['variant'], skipped: [] };
    },
  });
  const uploadService = plugin.services.upload({});
  await uploadService.upload({});
  await uploadService.replace(1, {});
  assert.deepEqual(calls.map(({ file, publicDir }) => [file.url, publicDir]), [
    ['/uploads/new.png', '/virtual/public'],
    ['/uploads/replaced.png', '/virtual/public'],
  ]);
});
