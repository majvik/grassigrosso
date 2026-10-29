import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const assetsDir = path.join(root, 'dist', 'assets')
const files = (await readdir(assetsDir)).filter((name) => name.endsWith('.js'))
const bundle = (await Promise.all(files.map((name) => readFile(path.join(assetsDir, name), 'utf8')))).join('\n')

for (const forbidden of [
  '/api/catalog/smart-select',
  'Расскажите, какой матрас вам нужен',
  'data-smart-selector-dialog',
  'Подобрать матрас',
]) {
  assert.equal(bundle.includes(forbidden), false, `showcase browser bundle contains disabled smart-selector code: ${forbidden}`)
}

console.log('✅ Showcase bundle contains no smart-selector implementation or endpoint')
