#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contract = JSON.parse(fs.readFileSync(path.join(root, '.planning/phases/07-global-site-chrome/07-content-contract.json'), 'utf8'))
const failures = []
const count = (text, re) => [...text.matchAll(re)].length
for (const file of contract.files) {
  const html = fs.readFileSync(path.join(root, file), 'utf8')
  const must = [
    [/<nav class="nav-menu">[\s\S]*?<\/nav>/g, 1, 'desktop nav'],
    [/<nav class="mobile-nav">[\s\S]*?<\/nav>/g, 1, 'mobile nav'],
    [/class="btn-contact"/g, 1, 'desktop CTA'],
    [/class="mobile-menu-cta"/g, 1, 'mobile CTA'],
    [/class="footer-description"/g, 1, 'footer description'],
    [/class="footer-copyright footer-copyright-legal"/g, 1, 'footer legal'],
  ]
  for (const [re, expected, label] of must) if (count(html, re) !== expected) failures.push(`${file}: ${label}`)
  if (count(html.match(/<nav class="nav-menu">[\s\S]*?<\/nav>/)?.[0] || '', /<a /g) !== 5) failures.push(`${file}: desktop links != 5`)
  if (count(html.match(/<nav class="mobile-nav">[\s\S]*?<\/nav>/)?.[0] || '', /<a /g) !== 5) failures.push(`${file}: mobile links != 5`)
  if (!html.includes('href="/contacts#contact-form" class="btn-contact"') || !html.includes('href="/contacts#contact-form" class="mobile-menu-cta"')) failures.push(`${file}: canonical CTA`) 
  if (!html.includes('<li><a href="/catalog">Каталог матрасов</a></li>')) failures.push(`${file}: canonical footer catalog`)
}
const runtime = fs.readFileSync(path.join(root, 'src/site-chrome.ts'), 'utf8')
for (const marker of ['structuredClone(data)', "fetch('/api/site-chrome'", 'disk-snapshot', "exact<HTMLAnchorElement>('.nav-menu a', 5)", "exact<HTMLAnchorElement>('.mobile-nav a', 5)"]) if (!runtime.includes(marker)) failures.push(`runtime marker: ${marker}`)
if (runtime.includes('innerHTML') || runtime.includes('dangerouslySetInnerHTML')) failures.push('raw HTML runtime')
if (failures.length) { console.error(failures.join('\n')); process.exit(1) }
console.log(`check:pages-cms-phase-7d PASS (consumers=${contract.files.length} baselineSlots=ok atomicRuntime=ok rawHtml=0)`)
