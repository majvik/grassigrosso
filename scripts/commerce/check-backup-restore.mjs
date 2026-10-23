import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const composeArgs = ['compose', '-f', path.join(root, 'docker-compose.commerce.yml')]
const sourceDatabase = 'grassigrosso_commerce'
const restoredDatabase = 'grassigrosso_commerce_restore_smoke'

function dockerCompose(args, options = {}) {
  const result = spawnSync('docker', [...composeArgs, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    ...options,
  })
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `docker compose failed: ${args.join(' ')}`)
  }
  return result.stdout
}

export function checkBackupRestore() {
  dockerCompose([
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'medusa',
    '-d',
    sourceDatabase,
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    "CREATE TABLE IF NOT EXISTS commerce_backup_probe (id text PRIMARY KEY, value text NOT NULL); INSERT INTO commerce_backup_probe (id, value) VALUES ('task-2', 'survives') ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value;",
  ])

  const dump = dockerCompose([
    'exec',
    '-T',
    'postgres',
    'pg_dump',
    '-U',
    'medusa',
    '--no-owner',
    '--no-privileges',
    sourceDatabase,
  ])

  dockerCompose([
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'medusa',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `DROP DATABASE IF EXISTS ${restoredDatabase} WITH (FORCE);`,
  ])
  dockerCompose([
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'medusa',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `CREATE DATABASE ${restoredDatabase};`,
  ])
  dockerCompose(
    ['exec', '-T', 'postgres', 'psql', '-U', 'medusa', '-d', restoredDatabase, '-v', 'ON_ERROR_STOP=1'],
    { input: dump },
  )
  const restored = dockerCompose([
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'medusa',
    '-d',
    restoredDatabase,
    '-Atc',
    "SELECT value FROM commerce_backup_probe WHERE id = 'task-2';",
  ]).trim()
  if (restored !== 'survives') throw new Error(`Backup restore mismatch: ${restored || 'empty'}`)

  dockerCompose([
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'medusa',
    '-d',
    'postgres',
    '-v',
    'ON_ERROR_STOP=1',
    '-c',
    `DROP DATABASE ${restoredDatabase} WITH (FORCE);`,
  ])
  return restored
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    checkBackupRestore()
    console.log('Commerce backup/restore PASS: fixture survived a fresh local database restore.')
  } catch (error) {
    console.error(`Commerce backup/restore FAIL: ${error.message}`)
    process.exitCode = 1
  }
}
