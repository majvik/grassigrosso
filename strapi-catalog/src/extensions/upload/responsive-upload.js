'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const FORMATS = ['avif', 'webp', 'png'];

function isSupportedRasterUpload(file) {
  const ext = String(file?.ext || path.extname(file?.url || '')).toLowerCase();
  const mime = String(file?.mime || '').toLowerCase();
  return /^image\/(png|jpe?g|webp|avif)$/.test(mime) || /^\.(png|jpe?g|webp|avif)$/.test(ext);
}

async function loadSlots() {
  const candidates = [
    path.resolve(process.cwd(), '..', 'src/media/responsive-media-slots.json'),
    path.resolve(process.cwd(), 'src/media/responsive-media-slots.json'),
    path.resolve(__dirname, '../../../../src/media/responsive-media-slots.json'),
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(await fs.readFile(candidate, 'utf8'));
    } catch {
      // Try the next source/dist layout.
    }
  }
  throw new Error('Responsive media slot registry was not found');
}

async function generateUploadResponsiveVariants({ file, publicDir, slots }) {
  if (!isSupportedRasterUpload(file)) return { generated: [], skipped: [] };
  const pathname = decodeURIComponent(String(file.url || '').split(/[?#]/)[0]);
  if (!pathname.startsWith('/uploads/') || pathname.includes('/responsive/')) {
    return { generated: [], skipped: [] };
  }
  const source = path.join(publicDir, pathname.replace(/^\//, ''));
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Cannot read uploaded image dimensions: ${pathname}`);
  const outputDir = path.join(path.dirname(source), 'responsive');
  const basename = path.basename(source, path.extname(source));
  const generated = [];
  const skipped = [];
  await fs.mkdir(outputDir, { recursive: true });
  const stalePrefix = `${basename}--`;
  for (const entry of await fs.readdir(outputDir)) {
    if (entry.startsWith(stalePrefix)) await fs.unlink(path.join(outputDir, entry));
  }

  for (const slot of slots || await loadSlots()) {
    const scaleX = (slot.width * 2) / metadata.width;
    const scaleY = (slot.height * 2) / metadata.height;
    const requiredScale = slot.fit === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);
    if (requiredScale > 1 && slot.fit !== 'inside') {
      skipped.push(slot.id);
      continue;
    }
    for (const density of [1, 2]) {
      for (const format of FORMATS) {
        const suffix = density === 2 ? '@2x' : '';
        const output = path.join(outputDir, `${basename}--${slot.id}${suffix}.${format}`);
        let pipeline = sharp(source).resize(slot.width * density, slot.height * density, {
          fit: slot.fit || 'cover',
          position: 'centre',
          withoutEnlargement: true,
          background: { r: 238, g: 238, b: 238, alpha: 1 },
        });
        if (format === 'avif') pipeline = pipeline.avif({ quality: 52, effort: 4 });
        if (format === 'webp') pipeline = pipeline.webp({ quality: 82 });
        if (format === 'png') pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true });
        await pipeline.toFile(output);
        generated.push(output);
      }
    }
  }
  return { generated, skipped };
}

module.exports = { generateUploadResponsiveVariants, isSupportedRasterUpload, loadSlots };
