/**
 * Explicit deep-populate descriptors for Wave 1 single types.
 * Do not use populate=* as the contract — feeds must pass these objects.
 */
import { SLUG_TO_UID } from './constants.mjs'

/** @typedef {{ populate?: Record<string, true | PopulateNode> } | true} PopulateNode */

/** @type {Record<string, Record<string, true | { populate: Record<string, true | { populate?: Record<string, true> }> }>>} */
export const DEEP_POPULATE_BY_SLUG = Object.freeze({
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
    slides: {
      populate: {
        slide_image: true,
        slide_video: true,
        poster: true,
      },
    },
  },
})

/** Dotted paths the integration harness must see after populate (Phase C). */
export const POPULATE_ASSERT_PATHS_BY_SLUG = Object.freeze({
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
    'catalog_pdf',
    'media_display_mode',
    'slides',
    'slides.slide_image',
    'slides.slide_video',
    'slides.poster',
  ],
})

/**
 * @param {string} slug
 */
export function getDeepPopulateForSlug(slug) {
  const populate = DEEP_POPULATE_BY_SLUG[slug]
  if (!populate) throw new Error(`No deep populate descriptor for slug: ${slug}`)
  return {
    uid: SLUG_TO_UID[slug],
    populate,
    assertPaths: POPULATE_ASSERT_PATHS_BY_SLUG[slug],
  }
}

/**
 * Ensure descriptor never uses populate=* sentinel.
 * @param {unknown} node
 * @param {string} path
 * @param {string[]} failures
 */
export function assertNoStarPopulate(node, path, failures) {
  if (node === '*') {
    failures.push(`${path}: populate=* is forbidden`)
    return
  }
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((item, i) => assertNoStarPopulate(item, `${path}[${i}]`, failures))
    return
  }
  for (const [key, value] of Object.entries(node)) {
    if (key === 'populate' && value === '*') {
      failures.push(`${path}.populate: * is forbidden`)
    }
    assertNoStarPopulate(value, `${path}.${key}`, failures)
  }
}
