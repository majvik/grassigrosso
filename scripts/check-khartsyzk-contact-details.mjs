#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as esbuild from 'esbuild'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const forbiddenSpelling = '\u0425\u0430\u0440\u0446\u0438\u0437\u0441\u043a'
const grep = spawnSync('git', ['grep', '-n', '-I', '-i', '-e', forbiddenSpelling, '--', '.'], {
  cwd: root,
  encoding: 'utf8',
})

if (grep.error) throw grep.error
if (grep.status === 0) {
  console.error('Найдено устаревшее написание Харцызска:')
  console.error(grep.stdout.trim())
  process.exit(1)
}
if (grep.status !== 1) {
  console.error(grep.stderr.trim())
  process.exit(grep.status ?? 1)
}

const outfile = path.join(os.tmpdir(), `grassigrosso-contacts-${process.pid}.cjs`)

try {
  await esbuild.build({
    stdin: {
      contents: `
        import React from 'react'
        import { renderToStaticMarkup } from 'react-dom/server'
        import { ContactsPage } from '${path.join(root, 'src/components/pages/ContactsPage.tsx')}'
        export const markup = renderToStaticMarkup(React.createElement(ContactsPage))
      `,
      loader: 'tsx',
      resolveDir: root,
    },
    alias: { '@': path.join(root, 'src') },
    bundle: true,
    define: { 'import.meta.env': '{}' },
    platform: 'node',
    format: 'cjs',
    outfile,
    logLevel: 'silent',
  })

  const { markup } = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`)
  const dnrCard = markup.match(/<div class="contacts-office-card">(?:(?!<div class="contacts-office-card">)[\s\S])*?Харцызск[\s\S]*?<\/div><\/div><\/div>/)?.[0] || ''

  if (!dnrCard.includes('Харцызск')) {
    console.error('React-карточка представительства не содержит правильное название «Харцызск».')
    process.exit(1)
  }
  if (!/Пн-Пт: 8:00 - 17:00<br\/>Сб: 8:00 - 15:00/.test(dnrCard)) {
    console.error('React-карточка Харцызска не выводит субботний график отдельной строкой.')
    process.exit(1)
  }
} finally {
  fs.rmSync(outfile, { force: true })
}

console.log('Карточка Харцызска содержит правильное название и полный график работы.')
