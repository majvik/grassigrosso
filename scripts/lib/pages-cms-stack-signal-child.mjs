#!/usr/bin/env node
/**
 * Child for D2 signal regression: start isolated stack (Strapi+Node+Vite),
 * stay alive until SIGINT/SIGTERM handlers sync-teardown owned processes.
 */
import {
  startIsolatedPagesCmsStack,
  listListeners,
  FORBIDDEN_PORTS,
} from './pages-cms-isolated-stack.mjs'

const withVite = process.env.PAGES_CMS_SIGNAL_WITH_VITE !== '0'
const seedFixtures = process.env.PAGES_CMS_SIGNAL_SEED === '1'

const stack = await startIsolatedPagesCmsStack({
  withVite,
  seedFixtures,
  installSignalHandlers: true,
})

if (withVite && !stack.vite?.pid) {
  await stack.dispose()
  throw new Error('vite child missing after startIsolatedPagesCmsStack({ withVite: true })')
}

process.send?.({
  type: 'ready',
  ports: stack.ports,
  workDir: stack.workDir,
  pids: {
    strapi: stack.strapi?.pid ?? null,
    node: stack.node?.pid ?? null,
    vite: stack.vite?.pid ?? null,
  },
  forbiddenListeners: listListeners([...FORBIDDEN_PORTS]),
})

// Stay alive until signal handlers tear down + exit.
setInterval(() => {}, 60_000)
