import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const html = await readFile(resolve(root, 'index.html'), 'utf8')

assert(!html.includes('id="welcomeModal"'), 'welcome modal must not be rendered')
assert(!html.includes('Наш бренд обновился'), 'welcome modal copy must not be rendered')

console.log('Welcome modal disabled contract: OK')
