'use strict';

/**
 * Canonicalize + validate legal page CMS → public feed `{ data }` shape (contract v2.1).
 * Schema may use discriminator fields (`link_label`); public JSON never exposes them.
 */

const {
  LEGAL_HREF_ALLOWLIST,
  LEGAL_BLOCK_TYPES,
  LEGAL_RUN_TYPES,
  COMPONENT_TO_BLOCK_TYPE,
} = require('./legal-allowlist');

const STRAPI_META_KEYS = new Set([
  'id',
  'documentId',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
  'locale',
  'localizations',
  'status',
  '__component',
]);

const ROOT_ALLOWED = new Set(['title', 'effective_date', 'body']);
const PARAGRAPH_RAW = new Set(['type', 'heading', 'runs']);
const LIST_RAW = new Set(['type', 'heading', 'items']);
const TABLE_RAW = new Set(['type', 'heading', 'headers', 'rows']);
const OPERATOR_RAW = new Set([
  'type',
  'heading',
  'role_label',
  'legal_name',
  'ogrn',
  'inn',
  'address',
  'email',
]);
const TEXT_RUN_RAW = new Set(['type', 'value', 'strong']);
const LINK_RUN_RAW = new Set(['type', 'href', 'children', 'link_label', 'strong']);
const LIST_ITEM_RAW = new Set(['runs']);
const TABLE_ROW_RAW = new Set(['cells']);
const TABLE_CELL_RAW = new Set(['runs']);

const PARAGRAPH_OUT = new Set(['type', 'heading', 'runs']);
const LIST_OUT = new Set(['type', 'heading', 'items']);
const TABLE_OUT = new Set(['type', 'heading', 'headers', 'rows']);
const OPERATOR_OUT = new Set([
  'type',
  'heading',
  'role_label',
  'legal_name',
  'ogrn',
  'inn',
  'address',
  'email',
]);
const TEXT_RUN_OUT = new Set(['type', 'value', 'strong']);
const LINK_RUN_OUT = new Set(['type', 'href', 'children']);

class LegalContractError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LegalContractError';
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function fail(path, message) {
  throw new LegalContractError(`${path}: ${message}`);
}

function assertNoForbiddenKeys(obj, allowed, path) {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) fail(path, `unknown field "${key}"`);
  }
}

function assertRawKeys(raw, allowed, path) {
  if (!isPlainObject(raw)) fail(path, 'must be object');
  for (const key of Object.keys(raw)) {
    if (STRAPI_META_KEYS.has(key)) fail(path, `forbidden meta field "${key}"`);
    if (!allowed.has(key)) fail(path, `unknown field "${key}"`);
  }
}

function assertNonEmptyString(value, path) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(path, 'non-empty string required');
  }
}

function normalizeHref(href) {
  return typeof href === 'string' ? href.trim() : href;
}

function canonicalizeTextRun(raw, path) {
  assertRawKeys(raw, TEXT_RUN_RAW, path);
  if (!('strong' in raw) || typeof raw.strong !== 'boolean') {
    fail(path, 'text.strong must be boolean');
  }
  assertNonEmptyString(raw.value, `${path}.value`);
  const out = { type: 'text', value: raw.value, strong: raw.strong };
  assertNoForbiddenKeys(out, TEXT_RUN_OUT, path);
  return out;
}

function canonicalizeLinkRun(raw, path) {
  assertRawKeys(raw, LINK_RUN_RAW, path);
  // Discriminator: value not allowed on link
  if ('value' in raw) fail(path, 'discriminator leakage: value not allowed on link run');
  if ('strong' in raw && raw.strong !== false && raw.strong != null) {
    fail(path, 'discriminator leakage: strong not allowed on link run');
  }

  const href = normalizeHref(raw.href);
  if (typeof href !== 'string' || !LEGAL_HREF_ALLOWLIST.includes(href)) {
    fail(path, `href not in exact allowlist: ${JSON.stringify(href)}`);
  }

  let children;
  if (Array.isArray(raw.children)) {
    if (raw.children.length === 0) fail(path, 'link.children must be non-empty');
    children = raw.children.map((c, i) => {
      if (!isPlainObject(c)) fail(`${path}.children[${i}]`, 'only text runs allowed');
      if (c.type === 'link') fail(`${path}.children[${i}]`, 'only text runs allowed');
      return canonicalizeTextRun({ ...c, type: 'text' }, `${path}.children[${i}]`);
    });
  } else if (typeof raw.link_label === 'string' && raw.link_label.trim()) {
    children = [
      canonicalizeTextRun(
        { type: 'text', value: raw.link_label, strong: false },
        `${path}.children[0]`,
      ),
    ];
  } else {
    fail(path, 'link.children must be non-empty array of text runs (or schema link_label)');
  }

  const out = { type: 'link', href, children };
  assertNoForbiddenKeys(out, LINK_RUN_OUT, path);
  return out;
}

function canonicalizeRun(raw, path) {
  if (!isPlainObject(raw)) fail(path, 'run must be object');
  for (const key of Object.keys(raw)) {
    if (STRAPI_META_KEYS.has(key)) fail(path, `forbidden meta field "${key}"`);
  }
  const type = raw.type;
  if (!LEGAL_RUN_TYPES.includes(type)) fail(path, `unknown run type "${type}"`);

  if (type === 'text') {
    if ('href' in raw && raw.href != null && raw.href !== '') {
      fail(path, 'discriminator leakage: href not allowed on text run');
    }
    if ('link_label' in raw && raw.link_label != null && raw.link_label !== '') {
      fail(path, 'discriminator leakage: link_label not allowed on text run');
    }
    if ('children' in raw && raw.children != null) {
      fail(path, 'discriminator leakage: children not allowed on text run');
    }
    const cleaned = { type: 'text', value: raw.value, strong: raw.strong };
    // reject any other non-empty leftovers
    for (const key of Object.keys(raw)) {
      if (['type', 'value', 'strong', 'href', 'link_label', 'children'].includes(key)) continue;
      fail(path, `unknown field "${key}"`);
    }
    return canonicalizeTextRun(cleaned, path);
  }

  // link
  if ('value' in raw && raw.value != null && raw.value !== '') {
    fail(path, 'discriminator leakage: value not allowed on link run');
  }
  const cleaned = {
    type: 'link',
    href: raw.href,
  };
  if (Array.isArray(raw.children)) cleaned.children = raw.children;
  if (typeof raw.link_label === 'string') cleaned.link_label = raw.link_label;
  if ('strong' in raw) cleaned.strong = raw.strong;
  for (const key of Object.keys(raw)) {
    if (['type', 'href', 'children', 'link_label', 'strong', 'value'].includes(key)) continue;
    fail(path, `unknown field "${key}"`);
  }
  return canonicalizeLinkRun(cleaned, path);
}

function canonicalizeRuns(runs, path) {
  if (!Array.isArray(runs) || runs.length === 0) fail(path, 'non-empty runs array required');
  return runs.map((r, i) => canonicalizeRun(r, `${path}[${i}]`));
}

function optionalHeading(raw, path) {
  if (raw == null || raw === '') return undefined;
  assertNonEmptyString(raw, path);
  return raw;
}

function canonicalizeParagraph(raw, path) {
  assertRawKeys(raw, PARAGRAPH_RAW, path);
  const out = { type: 'paragraph', runs: canonicalizeRuns(raw.runs, `${path}.runs`) };
  const heading = optionalHeading(raw.heading, `${path}.heading`);
  if (heading !== undefined) out.heading = heading;
  assertNoForbiddenKeys(out, PARAGRAPH_OUT, path);
  return out;
}

function canonicalizeList(raw, path) {
  assertRawKeys(raw, LIST_RAW, path);
  if (!Array.isArray(raw.items) || raw.items.length === 0) {
    fail(`${path}.items`, 'non-empty items array required');
  }
  const items = raw.items.map((item, i) => {
    assertRawKeys(item, LIST_ITEM_RAW, `${path}.items[${i}]`);
    return { runs: canonicalizeRuns(item.runs, `${path}.items[${i}].runs`) };
  });
  const out = { type: 'list', items };
  const heading = optionalHeading(raw.heading, `${path}.heading`);
  if (heading !== undefined) out.heading = heading;
  assertNoForbiddenKeys(out, LIST_OUT, path);
  return out;
}

function canonicalizeTable(raw, path) {
  assertRawKeys(raw, TABLE_RAW, path);
  if (!Array.isArray(raw.headers) || raw.headers.length === 0) {
    fail(`${path}.headers`, 'non-empty headers required');
  }
  const headers = raw.headers.map((h, i) => {
    if (typeof h === 'string') {
      assertNonEmptyString(h, `${path}.headers[${i}]`);
      return h;
    }
    if (isPlainObject(h) && typeof h.value === 'string') {
      for (const key of Object.keys(h)) {
        if (STRAPI_META_KEYS.has(key)) fail(`${path}.headers[${i}]`, `forbidden meta field "${key}"`);
        if (key !== 'value') fail(`${path}.headers[${i}]`, `unknown field "${key}"`);
      }
      assertNonEmptyString(h.value, `${path}.headers[${i}].value`);
      return h.value;
    }
    fail(`${path}.headers[${i}]`, 'header must be string or { value }');
  });
  if (new Set(headers).size !== headers.length) {
    fail(`${path}.headers`, 'headers must be unique within table');
  }

  if (!Array.isArray(raw.rows)) fail(`${path}.rows`, 'rows array required');
  const rows = raw.rows.map((row, ri) => {
    assertRawKeys(row, TABLE_ROW_RAW, `${path}.rows[${ri}]`);
    if (!Array.isArray(row.cells)) fail(`${path}.rows[${ri}].cells`, 'cells array required');
    if (row.cells.length !== headers.length) {
      fail(
        `${path}.rows[${ri}].cells`,
        `cells.length (${row.cells.length}) !== headers.length (${headers.length})`,
      );
    }
    const cells = row.cells.map((cell, ci) => {
      assertRawKeys(cell, TABLE_CELL_RAW, `${path}.rows[${ri}].cells[${ci}]`);
      if ('data-label' in cell || 'data_label' in cell) {
        fail(`${path}.rows[${ri}].cells[${ci}]`, 'data-label must not appear in CMS/feed');
      }
      return {
        runs: canonicalizeRuns(cell.runs, `${path}.rows[${ri}].cells[${ci}].runs`),
      };
    });
    return { cells };
  });

  const out = { type: 'table', headers, rows };
  const heading = optionalHeading(raw.heading, `${path}.heading`);
  if (heading !== undefined) out.heading = heading;
  assertNoForbiddenKeys(out, TABLE_OUT, path);
  return out;
}

function canonicalizeOperator(raw, path) {
  assertRawKeys(raw, OPERATOR_RAW, path);
  const fields = ['role_label', 'legal_name', 'ogrn', 'inn', 'address', 'email'];
  const out = { type: 'operator' };
  for (const field of fields) {
    assertNonEmptyString(raw[field], `${path}.${field}`);
    out[field] = raw[field];
  }
  const heading = optionalHeading(raw.heading, `${path}.heading`);
  if (heading !== undefined) out.heading = heading;
  assertNoForbiddenKeys(out, OPERATOR_OUT, path);
  return out;
}

function resolveBlockType(raw, path) {
  if (isPlainObject(raw) && typeof raw.type === 'string' && LEGAL_BLOCK_TYPES.includes(raw.type)) {
    return raw.type;
  }
  if (isPlainObject(raw) && typeof raw.__component === 'string') {
    const mapped = COMPONENT_TO_BLOCK_TYPE[raw.__component];
    if (mapped) return mapped;
    fail(path, `unknown block component "${raw.__component}"`);
  }
  fail(path, `unknown block type "${raw && raw.type}"`);
}

function canonicalizeBlock(raw, path) {
  if (!isPlainObject(raw)) fail(path, 'block must be object');
  if ('data-label' in raw || 'data_label' in raw) {
    fail(path, 'data-label must not appear in CMS/feed');
  }
  // Allow __component only before type mapping (serialize path maps type first)
  const type = resolveBlockType(raw, path);
  const withoutComponent = { ...raw };
  delete withoutComponent.__component;
  if (!withoutComponent.type) withoutComponent.type = type;

  if (type === 'paragraph') return canonicalizeParagraph(withoutComponent, path);
  if (type === 'list') return canonicalizeList(withoutComponent, path);
  if (type === 'table') return canonicalizeTable(withoutComponent, path);
  if (type === 'operator') return canonicalizeOperator(withoutComponent, path);
  fail(path, `unknown block type "${type}"`);
}

/**
 * @returns {{ title: string, effective_date: string, body: object[] }}
 */
function canonicalizeLegalPageData(entry) {
  if (!isPlainObject(entry)) fail('data', 'must be object');

  for (const key of Object.keys(entry)) {
    if (STRAPI_META_KEYS.has(key)) fail('data', `forbidden meta field "${key}"`);
    if (!ROOT_ALLOWED.has(key)) fail('data', `unknown root field "${key}"`);
  }

  assertNonEmptyString(entry.title, 'data.title');
  if (typeof entry.effective_date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(entry.effective_date)) {
    fail('data.effective_date', 'ISO date string required (YYYY-MM-DD)');
  }
  if (!Array.isArray(entry.body)) fail('data.body', 'ordered body array required');

  const body = entry.body.map((block, i) => canonicalizeBlock(block, `data.body[${i}]`));
  return {
    title: entry.title,
    effective_date: entry.effective_date.slice(0, 10),
    body,
  };
}

module.exports = {
  LegalContractError,
  canonicalizeLegalPageData,
  canonicalizeBlock,
  canonicalizeRun,
  LEGAL_HREF_ALLOWLIST,
};
