/**
 * Resolve post-submit document download href.
 * CMS catalog_pdf (data-catalog-pdf) wins for docId=catalog when URL is a safe public path;
 * otherwise falls back to code-owned /api/download/:docId.
 */

/**
 * Allow same-origin relative asset/API paths only.
 * Rejects absolute external URLs, protocol-relative, and javascript:.
 */
export function isSafePublicDownloadUrl(url) {
  if (typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed) return false
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return false
  if (trimmed.startsWith('//')) return false
  if (!(trimmed.startsWith('/') && !trimmed.startsWith('//'))) return false
  return (
    trimmed.startsWith('/uploads/') ||
    trimmed.startsWith('/documents/') ||
    trimmed.startsWith('/api/download/') ||
    /\.pdf(\?|#|$)/i.test(trimmed)
  )
}

/**
 * Prefer hydrated CMS PDF on download-catalog forms; else code-owned /api/download/:id.
 */
export function resolveDocumentDownloadHref(docId, form) {
  if (!docId) return ''
  const cmsUrl = form?.getAttribute?.('data-catalog-pdf') || form?.dataset?.catalogPdf || ''
  if (String(docId) === 'catalog' && isSafePublicDownloadUrl(cmsUrl)) {
    return cmsUrl.trim()
  }
  return `/api/download/${encodeURIComponent(docId)}`
}
