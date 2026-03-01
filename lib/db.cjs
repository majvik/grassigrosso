'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'leads.db');

let _db = null;

function getDb() {
  if (_db) return _db;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('busy_timeout = 5000');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      phone           TEXT    NOT NULL,
      email           TEXT,
      city            TEXT,
      comment         TEXT,
      page            TEXT,
      status          TEXT    NOT NULL DEFAULT 'pending',
      delivery_channel TEXT,
      attempts        INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT    NOT NULL,
      delivered_at    TEXT,
      next_retry_at   INTEGER,
      last_error      TEXT
    )
  `);

  _db.exec(`
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status)
  `);
  _db.exec(`
    CREATE INDEX IF NOT EXISTS idx_leads_next_retry ON leads (status, next_retry_at)
  `);

  return _db;
}

function insertLead(lead) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO leads (name, phone, email, city, comment, page, status, created_at, next_retry_at)
    VALUES (@name, @phone, @email, @city, @comment, @page, 'pending', @created_at, @next_retry_at)
  `);
  const info = stmt.run({
    name: lead.name || '',
    phone: lead.phone || '',
    email: lead.email || null,
    city: lead.city || null,
    comment: lead.comment || null,
    page: lead.page || null,
    created_at: new Date().toISOString(),
    next_retry_at: Date.now(),
  });
  return info.lastInsertRowid;
}

function markDelivered(id, channel) {
  const db = getDb();
  db.prepare(`
    UPDATE leads
    SET status = 'delivered',
        delivery_channel = @channel,
        delivered_at = @delivered_at,
        next_retry_at = NULL
    WHERE id = @id
  `).run({
    id,
    channel,
    delivered_at: new Date().toISOString(),
  });
}

function updateRetrySchedule(id, attempts, nextRetryAt, lastError) {
  const db = getDb();
  db.prepare(`
    UPDATE leads
    SET attempts = @attempts,
        next_retry_at = @next_retry_at,
        last_error = @last_error
    WHERE id = @id AND status = 'pending'
  `).run({
    id,
    attempts,
    next_retry_at: nextRetryAt,
    last_error: lastError || null,
  });
}

function markFailed(id, lastError) {
  const db = getDb();
  db.prepare(`
    UPDATE leads
    SET status = 'failed',
        last_error = @last_error,
        next_retry_at = NULL
    WHERE id = @id
  `).run({
    id,
    last_error: lastError || null,
  });
}

function getPendingLeads(now) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM leads
    WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= @now)
    ORDER BY created_at ASC
  `).all({ now: now || Date.now() });
}

function getPendingCount() {
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) AS cnt FROM leads WHERE status = 'pending'`).get();
  return row.cnt;
}

function importFromQueue(queueItems) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO leads (name, phone, email, city, comment, page, status, attempts, created_at, next_retry_at, last_error)
    VALUES (@name, @phone, @email, @city, @comment, @page, 'pending', @attempts, @created_at, @next_retry_at, @last_error)
  `);

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      const lead = item.lead || {};
      stmt.run({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || null,
        city: lead.city || null,
        comment: lead.comment || null,
        page: lead.page || null,
        attempts: item.attempts || 0,
        created_at: item.createdAt || new Date().toISOString(),
        next_retry_at: item.nextAttemptAt || Date.now(),
        last_error: item.lastErrors ? JSON.stringify(item.lastErrors) : null,
      });
    }
  });

  insertMany(queueItems);
  return queueItems.length;
}

function closeDb() {
  if (_db) {
    _db.close();
    _db = null;
  }
}

module.exports = {
  getDb,
  insertLead,
  markDelivered,
  updateRetrySchedule,
  markFailed,
  getPendingLeads,
  getPendingCount,
  importFromQueue,
  closeDb,
  DB_PATH,
};
