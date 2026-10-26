import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const inputPath = resolve(process.env.COMMERCE_CATALOG_IMPORT || 'commerce-contracts/catalog-v1.local.json')
const result = spawnSync(
  'npm',
  ['run', 'catalog:import', '--prefix', 'medusa-commerce', '--', inputPath, 'dry-run'],
  { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
)
process.stdout.write(result.stdout || '')
process.stderr.write(result.stderr || '')
if (result.status !== 0) process.exitCode = result.status || 1
