/**
 * Path-aware merge descriptors for pages CMS hydrate (design §1–§2).
 * Content-only items are validated against these allowlists — never against themselves.
 */

export type FieldDesc =
  | { kind: 'string'; optionalEmpty?: boolean; optional?: boolean }
  | { kind: 'nullableString' }
  | { kind: 'boolean'; optional?: boolean }
  | { kind: 'number'; optional?: boolean }
  | { kind: 'media'; optional: boolean }
  | { kind: 'object'; fields: Record<string, FieldDesc> }
  | { kind: 'contentArray'; item: ItemDescName }
  | { kind: 'behaviorArray'; key: string; item: ItemDescName }

export type ItemDescName =
  | 'listItem'
  | 'faqItem'
  | 'stat'
  | 'solutionCard'
  | 'collection'
  | 'testimonial'
  | 'category'
  | 'discountRow'
  | 'refreshFeature'
  | 'offerOrRequirement'
  | 'geographyCity'
  | 'documentCard'
  | 'dealerPackage'
  | 'office'
  | 'contactInfo'
  | 'productCard'

const listItem: FieldDesc = {
  kind: 'object',
  fields: {
    title: { kind: 'string' },
    text: { kind: 'string', optionalEmpty: true, optional: true },
    href: { kind: 'string', optionalEmpty: true, optional: true },
  },
}

const faqItem: FieldDesc = {
  kind: 'object',
  fields: {
    question: { kind: 'string' },
    answer: { kind: 'string' },
    open_by_default: { kind: 'boolean', optional: true },
  },
}

const stat: FieldDesc = {
  kind: 'object',
  fields: {
    label: { kind: 'string' },
    value: { kind: 'string' },
  },
}

const solutionCard: FieldDesc = {
  kind: 'object',
  fields: {
    title: { kind: 'string' },
    text: { kind: 'string', optionalEmpty: true, optional: true },
    href: { kind: 'string', optionalEmpty: true, optional: true },
    icon: { kind: 'media', optional: true },
  },
}

const collection: FieldDesc = {
  kind: 'object',
  fields: {
    name: { kind: 'string' },
    href: { kind: 'string', optionalEmpty: true, optional: true },
    image: { kind: 'media', optional: false },
    image_alt: { kind: 'string', optionalEmpty: true, optional: true },
    features: { kind: 'contentArray', item: 'listItem' },
  },
}

const testimonial: FieldDesc = {
  kind: 'object',
  fields: {
    tag: { kind: 'string', optionalEmpty: true, optional: true },
    company: { kind: 'string' },
    author_name: { kind: 'string' },
    author_role: { kind: 'string', optionalEmpty: true, optional: true },
    rating: { kind: 'number', optional: true },
    text: { kind: 'string' },
  },
}

const category: FieldDesc = {
  kind: 'object',
  fields: {
    name: { kind: 'string' },
    text: { kind: 'string' },
    active: { kind: 'boolean', optional: true },
  },
}

const discountRow: FieldDesc = {
  kind: 'object',
  fields: {
    amount_label: { kind: 'string' },
    discount_label: { kind: 'string' },
    terms_label: { kind: 'string' },
    highlight: { kind: 'boolean', optional: true },
  },
}

const refreshFeature: FieldDesc = {
  kind: 'object',
  fields: {
    title: { kind: 'string' },
    text: { kind: 'string', optionalEmpty: true, optional: true },
    icon: { kind: 'media', optional: true },
  },
}

const offerOrRequirement: FieldDesc = {
  kind: 'object',
  fields: {
    title: { kind: 'string' },
    icon: { kind: 'media', optional: true },
    bullets: { kind: 'contentArray', item: 'listItem' },
  },
}

const geographyCity: FieldDesc = {
  kind: 'object',
  fields: {
    name: { kind: 'string' },
    badge: { kind: 'string', optionalEmpty: true, optional: true },
    sort_order: { kind: 'number', optional: true },
  },
}

const documentCard: FieldDesc = {
  kind: 'object',
  fields: {
    document_key: { kind: 'string' },
    title: { kind: 'string' },
    type_label: { kind: 'string', optionalEmpty: true, optional: true },
    size_label: { kind: 'string', optionalEmpty: true, optional: true },
    request_label: { kind: 'string', optionalEmpty: true, optional: true },
    request_aria_label: { kind: 'string', optionalEmpty: true, optional: true },
    kind: { kind: 'string', optionalEmpty: true, optional: true },
    file: { kind: 'media', optional: true },
  },
}

const dealerPackage: FieldDesc = {
  kind: 'object',
  fields: {
    value: { kind: 'string' },
    title: { kind: 'string' },
    price: { kind: 'string' },
    form_option_label: { kind: 'string' },
    cta_label: { kind: 'string' },
    featured: { kind: 'boolean', optional: true },
    features: { kind: 'contentArray', item: 'listItem' },
  },
}

const office: FieldDesc = {
  kind: 'object',
  fields: {
    slug: { kind: 'string' },
    tab_label: { kind: 'string' },
    badge: { kind: 'string', optionalEmpty: true, optional: true },
    city: { kind: 'string' },
    region: { kind: 'string', optionalEmpty: true, optional: true },
    address: { kind: 'string' },
    phone: { kind: 'string' },
    phone_href: { kind: 'string', optionalEmpty: true, optional: true },
    email: { kind: 'string' },
    schedule: { kind: 'string', optionalEmpty: true, optional: true },
    map_embed_url: { kind: 'nullableString' },
  },
}

const contactInfo: FieldDesc = {
  kind: 'object',
  fields: {
    title: { kind: 'string' },
    value: { kind: 'string' },
    note: { kind: 'string', optionalEmpty: true, optional: true },
    href: { kind: 'string', optionalEmpty: true, optional: true },
    icon_key: { kind: 'string' },
  },
}

const productCard: FieldDesc = {
  kind: 'object',
  fields: {
    catalog_key: { kind: 'string' },
    title: { kind: 'string' },
    description: { kind: 'string', optionalEmpty: true, optional: true },
    image: { kind: 'media', optional: false },
    image_alt: { kind: 'string', optionalEmpty: true, optional: true },
    cta_label: { kind: 'string', optionalEmpty: true, optional: true },
  },
}

export const ITEM_DESCRIPTORS: Record<ItemDescName, FieldDesc> = {
  listItem,
  faqItem,
  stat,
  solutionCard,
  collection,
  testimonial,
  category,
  discountRow,
  refreshFeature,
  offerOrRequirement,
  geographyCity,
  documentCard,
  dealerPackage,
  office,
  contactInfo,
  productCard,
}

/** Content-only arrays by field name → item descriptor. */
export const CONTENT_ARRAY_ITEMS: Readonly<Record<string, ItemDescName>> = {
  solutions: 'solutionCard',
  philosophy_cards: 'solutionCard',
  collections: 'collection',
  features: 'listItem',
  testimonials: 'testimonial',
  stats: 'stat',
  categories: 'category',
  discount_rows: 'discountRow',
  refresh_features: 'refreshFeature',
  faq_items: 'faqItem',
  conditions: 'listItem',
  offers: 'offerOrRequirement',
  bullets: 'listItem',
  geography_cities: 'geographyCity',
  requirements: 'offerOrRequirement',
}

/** Behavior-bound arrays by field name → stable key + item descriptor. */
export const BEHAVIOR_ARRAY_ITEMS: Readonly<
  Record<string, { key: string; item: ItemDescName }>
> = {
  packages: { key: 'value', item: 'dealerPackage' },
  certificates: { key: 'document_key', item: 'documentCard' },
  company_documents: { key: 'document_key', item: 'documentCard' },
  docs: { key: 'document_key', item: 'documentCard' },
  offices: { key: 'slug', item: 'office' },
  products: { key: 'catalog_key', item: 'productCard' },
  contact_info: { key: 'icon_key', item: 'contactInfo' },
}

/**
 * Root / nested scalar+media field rules used when merging onto a fallback twin
 * (hero, titles, etc.). Media nullability is path/key specific — not inferred from null.
 */
export const ROOT_FIELD_HINTS: Readonly<Record<string, FieldDesc>> = {
  map_embed_url: { kind: 'nullableString' },
  // required media
  image: { kind: 'media', optional: false },
  catalog_pdf: { kind: 'media', optional: false },
  partners_image_desktop: { kind: 'media', optional: false },
  partners_image_mobile: { kind: 'media', optional: false },
  geography_map_image: { kind: 'media', optional: false },
  quality_image: { kind: 'media', optional: false },
  company_illustration: { kind: 'media', optional: false },
  conditions_icon: { kind: 'media', optional: true },
  icon: { kind: 'media', optional: true },
  file: { kind: 'media', optional: true },
  // optional-empty strings
  note: { kind: 'string', optionalEmpty: true, optional: true },
  href: { kind: 'string', optionalEmpty: true, optional: true },
  text: { kind: 'string', optionalEmpty: true, optional: true },
  region: { kind: 'string', optionalEmpty: true, optional: true },
  image_alt: { kind: 'string', optionalEmpty: true, optional: true },
}

export function resolveItemDescriptor(name: ItemDescName): FieldDesc {
  return ITEM_DESCRIPTORS[name]
}
