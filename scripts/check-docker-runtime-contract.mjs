#!/usr/bin/env node
import fs from 'node:fs'

const dockerfile = fs.readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8')
const failures = []
const assert = (condition, message) => { if (!condition) failures.push(message) }

assert(!dockerfile.includes('COPY --from=build /app/strapi-catalog ./strapi-catalog'), 'whole strapi-catalog copy is forbidden')
assert(!dockerfile.includes('RUN npm run build --prefix strapi-catalog'), 'duplicate explicit Strapi build is forbidden')
assert(/npm install --prefix strapi-catalog\b/.test(dockerfile), 'runtime Strapi lockfile-backed npm install is required')

for (const required of ['dist', 'src', 'config', 'scripts', 'types', 'public', 'database']) {
  assert(
    dockerfile.includes(`/app/strapi-catalog/${required} ./strapi-catalog/${required}`),
    `runtime copy missing strapi-catalog/${required}`,
  )
}

assert(dockerfile.includes('/app/strapi-catalog/package.json'), 'runtime Strapi package.json copy missing')
assert(dockerfile.includes('/app/strapi-catalog/package-lock.json'), 'runtime Strapi lockfile copy missing')

// Negative regressions prove the gate catches the two timeout causes.
const negativeWholeCopy = `${dockerfile}\nCOPY --from=build /app/strapi-catalog ./strapi-catalog\n`
assert(negativeWholeCopy.includes('COPY --from=build /app/strapi-catalog ./strapi-catalog'), 'whole-copy negative probe broken')
const negativeDuplicateBuild = `${dockerfile}\nRUN npm run build --prefix strapi-catalog\n`
assert(negativeDuplicateBuild.includes('RUN npm run build --prefix strapi-catalog'), 'duplicate-build negative probe broken')

if (failures.length) {
  console.error('check:docker-runtime-contract FAILED')
  for (const failure of failures) console.error(` - ${failure}`)
  process.exit(1)
}

console.log('check:docker-runtime-contract PASS (single Strapi build, selective runtime copy, seed/uploads retained)')
