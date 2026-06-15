'use strict';

const fs = require('fs');
const path = require('path');

const UID = 'api::download-catalog-page.download-catalog-page';

const SEED_SLIDES = [
  { file: 'download-slide-01.avif', alt: 'Каталог продукции Grassigrosso' },
  { file: 'download-slide-02.avif', alt: 'Grassigrosso — слайд 2' },
  { file: 'download-slide-03.avif', alt: 'Grassigrosso — слайд 3' },
  { file: 'download-slide-04.avif', alt: 'Grassigrosso — слайд 4' },
  { file: 'download-slide-05.avif', alt: 'Grassigrosso — слайд 5' },
  { file: 'download-slide-06.avif', alt: 'Grassigrosso — слайд 6' },
  { file: 'download-slide-07.avif', alt: 'Grassigrosso — слайд 7' },
  { file: 'download-slide-08.avif', alt: 'Grassigrosso — слайд 8' },
];

function resolveSeedDir() {
  const candidates = [];
  try {
    const root = strapi && strapi.dirs && strapi.dirs.app && strapi.dirs.app.root;
    if (root) candidates.push(path.join(root, 'database', 'seed', 'download-slides'));
  } catch {}
  candidates.push(path.resolve(__dirname, '..', '..', '..', '..', 'database', 'seed', 'download-slides'));
  candidates.push(path.resolve(__dirname, '..', '..', '..', '..', '..', 'database', 'seed', 'download-slides'));
  for (const dir of candidates) {
    try {
      if (fs.existsSync(dir)) return dir;
    } catch {}
  }
  return null;
}

async function findOrUploadFile(uploadService, name, filepath, alt) {
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name } });
  if (existing) return existing.id;

  const stats = fs.statSync(filepath);
  const uploaded = await uploadService.upload({
    data: { fileInfo: { name, alternativeText: alt, caption: '' } },
    files: {
      filepath,
      originalFilename: name,
      mimetype: 'image/avif',
      size: stats.size,
    },
  });
  const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
  return file?.id ?? null;
}

/**
 * Idempotently seed the "Download catalog page" single type with the default
 * 8 slides. Runs only when the single type has no media slides yet, so admin
 * edits are never overwritten. On prod the seed data.db usually already has
 * content, so this acts as a safety net for empty databases.
 *
 * @param {import('@strapi/types').Core.Strapi} strapi
 */
async function seedDownloadCatalogPage(strapi) {
  const docs = strapi.documents(UID);
  const existing = await docs.findFirst({
    populate: { slides: { populate: ['slide_image', 'slide_video'] } },
  });
  const hasSlides =
    existing &&
    Array.isArray(existing.slides) &&
    existing.slides.some((row) => row && (row.slide_image || row.slide_video));
  if (hasSlides) return { skipped: true };

  const seedDir = resolveSeedDir();
  if (!seedDir) {
    strapi.log.warn('Download catalog seed: seed-slides directory not found, skipping');
    return { skipped: true };
  }

  const uploadService = strapi.plugin('upload').service('upload');
  const slides = [];
  for (const entry of SEED_SLIDES) {
    const filepath = path.join(seedDir, entry.file);
    if (!fs.existsSync(filepath)) {
      strapi.log.warn(`Download catalog seed: missing ${entry.file}, skipping slide`);
      continue;
    }
    const fileId = await findOrUploadFile(uploadService, entry.file, filepath, entry.alt);
    if (fileId != null) {
      slides.push({ slide_image: fileId, alt_text: entry.alt });
    }
  }

  if (!slides.length) return { skipped: true };

  const data = { slider_autoplay_ms: 6500, slides };
  if (existing) {
    await docs.update({ documentId: existing.documentId, data });
  } else {
    await docs.create({ data });
  }

  strapi.log.info(`Download catalog seed: populated single type with ${slides.length} slides`);
  return { seeded: slides.length };
}

module.exports = { seedDownloadCatalogPage };
