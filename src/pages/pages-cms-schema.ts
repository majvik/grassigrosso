/**
 * Schema-derived merge descriptors from content-contract (canonical path / component type).
 * Public hydrate shape: offices use map_embed_url (not map_iframe_html); download-catalog texts omit slides.
 */
import contract from '../../.planning/phases/02-wave-1-single-types/02-content-contract.json'
import {
  DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS,
  isLegalPagesCmsSlug,
  type PagesCmsSlug,
} from './pages-cms-constants'

export type FieldDesc =
  | { kind: 'string'; optionalEmpty?: boolean; optional?: boolean }
  | { kind: 'nullableString'; optional?: boolean }
  | { kind: 'boolean'; optional?: boolean }
  | { kind: 'number'; optional?: boolean }
  | { kind: 'media'; optional: boolean }
  | { kind: 'object'; fields: Record<string, FieldDesc>; component?: string }
  | { kind: 'contentArray'; component: string }
  | { kind: 'behaviorArray'; key: string; component: string }
  | { kind: 'component'; component: string }

/** Behavior-bound arrays: field name → stable key (design §2). */
export const BEHAVIOR_ARRAY_KEYS: Readonly<Record<string, string>> = {
  packages: 'value',
  certificates: 'document_key',
  company_documents: 'document_key',
  docs: 'document_key',
  offices: 'slug',
  products: 'catalog_key',
  contact_info: 'icon_key',
}

/** @deprecated alias for harness compatibility */
export const BEHAVIOR_ARRAY_ITEMS: Readonly<
  Record<string, { key: string; item: string }>
> = Object.fromEntries(
  Object.entries(BEHAVIOR_ARRAY_KEYS).map(([field, key]) => [field, { key, item: field }]),
)

export const BEHAVIOR_BOUND_ARRAYS = BEHAVIOR_ARRAY_KEYS

const SLUG_TO_UID: Partial<Record<PagesCmsSlug, string>> = {
  index: 'index-page',
  hotels: 'hotels-page',
  dealers: 'dealers-page',
  contacts: 'contacts-page',
  documents: 'documents-page',
  'download-catalog': 'download-catalog-page',
}

type ContractAttr = {
  type: string
  required?: boolean
  repeatable?: boolean
  component?: string
  enum?: string[]
}

type ContractComponent = {
  attributes: Record<string, ContractAttr>
}

const components = contract.definitions.components as Record<string, ContractComponent>
const singleTypes = contract.definitions.singleTypes as Record<
  string,
  { attributes: Record<string, ContractAttr> }
>

function attrToFieldDesc(fieldName: string, attr: ContractAttr): FieldDesc {
  const required = Boolean(attr.required)
  const optional = !required

  switch (attr.type) {
    case 'string':
    case 'text':
    case 'email':
    case 'uid':
    case 'enumeration':
      return { kind: 'string', optional, optionalEmpty: optional }
    case 'boolean':
      return { kind: 'boolean', optional }
    case 'integer':
    case 'biginteger':
    case 'float':
    case 'decimal':
      return { kind: 'number', optional }
    case 'media':
      return { kind: 'media', optional }
    case 'component': {
      if (!attr.component) {
        throw new Error(`component attr ${fieldName} missing component uid`)
      }
      if (attr.repeatable) {
        const stable = BEHAVIOR_ARRAY_KEYS[fieldName]
        if (stable) {
          return { kind: 'behaviorArray', key: stable, component: attr.component }
        }
        return { kind: 'contentArray', component: attr.component }
      }
      return { kind: 'component', component: attr.component }
    }
    case 'json':
      // Not used in wave-1 public merge; reject if present via unknown
      return { kind: 'string', optional: true, optionalEmpty: true }
    default:
      throw new Error(`Unsupported attr type ${attr.type} at ${fieldName}`)
  }
}

function buildComponentObject(uid: string): FieldDesc {
  const def = components[uid]
  if (!def) throw new Error(`Unknown component ${uid}`)
  const fields: Record<string, FieldDesc> = {}
  for (const [name, attr] of Object.entries(def.attributes)) {
    // Public canonical offices: map_iframe_html → map_embed_url (nullable)
    if (uid === 'page.office' && name === 'map_iframe_html') {
      fields.map_embed_url = { kind: 'nullableString', optional: true }
      continue
    }
    fields[name] = attrToFieldDesc(name, attr)
  }
  return { kind: 'object', fields, component: uid }
}

const componentCache = new Map<string, FieldDesc>()

export function resolveComponentSchema(uid: string): FieldDesc {
  let cached = componentCache.get(uid)
  if (!cached) {
    cached = buildComponentObject(uid)
    componentCache.set(uid, cached)
  }
  return cached
}

function buildPageRootSchema(slug: PagesCmsSlug): FieldDesc {
  if (slug === 'privacy' || slug === 'terms' || slug === 'cookies') {
    return {
      kind: 'object',
      component: `${slug}-page`,
      fields: {
        title: { kind: 'string' },
        effective_date: { kind: 'string' },
        body: { kind: 'object', fields: {} },
      },
    }
  }
  const uid = SLUG_TO_UID[slug]
  const def = uid ? singleTypes[uid] : undefined
  if (!def) throw new Error(`Unknown single type for slug ${slug}`)
  const fields: Record<string, FieldDesc> = {}
  for (const [name, attr] of Object.entries(def.attributes)) {
    if (
      slug === 'download-catalog' &&
      (DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS as readonly string[]).includes(name)
    ) {
      continue
    }
    fields[name] = attrToFieldDesc(name, attr)
  }
  return { kind: 'object', fields, component: uid }
}

const pageSchemaCache = new Map<PagesCmsSlug, FieldDesc>()

export function getPageRootSchema(slug: PagesCmsSlug): FieldDesc {
  let cached = pageSchemaCache.get(slug)
  if (!cached) {
    cached = buildPageRootSchema(slug)
    pageSchemaCache.set(slug, cached)
  }
  return cached
}

export function resolveFieldDesc(desc: FieldDesc): FieldDesc {
  if (desc.kind === 'component') return resolveComponentSchema(desc.component)
  return desc
}

/** Collect media paths that are required (optional:false) under a page schema. */
export function listRequiredMediaPaths(slug: PagesCmsSlug): string[] {
  const out: string[] = []
  function walk(desc: FieldDesc, path: string) {
    const resolved = resolveFieldDesc(desc)
    if (resolved.kind === 'media' && !resolved.optional) out.push(path || '(root)')
    if (resolved.kind === 'object') {
      for (const [k, child] of Object.entries(resolved.fields)) {
        walk(child, path ? `${path}.${k}` : k)
      }
    }
    if (resolved.kind === 'contentArray' || resolved.kind === 'behaviorArray') {
      walk(resolveComponentSchema(resolved.component), path ? `${path}[]` : '[]')
    }
  }
  walk(getPageRootSchema(slug), '')
  return out
}

/**
 * Coverage: every key in `data` must be described by schema at that path.
 * Returns failure messages (empty = PASS).
 */
export function collectUndescribedFixturePaths(
  slug: PagesCmsSlug,
  data: unknown,
): string[] {
  // Legal payload shape is enforced by canonicalizeLegalPageData (not Wave-1 FieldDesc).
  if (isLegalPagesCmsSlug(slug)) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return [`${slug}: expected object for coverage`]
    }
    return []
  }
  const failures: string[] = []
  function walk(node: unknown, desc: FieldDesc, path: string) {
    const resolved = resolveFieldDesc(desc)
    if (resolved.kind === 'object') {
      if (!node || typeof node !== 'object' || Array.isArray(node)) {
        failures.push(`${path || slug}: expected object for coverage`)
        return
      }
      const obj = node as Record<string, unknown>
      for (const key of Object.keys(obj)) {
        if (!(key in resolved.fields)) {
          failures.push(`${path ? `${path}.` : ''}${key}: undescribed by schema`)
          continue
        }
        walk(obj[key], resolved.fields[key], path ? `${path}.${key}` : key)
      }
      return
    }
    if (resolved.kind === 'contentArray' || resolved.kind === 'behaviorArray') {
      if (!Array.isArray(node)) {
        failures.push(`${path}: expected array for coverage`)
        return
      }
      const item = resolveComponentSchema(resolved.component)
      node.forEach((el, i) => walk(el, item, `${path}[${i}]`))
      return
    }
    // scalars / media / nullable — leaf
  }
  walk(data, getPageRootSchema(slug), '')
  return failures
}

/** CONTENT_ONLY_ARRAYS: repeatable component fields not in BEHAVIOR_ARRAY_KEYS */
export function isContentOnlyArrayField(fieldName: string, pageSlug?: PagesCmsSlug): boolean {
  if (fieldName in BEHAVIOR_ARRAY_KEYS) return false
  // Nested features/bullets etc. are content-only when they appear as contentArray in component schemas
  if (pageSlug) {
    const root = getPageRootSchema(pageSlug)
    if (root.kind === 'object' && root.fields[fieldName]?.kind === 'contentArray') return true
  }
  return ['features', 'bullets'].includes(fieldName)
}

export const CONTENT_ARRAY_ITEMS: Readonly<Record<string, string>> = {
  // filled for harness display; real typing comes from schema component UIDs
  solutions: 'page.solution-card',
  philosophy_cards: 'page.solution-card',
  collections: 'page.collection-card',
  features: 'page.list-item',
  testimonials: 'page.testimonial',
  stats: 'page.stat',
  categories: 'page.hotel-category',
  discount_rows: 'page.discount-row',
  refresh_features: 'page.refresh-feature',
  faq_items: 'page.faq-item',
  conditions: 'page.list-item',
  offers: 'page.offer-card',
  bullets: 'page.list-item',
  geography_cities: 'page.geo-city',
  requirements: 'page.requirement-card',
}
