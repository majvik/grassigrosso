'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DOCUMENT_ID = 'personal-data-consent';
const DOCUMENT_VERSION = '2026-09-14';
const TEXT_PATH = path.join(__dirname, 'consent-documents', 'personal-data-consent.md');
const text = fs.readFileSync(TEXT_PATH);
const sha256 = crypto.createHash('sha256').update(text).digest('hex');

function consentProof(formId, pagePath, acceptedAt, ipAddress, userAgent) {
  return {
    document_id: DOCUMENT_ID,
    document_version: DOCUMENT_VERSION,
    document_sha256: sha256,
    accepted_at: acceptedAt,
    form_id: String(formId || '').trim().slice(0, 80),
    page_path: String(pagePath || '').trim().slice(0, 300),
    ip_address: ipAddress || null,
    user_agent: userAgent || null,
  };
}

function consentRequestError(body) {
  if (!body || body.consentAccepted !== true) return 'consent-required';
  if (body.consentDocumentId !== DOCUMENT_ID) return 'consent-required';
  if (!String(body.formId || '').trim()) return 'consent-required';
  if (!String(body.pagePath || '').trim()) return 'consent-required';
  return null;
}

module.exports = {
  DOCUMENT_ID,
  DOCUMENT_VERSION,
  sha256,
  text,
  consentProof,
  consentRequestError,
};
