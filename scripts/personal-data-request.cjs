#!/usr/bin/env node
'use strict';

const fs = require('fs');
const db = require('../lib/db.cjs');

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : '';
}

const command = process.argv[2];
const email = arg('--email');
const phone = arg('--phone');
const leadId = arg('--lead-id');
const out = arg('--out');

function locate() {
  return db.findLeads({
    email: email || undefined,
    phone: phone || undefined,
    leadId: leadId ? Number(leadId) : undefined,
  });
}

function summarize(leads) {
  return {
    count: leads.length,
    leadIds: leads.map((lead) => lead.id),
  };
}

if (command === 'find') {
  const leads = locate();
  console.log(JSON.stringify({ action: 'find', ...summarize(leads) }));
} else if (command === 'export') {
  const leads = locate();
  const payload = leads.map((lead) => ({
    lead,
    consents: db.consentsForLead(lead.id),
  }));
  if (!out) {
    console.error('export requires --out');
    process.exit(1);
  }
  fs.writeFileSync(out, JSON.stringify(payload, null, 2));
  console.log(JSON.stringify({ action: 'export', ...summarize(leads), out }));
} else if (command === 'delete') {
  const leads = locate();
  let consents = 0;
  for (const lead of leads) {
    consents += db.deleteLeadBundle(lead.id).consents;
  }
  console.log(JSON.stringify({ action: 'delete', leads: leads.length, consents }));
} else if (command === 'purge') {
  const apply = process.argv.includes('--apply');
  const days = Number(process.env.LEAD_RETENTION_DAYS || 1095);
  const result = db.purgeExpiredLeads({ apply, retentionDays: days });
  console.log(JSON.stringify({ action: apply ? 'purge-apply' : 'purge-dry-run', ...result }));
} else {
  console.error('usage: personal-data-request.cjs find|export|delete|purge [--email --phone --lead-id --out --apply]');
  process.exit(1);
}

db.closeDb();
