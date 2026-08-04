/**
 * Atomic typed merge of CMS page data onto hardcoded fallback (Phase 4A).
 * Field rules come from content-contract schemas (canonical path / component type).
 * See design §1–§2.
 */
import type { PagesCmsSlug } from './pages-cms-constants'
import { isLegalPagesCmsSlug } from './pages-cms-constants'
import {
  getPageRootSchema,
  resolveComponentSchema,
  resolveFieldDesc,
  type FieldDesc,
} from './pages-cms-schema'
import { isPlainObject } from './pages-cms-validate'
import { canonicalizeLegalPageData, LegalContractError } from './legal-page-contract'

export type MergeSuccess<T> = { ok: true; value: T }
export type MergeFailure = { ok: false; reason: string }
export type MergeResult<T> = MergeSuccess<T> | MergeFailure

class MergeReject extends Error {
  reason: string
  constructor(reason: string) {
    super(reason)
    this.name = 'MergeReject'
    this.reason = reason
  }
}

function cloneUnknown<T>(value: T): T {
  return structuredClone(value)
}

function isMediaObject(value: unknown): value is Record<string, unknown> & { url: string } {
  return isPlainObject(value) && typeof value.url === 'string'
}

function parseString(path: string, cms: unknown, desc: Extract<FieldDesc, { kind: 'string' }>): string {
  if (cms === null) throw new MergeReject(`${path}: null string not allowed`)
  if (typeof cms !== 'string') throw new MergeReject(`${path}: expected string`)
  if (cms.trim().length === 0) {
    if (desc.optionalEmpty) return cms
    throw new MergeReject(`${path}: empty string not allowed`)
  }
  return cms
}

function parseNullableString(path: string, cms: unknown): string | null {
  if (cms === null) return null
  if (typeof cms !== 'string') throw new MergeReject(`${path}: expected string|null`)
  if (cms.trim().length === 0) throw new MergeReject(`${path}: empty string not allowed (use null)`)
  return cms
}

function parseMedia(
  path: string,
  cms: unknown,
  desc: Extract<FieldDesc, { kind: 'media' }>,
): unknown {
  if (cms === null) {
    if (desc.optional) return null
    throw new MergeReject(`${path}: required media cannot be null`)
  }
  if (!isMediaObject(cms)) throw new MergeReject(`${path}: media must be { url: string }`)
  if (cms.url.trim().length === 0) throw new MergeReject(`${path}: media.url empty`)
  const out: Record<string, unknown> = { url: cms.url }
  for (const [k, v] of Object.entries(cms)) {
    if (k === 'url') continue
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v
    } else {
      throw new MergeReject(`${path}.${k}: unsupported media field type`)
    }
  }
  return out
}

/** Test/harness helper: apply a single field descriptor (schema-derived positives/negatives). */
export function applyFieldDescForTests(
  path: string,
  cms: unknown,
  desc: FieldDesc,
): MergeResult<unknown> {
  try {
    return { ok: true, value: parseByDescriptor(path, cms, desc) }
  } catch (err) {
    if (err instanceof MergeReject) return { ok: false, reason: err.reason }
    return { ok: false, reason: err instanceof Error ? err.message : 'failed' }
  }
}

function parseByDescriptor(path: string, cms: unknown, desc: FieldDesc): unknown {
  const resolved = resolveFieldDesc(desc)
  switch (resolved.kind) {
    case 'string':
      return parseString(path, cms, resolved)
    case 'nullableString':
      return parseNullableString(path, cms)
    case 'boolean':
      if (typeof cms !== 'boolean') throw new MergeReject(`${path}: expected boolean`)
      return cms
    case 'number':
      if (typeof cms !== 'number' || !Number.isFinite(cms)) {
        throw new MergeReject(`${path}: expected finite number`)
      }
      return cms
    case 'media':
      return parseMedia(path, cms, resolved)
    case 'object':
      return parseObjectReplace(path, cms, resolved.fields)
    case 'contentArray':
      return parseContentArray(path, cms, resolved.component)
    case 'behaviorArray':
      throw new MergeReject(`${path}: behavior arrays require fallback merge`)
    case 'component':
      return parseByDescriptor(path, cms, resolveComponentSchema(resolved.component))
    default:
      throw new MergeReject(`${path}: unknown descriptor kind`)
  }
}

/** Content-only / full CMS object: allowlist from schema; required fields must be present. */
function parseObjectReplace(
  path: string,
  cms: unknown,
  fields: Record<string, FieldDesc>,
): Record<string, unknown> {
  if (!isPlainObject(cms)) throw new MergeReject(`${path}: expected object`)
  for (const key of Object.keys(cms)) {
    if (!(key in fields)) throw new MergeReject(`${path}.${key}: unknown key`)
  }
  const out: Record<string, unknown> = {}
  for (const [key, fieldDesc] of Object.entries(fields)) {
    const childPath = path ? `${path}.${key}` : key
    const resolved = resolveFieldDesc(fieldDesc)
    if (!(key in cms)) {
      if (isOptionalDesc(resolved)) continue
      throw new MergeReject(`${childPath}: missing required field`)
    }
    out[key] = parseByDescriptor(childPath, cms[key], fieldDesc)
  }
  return out
}

function isOptionalDesc(desc: FieldDesc): boolean {
  const r = resolveFieldDesc(desc)
  if (r.kind === 'string' || r.kind === 'boolean' || r.kind === 'number' || r.kind === 'nullableString') {
    return Boolean(r.optional)
  }
  if (r.kind === 'media') return r.optional
  if (r.kind === 'contentArray') return true
  if (r.kind === 'behaviorArray') return true
  if (r.kind === 'object' || r.kind === 'component') return true
  return false
}

function parseContentArray(path: string, cms: unknown, componentUid: string): unknown[] {
  if (!Array.isArray(cms)) throw new MergeReject(`${path}: expected array`)
  const itemDesc = resolveComponentSchema(componentUid)
  return cms.map((item, i) => parseByDescriptor(`${path}[${i}]`, item, itemDesc))
}

function mergeBehaviorArray(
  path: string,
  fallback: unknown[],
  cms: unknown,
  stableKey: string,
  componentUid: string,
): unknown[] {
  if (!Array.isArray(cms)) throw new MergeReject(`${path}: expected array`)
  if (cms.length === 0) throw new MergeReject(`${path}: empty array not allowed for behavior-bound`)

  const itemDesc = resolveComponentSchema(componentUid)
  if (itemDesc.kind !== 'object') throw new MergeReject(`${path}: item schema must be object`)

  const fallbackKeys: string[] = []
  const fallbackByKey = new Map<string, Record<string, unknown>>()
  for (let i = 0; i < fallback.length; i++) {
    const item = fallback[i]
    if (!isPlainObject(item)) throw new MergeReject(`${path} fallback[${i}]: expected object`)
    const id = item[stableKey]
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new MergeReject(`${path} fallback[${i}]: invalid ${stableKey}`)
    }
    if (fallbackByKey.has(id)) throw new MergeReject(`${path}: duplicate fallback ${stableKey}=${id}`)
    fallbackKeys.push(id)
    fallbackByKey.set(id, item)
  }

  const cmsByKey = new Map<string, Record<string, unknown>>()
  for (let i = 0; i < cms.length; i++) {
    const item = cms[i]
    if (!isPlainObject(item)) throw new MergeReject(`${path}[${i}]: expected object`)
    const id = item[stableKey]
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new MergeReject(`${path}[${i}]: invalid ${stableKey}`)
    }
    if (cmsByKey.has(id)) throw new MergeReject(`${path}: duplicate ${stableKey}=${id}`)
    if (!fallbackByKey.has(id)) throw new MergeReject(`${path}: unknown ${stableKey}=${id}`)
    for (const key of Object.keys(item)) {
      if (!(key in itemDesc.fields)) {
        throw new MergeReject(`${path}[${i}].${key}: unknown key`)
      }
      parseByDescriptor(`${path}[${i}].${key}`, item[key], itemDesc.fields[key])
    }
    cmsByKey.set(id, item)
  }

  for (const id of fallbackKeys) {
    if (!cmsByKey.has(id)) throw new MergeReject(`${path}: missing ${stableKey}=${id}`)
  }

  return fallbackKeys.map((id) =>
    mergeObjectWithSchema(fallbackByKey.get(id)!, cmsByKey.get(id)!, itemDesc.fields, `${path}[${id}]`),
  )
}

/**
 * Merge CMS patch onto fallback twin using schema field map (no key-name media inference).
 */
function mergeObjectWithSchema(
  fallback: Record<string, unknown>,
  cms: Record<string, unknown>,
  fields: Record<string, FieldDesc>,
  path: string,
): Record<string, unknown> {
  for (const key of Object.keys(cms)) {
    if (!(key in fields)) {
      throw new MergeReject(`${path ? `${path}.` : ''}${key}: unknown key`)
    }
    // CMS may only patch keys that exist on fallback for page roots / behavior items
    if (!(key in fallback)) {
      throw new MergeReject(`${path ? `${path}.` : ''}${key}: unknown key`)
    }
  }

  const out: Record<string, unknown> = {}
  for (const key of Object.keys(fallback)) {
    const childPath = path ? `${path}.${key}` : key
    const fieldDesc = fields[key]
    if (!fieldDesc) {
      // Fallback has a key not in schema — coverage gate should catch; keep fallback copy
      out[key] = cloneUnknown(fallback[key])
      continue
    }
    if (!(key in cms)) {
      out[key] = cloneUnknown(fallback[key])
      continue
    }

    const resolved = resolveFieldDesc(fieldDesc)

    if (
      (key === 'document_key' ||
        key === 'value' ||
        key === 'slug' ||
        key === 'catalog_key' ||
        key === 'icon_key') &&
      typeof fallback[key] === 'string'
    ) {
      if (cms[key] !== fallback[key]) {
        throw new MergeReject(`${childPath}: stable key mismatch`)
      }
      out[key] = fallback[key]
      continue
    }

    if (resolved.kind === 'behaviorArray') {
      if (!Array.isArray(fallback[key])) throw new MergeReject(`${childPath}: fallback not array`)
      out[key] = mergeBehaviorArray(
        childPath,
        fallback[key] as unknown[],
        cms[key],
        resolved.key,
        resolved.component,
      )
      continue
    }
    if (resolved.kind === 'contentArray') {
      out[key] = parseContentArray(childPath, cms[key], resolved.component)
      continue
    }
    if (resolved.kind === 'object') {
      if (!isPlainObject(cms[key])) throw new MergeReject(`${childPath}: expected object`)
      if (!isPlainObject(fallback[key])) throw new MergeReject(`${childPath}: fallback not object`)
      out[key] = mergeObjectWithSchema(
        fallback[key] as Record<string, unknown>,
        cms[key] as Record<string, unknown>,
        resolved.fields,
        childPath,
      )
      continue
    }
    if (resolved.kind === 'component') {
      const comp = resolveComponentSchema(resolved.component)
      if (comp.kind !== 'object') throw new MergeReject(`${childPath}: bad component schema`)
      if (!isPlainObject(cms[key])) throw new MergeReject(`${childPath}: expected object`)
      if (!isPlainObject(fallback[key])) throw new MergeReject(`${childPath}: fallback not object`)
      out[key] = mergeObjectWithSchema(
        fallback[key] as Record<string, unknown>,
        cms[key] as Record<string, unknown>,
        comp.fields,
        childPath,
      )
      continue
    }

    out[key] = parseByDescriptor(childPath, cms[key], fieldDesc)
  }
  return out
}

/**
 * Atomic merge. On any violation returns ok:false and does not partially apply.
 * Legal pages: full-document replace after contract canonicalize (no partial body merge).
 */
export function mergePageContent<T extends Record<string, unknown>>(
  slug: PagesCmsSlug,
  fallback: T,
  data: unknown,
): MergeResult<T> {
  try {
    if (!isPlainObject(data)) {
      return { ok: false, reason: 'cms data must be a plain object' }
    }

    if (isLegalPagesCmsSlug(slug)) {
      void fallback
      try {
        const canonical = canonicalizeLegalPageData(data)
        if (!Array.isArray(canonical.body) || canonical.body.length === 0) {
          return { ok: false, reason: 'legal body must be non-empty' }
        }
        return { ok: true, value: cloneUnknown(canonical) as unknown as T }
      } catch (err) {
        if (err instanceof LegalContractError) {
          return { ok: false, reason: err.message }
        }
        return { ok: false, reason: err instanceof Error ? err.message : 'legal merge failed' }
      }
    }

    const root = getPageRootSchema(slug)
    if (root.kind !== 'object') {
      return { ok: false, reason: 'page root schema must be object' }
    }
    const value = mergeObjectWithSchema(fallback, data, root.fields, '') as T
    return { ok: true, value }
  } catch (err) {
    if (err instanceof MergeReject) return { ok: false, reason: err.reason }
    return { ok: false, reason: err instanceof Error ? err.message : 'merge failed' }
  }
}
