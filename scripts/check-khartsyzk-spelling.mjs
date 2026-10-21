import { spawnSync } from 'node:child_process'

const forbiddenSpelling = '\u0425\u0430\u0440\u0446\u0438\u0437\u0441\u043a'
const expectedSpelling = '\u0425\u0430\u0440\u0446\u044b\u0437\u0441\u043a'
const result = spawnSync(
  'git',
  ['grep', '-n', '-I', '-i', '-e', forbiddenSpelling, '--', '.'],
  { encoding: 'utf8' }
)

if (result.error) {
  throw result.error
}

if (result.status === 0) {
  console.error(`Найдено ошибочное написание города; используйте «${expectedSpelling}»:`)
  console.error(result.stdout.trim())
  process.exit(1)
}

if (result.status !== 1) {
  console.error(result.stderr.trim())
  process.exit(result.status ?? 1)
}

console.log(`Проверка написания «${expectedSpelling}» пройдена.`)
