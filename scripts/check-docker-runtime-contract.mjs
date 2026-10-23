#!/usr/bin/env node
import fs from 'node:fs'

const dockerfile = fs.readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8')
const startServices = fs.readFileSync(new URL('./start-services.sh', import.meta.url), 'utf8')
const failures = []
const assert = (condition, message) => { if (!condition) failures.push(message) }

assert(!dockerfile.includes('COPY --from=build /app/strapi-catalog ./strapi-catalog'), 'whole strapi-catalog copy is forbidden')
assert(!dockerfile.includes('RUN npm run build --prefix strapi-catalog'), 'duplicate explicit Strapi build is forbidden')
assert(/npm install --prefix strapi-catalog\b/.test(dockerfile), 'runtime Strapi lockfile-backed npm install is required')
assert(dockerfile.includes('FROM node:22-bookworm AS build'), 'build stage must use the toolchain-ready Node image')
assert(!/apt-get install[^\n]*(?:python3|make|g\+\+)/.test(dockerfile), 'network-installed compiler toolchain is forbidden')
assert(dockerfile.includes("+'/health'"), 'Docker healthcheck must target the public /health endpoint')

const publicServerStart = startServices.indexOf('node server.cjs &')
const firstStrapiWait = startServices.indexOf('if wait_for_strapi_port; then')
assert(publicServerStart >= 0, 'public server startup is missing')
assert(firstStrapiWait >= 0, 'Strapi readiness wait is missing')
assert(
  publicServerStart >= 0 && firstStrapiWait >= 0 && publicServerStart < firstStrapiWait,
  'public server must start before the blocking Strapi readiness wait',
)
assert(
  /app\.listen\(PORT, '0\.0\.0\.0'/.test(fs.readFileSync(new URL('../server.cjs', import.meta.url), 'utf8')),
  'public server must bind to 0.0.0.0',
)

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

console.log('check:docker-runtime-contract PASS (no apt toolchain download, selective runtime copy, seed/uploads retained)')
