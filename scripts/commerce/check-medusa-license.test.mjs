import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  assertNoEnterpriseMaterial,
  loadBaseline,
  scanPackageTree,
  writeSbom,
} from './check-medusa-license.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const baselinePath = path.join(root, 'docs/commerce/medusa-baseline.json')
const sbomPath = path.join(root, 'docs/commerce/medusa-sbom.json')
const denylistPath = path.join(root, 'scripts/commerce/enterprise-paths.json')

test('committed Medusa baseline is internally consistent and project usage is Core-only', async () => {
  const baseline = await loadBaseline(baselinePath)
  const sbom = JSON.parse(await readFile(sbomPath, 'utf8'))
  const denylist = JSON.parse(await readFile(denylistPath, 'utf8'))
  const scan = await scanPackageTree(root, { baseline, sbom, denylist })

  assert.equal(baseline.source.tag, 'v2.21.2')
  assert.equal(baseline.source.commit, '020565398e436a2bc65777a3b1ad347b4735d6df')
  assert.equal(baseline.runtime.node, '^20.19.0 || >=22.12.0')
  assert.equal(scan.unknownLicenses.length, 0)
  assert.equal(scan.enterpriseUsage.length, 0)
  assert.deepEqual(
    scan.packages.map(({ name, version }) => ({ name, version })),
    baseline.packages.map(({ name, version }) => ({ name, version })),
  )
  assert.doesNotThrow(() => assertNoEnterpriseMaterial(scan, denylist))
})

test('unknown licenses and project-owned Enterprise usage fail closed', () => {
  const denylist = { paths: ['packages/medusa/src/api/admin/rbac/'] }

  assert.throws(
    () => assertNoEnterpriseMaterial({ unknownLicenses: ['Proprietary-X'], enterpriseUsage: [] }, denylist),
    /unknown license/i,
  )
  assert.throws(
    () =>
      assertNoEnterpriseMaterial(
        {
          unknownLicenses: [],
          enterpriseUsage: ['packages/medusa/src/api/admin/rbac/roles/route.ts'],
        },
        denylist,
      ),
    /enterprise material/i,
  )
  assert.throws(
    () =>
      assertNoEnterpriseMaterial({
        unknownLicenses: [],
        enterpriseUsage: [],
        enterpriseActivations: ['MEDUSA_FF_RBAC=true'],
      }),
    /enterprise activation/i,
  )
})

test('source scan detects forbidden Enterprise flags and package imports', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'medusa-enterprise-usage-'))
  try {
    await writeFile(path.join(temp, 'app.js'), "import '@medusajs/rbac'\nconst flag = 'MEDUSA_FF_RBAC'\n")
    await writeFile(
      path.join(temp, 'package.json'),
      JSON.stringify({ dependencies: { '@medusajs/auth-oidc': '2.21.2' } }),
    )
    const packages = []
    const baseline = {
      source: { tag: 'v2.21.2', commit: 'abc' },
      packages,
      packagesSha256: '37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570',
      licenseFiles: [],
    }
    const scan = await scanPackageTree(temp, {
      baseline,
      sbom: { packages },
      denylist: {
        paths: [],
        forbiddenFeatureFlags: ['MEDUSA_FF_RBAC'],
        forbiddenPackages: ['@medusajs/rbac', '@medusajs/auth-oidc'],
      },
    })
    assert.deepEqual(scan.enterpriseActivations, [
      'app.js: forbidden feature flag MEDUSA_FF_RBAC',
      'app.js: forbidden package @medusajs/rbac',
      'package.json: forbidden direct dependency @medusajs/auth-oidc',
    ])
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})

test('writeSbom emits deterministic JSON', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'medusa-sbom-'))
  const output = path.join(temp, 'sbom.json')
  try {
    const scan = {
      source: { tag: 'v2.21.2', commit: 'abc' },
      packages: [{ name: '@medusajs/medusa', version: '2.21.2' }],
      licenseFiles: [{ path: 'LICENSE', sha256: 'def' }],
    }
    await writeSbom(scan, output)
    const first = await readFile(output, 'utf8')
    await writeFile(output, 'changed')
    await writeSbom(scan, output)
    assert.equal(await readFile(output, 'utf8'), first)
    assert.match(first, /"format": "grassigrosso-medusa-sbom-v1"/)
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})
