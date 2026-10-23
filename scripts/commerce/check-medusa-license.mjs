import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const DEFAULT_BASELINE = path.join(scriptRoot, 'docs/commerce/medusa-baseline.json')
const DEFAULT_SBOM = path.join(scriptRoot, 'docs/commerce/medusa-sbom.json')
const DEFAULT_DENYLIST = path.join(scriptRoot, 'scripts/commerce/enterprise-paths.json')
const ALLOWED_LICENSES = new Set(['MIT', 'MIT (root license)'])

const sha256 = (value) => createHash('sha256').update(value).digest('hex')

export async function loadBaseline(filePath) {
  const parsed = JSON.parse(await readFile(filePath, 'utf8'))
  if (parsed.format !== 'grassigrosso-medusa-baseline-v1') {
    throw new Error(`Unsupported Medusa baseline format: ${parsed.format ?? 'missing'}`)
  }
  if (!parsed.source?.tag || !parsed.source?.commit || !Array.isArray(parsed.packages)) {
    throw new Error('Medusa baseline is incomplete')
  }
  return parsed
}

async function walkFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (['.git', '.medusa', 'node_modules', 'dist', '.superpowers'].includes(entry.name)) continue
    const absolute = path.join(current, entry.name)
    if (entry.isDirectory()) files.push(...(await walkFiles(root, absolute)))
    else files.push(path.relative(root, absolute).split(path.sep).join('/'))
  }
  return files
}

function matchesDeniedPath(file, denied) {
  const normalized = denied.replace(/^package\//, '').replace(/\*+$/, '')
  return file === normalized.replace(/\/$/, '') || file.startsWith(normalized)
}

export async function scanPackageTree(root, options = {}) {
  const baseline = options.baseline ?? (await loadBaseline(DEFAULT_BASELINE))
  const sbom = options.sbom ?? JSON.parse(await readFile(DEFAULT_SBOM, 'utf8'))
  const denylist = options.denylist ?? JSON.parse(await readFile(DEFAULT_DENYLIST, 'utf8'))
  const files = await walkFiles(root)
  const projectFiles = files.filter((file) => !file.startsWith('docs/commerce/licenses/'))
  const enterpriseUsage = projectFiles.filter((file) =>
    denylist.paths.some((denied) => matchesDeniedPath(file, denied)),
  )
  const sourceExtensions = new Set(['.cjs', '.js', '.json', '.jsx', '.mjs', '.ts', '.tsx', '.yaml', '.yml'])
  const ignoredContentPrefixes = ['docs/', 'scripts/commerce/']
  const enterpriseActivations = []
  for (const file of projectFiles) {
    if (ignoredContentPrefixes.some((prefix) => file.startsWith(prefix))) continue
    if (file.includes('.test.') || path.basename(file) === 'package-lock.json') continue
    if (path.basename(file) === 'package.json') {
      const manifest = JSON.parse(await readFile(path.join(root, file), 'utf8'))
      const directDependencies = { ...manifest.dependencies, ...manifest.devDependencies, ...manifest.optionalDependencies }
      for (const packageName of denylist.forbiddenPackages ?? []) {
        if (packageName in directDependencies) {
          enterpriseActivations.push(`${file}: forbidden direct dependency ${packageName}`)
        }
      }
      continue
    }
    if (!sourceExtensions.has(path.extname(file)) && !path.basename(file).startsWith('.env')) continue
    const content = await readFile(path.join(root, file), 'utf8')
    for (const flag of denylist.forbiddenFeatureFlags ?? []) {
      if (content.includes(flag)) enterpriseActivations.push(`${file}: forbidden feature flag ${flag}`)
    }
    for (const packageName of denylist.forbiddenPackages ?? []) {
      if (content.includes(packageName)) enterpriseActivations.push(`${file}: forbidden package ${packageName}`)
    }
  }
  const unknownLicenses = sbom.packages
    .filter((pkg) => !ALLOWED_LICENSES.has(pkg.resolvedLicense))
    .map((pkg) => `${pkg.name}@${pkg.version}: ${pkg.resolvedLicense ?? 'missing'}`)

  const expectedPackagesHash = sha256(`${JSON.stringify(baseline.packages)}\n`)
  if (expectedPackagesHash !== baseline.packagesSha256) {
    throw new Error('Baseline package hash mismatch')
  }
  if (JSON.stringify(sbom.packages) !== JSON.stringify(baseline.packages)) {
    throw new Error('SBOM package inventory differs from baseline')
  }
  for (const license of baseline.licenseFiles) {
    const content = await readFile(path.join(root, license.localPath))
    if (sha256(content) !== license.sha256) {
      throw new Error(`License hash mismatch: ${license.localPath}`)
    }
  }

  return {
    source: baseline.source,
    tag: baseline.source.tag,
    commit: baseline.source.commit,
    packages: sbom.packages,
    licenseFiles: baseline.licenseFiles,
    upstreamEnterprisePaths: denylist.paths,
    enterpriseUsage,
    enterpriseActivations,
    unknownLicenses,
  }
}

export function assertNoEnterpriseMaterial(scan) {
  if (scan.unknownLicenses?.length) {
    throw new Error(`Unknown license findings: ${scan.unknownLicenses.join(', ')}`)
  }
  if (scan.enterpriseUsage?.length) {
    throw new Error(`Enterprise material is used by project-owned code: ${scan.enterpriseUsage.join(', ')}`)
  }
  if (scan.enterpriseActivations?.length) {
    throw new Error(`Enterprise activation/import detected: ${scan.enterpriseActivations.join(', ')}`)
  }
}

export async function writeSbom(scan, output) {
  const document = {
    format: 'grassigrosso-medusa-sbom-v1',
    source: scan.source,
    packages: scan.packages,
    licenseFiles: scan.licenseFiles,
  }
  await writeFile(output, `${JSON.stringify(document, null, 2)}\n`)
}

async function main() {
  const baseline = await loadBaseline(DEFAULT_BASELINE)
  const scan = await scanPackageTree(scriptRoot, { baseline })
  assertNoEnterpriseMaterial(scan)
  console.log(
    `Medusa license baseline PASS: ${scan.tag} ${scan.commit}; ${scan.packages.length} packages; 0 project Enterprise usages; 0 unknown licenses.`,
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Medusa license baseline FAIL: ${error.message}`)
    process.exitCode = 1
  })
}
