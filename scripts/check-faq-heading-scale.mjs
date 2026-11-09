#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const css = fs.readFileSync(path.join(root, 'src/styles/components.css'), 'utf8')
const required = [
  '.faq-section .section-title {\n  max-width: 639px;\n  font-size: 40px;',
  '@media (max-width: 1024px) {\n  .faq-section .section-title {\n    font-size: 32px;',
  '.faq-section .section-title {\n    max-width: 100%;\n    font-size: 28px;',
  '.faq-question h3 {\n  font-family: var(--font-bounded);\n  font-size: 24px;',
  '.faq-question h3 {\n    font-size: 20px;',
  '.faq-question h3 {\n    font-size: 18px;',
]

const missing = required.filter((entry) => !css.includes(entry))
if (missing.length) {
  console.error(`FAQ heading scale contract missing ${missing.length} declaration(s).`)
  process.exit(1)
}

console.log('FAQ heading scale contract ok: section 40/32/28px, questions 24/20/18px.')
