#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const uploadsDir = path.join(root, 'strapi-catalog/public/uploads')
const { canonicalPagesCmsFilename } = require('../strapi-catalog/src/api/pages-cms/utils/canonical-media-url.js')

const requested = process.argv.slice(2)
const targets = requested.length
  ? requested.map((item) => path.resolve(root, item))
  : [
      path.join(root, 'strapi-catalog/.tmp/data.db'),
      path.join(root, 'strapi-catalog/database/seed/data.db'),
    ]

for (const dbPath of targets) {
  if (!fs.existsSync(dbPath)) throw new Error(`Database not found: ${path.relative(root, dbPath)}`)
  const db = new Database(dbPath)
  try {
    const rows = db.prepare("select id, name, url, formats from files where name like 'pages-cms__%'").all()
    const update = db.prepare('update files set url = ?, formats = null where id = ?')
    const relationCount = db.prepare('select count(*) as count from files_related_mph where file_id = ?')
    const deleteFile = db.prepare('delete from files where id = ?')
    const repair = db.transaction(() => {
      let changed = 0
      for (const row of rows) {
        const filename = canonicalPagesCmsFilename(row.name)
        const filepath = path.join(uploadsDir, filename)
        if (!fs.existsSync(filepath)) {
          const currentFile = path.join(uploadsDir, path.posix.basename(row.url))
          if (!fs.existsSync(currentFile) || !fs.statSync(currentFile).isFile() || fs.statSync(currentFile).size === 0) {
            if (relationCount.get(row.id).count === 0) {
              deleteFile.run(row.id)
              changed += 1
              continue
            }
            throw new Error(`Referenced upload has neither canonical nor current file for row ${row.id}: ${filename}`)
          }
          fs.copyFileSync(currentFile, filepath)
        }
        if (!fs.statSync(filepath).isFile() || fs.statSync(filepath).size === 0) {
          throw new Error(`Canonical upload is empty for row ${row.id}: ${filename}`)
        }
        const url = `/uploads/${filename}`
        if (row.url !== url || row.formats !== null) {
          update.run(url, row.id)
          changed += 1
        }
      }
      return changed
    })
    const changed = repair()
    console.log(`repair-pages-cms-upload-records ${path.relative(root, dbPath)} rows=${rows.length} changed=${changed}`)
  } finally {
    db.close()
  }

  if (dbPath === path.join(root, 'strapi-catalog/database/seed/data.db')) {
    const buffer = fs.readFileSync(dbPath)
    const manifestPath = path.join(root, 'strapi-catalog/database/seed/seed-manifest.json')
    const manifest = {
      sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
      bytes: buffer.length,
      syncedAt: new Date().toISOString(),
    }
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  }
}
