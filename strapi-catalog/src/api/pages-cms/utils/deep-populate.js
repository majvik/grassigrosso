'use strict';

const { SLUG_TO_UID, PAGES_CMS_SLUGS } = require('./map-allowlist');
const { LEGAL_SLUG_TO_UID, LEGAL_PAGES_CMS_SLUGS } = require('./legal-allowlist');

/** Explicit nested populate for legal dynamic-zone body (no populate=*). */
const LEGAL_BODY_POPULATE = Object.freeze({
  on: {
    'legal.paragraph-block': {
      populate: {
        runs: true,
      },
    },
    'legal.list-block': {
      populate: {
        items: {
          populate: {
            runs: true,
          },
        },
      },
    },
    'legal.table-block': {
      populate: {
        headers: true,
        rows: {
          populate: {
            cells: {
              populate: {
                runs: true,
              },
            },
          },
        },
      },
    },
    'legal.operator-block': true,
  },
});

/**
 * Explicit deep-populate for Wave 1 page feeds.
 * download-catalog = texts/PDF only (slides live in download-catalog-feed).
 */
const DEEP_POPULATE_BY_SLUG = Object.freeze({
  index: {
    hero: {
      populate: {
        poster: true,
        video_desktop: true,
        video_mobile: true,
      },
    },
    solutions: { populate: { icon: true } },
    philosophy_cards: { populate: { icon: true } },
    philosophy_presentation: { populate: { file: true } },
    collections: {
      populate: {
        image: true,
        features: true,
      },
    },
    partners_image_desktop: true,
    partners_image_mobile: true,
    testimonials: true,
    docs: { populate: { file: true } },
  },
  hotels: {
    hero: { populate: { image: true } },
    stats: true,
    categories: true,
    products: { populate: { image: true } },
    discount_rows: true,
    contact_info: true,
    refresh_features: { populate: { icon: true } },
    faq_items: true,
  },
  dealers: {
    hero: { populate: { image: true } },
    stats: true,
    conditions: true,
    conditions_icon: true,
    offers: {
      populate: {
        icon: true,
        bullets: true,
      },
    },
    geography_map_image: true,
    geography_cities: true,
    quality_image: true,
    requirements: {
      populate: {
        icon: true,
        bullets: true,
      },
    },
    packages: { populate: { features: true } },
    contact_info: true,
    faq_items: true,
  },
  contacts: {
    hero: { populate: { image: true } },
    offices: true,
    contact_info: true,
  },
  documents: {
    hero: { populate: { image: true } },
    certificates: { populate: { file: true } },
    company_illustration: true,
    company_documents: { populate: { file: true } },
    faq_items: true,
  },
  'download-catalog': {
    catalog_pdf: true,
  },
  privacy: {
    body: LEGAL_BODY_POPULATE,
  },
  terms: {
    body: LEGAL_BODY_POPULATE,
  },
  cookies: {
    body: LEGAL_BODY_POPULATE,
  },
});

/** Paths integration harness asserts after populate (texts feed — no slides). */
const POPULATE_ASSERT_PATHS_BY_SLUG = Object.freeze({
  index: [
    'hero',
    'hero.poster',
    'hero.video_desktop',
    'hero.video_mobile',
    'solutions',
    'solutions.icon',
    'philosophy_cards',
    'philosophy_cards.icon',
    'philosophy_presentation',
    'philosophy_presentation.file',
    'collections',
    'collections.image',
    'collections.features',
    'partners_image_desktop',
    'partners_image_mobile',
    'testimonials',
    'docs',
    'docs.file',
  ],
  hotels: [
    'hero',
    'hero.image',
    'stats',
    'categories',
    'products',
    'products.image',
    'discount_rows',
    'contact_info',
    'refresh_features',
    'refresh_features.icon',
    'faq_items',
  ],
  dealers: [
    'hero',
    'hero.image',
    'stats',
    'conditions',
    'conditions_icon',
    'offers',
    'offers.icon',
    'offers.bullets',
    'geography_map_image',
    'geography_cities',
    'quality_image',
    'requirements',
    'requirements.icon',
    'requirements.bullets',
    'packages',
    'packages.features',
    'contact_info',
    'faq_items',
  ],
  contacts: ['hero', 'hero.image', 'offices', 'contact_info'],
  documents: [
    'hero',
    'hero.image',
    'certificates',
    'certificates.file',
    'company_illustration',
    'company_documents',
    'company_documents.file',
    'faq_items',
  ],
  'download-catalog': [
    'title',
    'lead',
    'submit_label',
    'catalog_pdf',
    'back_label',
    'back_href',
  ],
  privacy: ['title', 'effective_date', 'body'],
  terms: ['title', 'effective_date', 'body'],
  cookies: ['title', 'effective_date', 'body'],
});

/** Keys forbidden on download-catalog texts/canonical payloads (slides feed owns these). */
const DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS = Object.freeze([
  'slides',
  'media_display_mode',
  'slider_autoplay_ms',
]);

function getDeepPopulateForSlug(slug) {
  const populate = DEEP_POPULATE_BY_SLUG[slug];
  if (!populate) throw new Error(`No deep populate descriptor for slug: ${slug}`);
  const uid = SLUG_TO_UID[slug] || LEGAL_SLUG_TO_UID[slug];
  if (!uid) throw new Error(`No UID for slug: ${slug}`);
  return {
    uid,
    populate,
    assertPaths: POPULATE_ASSERT_PATHS_BY_SLUG[slug],
  };
}

function assertNoStarPopulate(node, path, failures) {
  if (node === '*') {
    failures.push(`${path}: populate=* is forbidden`);
    return;
  }
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item, i) => assertNoStarPopulate(item, `${path}[${i}]`, failures));
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'populate' && value === '*') {
      failures.push(`${path}.populate: * is forbidden`);
    }
    assertNoStarPopulate(value, `${path}.${key}`, failures);
  }
}

module.exports = {
  DEEP_POPULATE_BY_SLUG,
  POPULATE_ASSERT_PATHS_BY_SLUG,
  DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS,
  PAGES_CMS_SLUGS,
  SLUG_TO_UID,
  LEGAL_PAGES_CMS_SLUGS,
  LEGAL_SLUG_TO_UID,
  LEGAL_BODY_POPULATE,
  getDeepPopulateForSlug,
  assertNoStarPopulate,
};
