#!/usr/bin/env node
/**
 * Child for D2 signal regression: start isolated stack, wait for SIGTERM/SIGINT, dispose.
 */
import {
  startIsolatedPagesCmsStack,
  listListeners,
  FORBIDDEN_PORTS,
} from './pages-cms-isolated-stack.mjs'

const stack = await startIsolatedPagesCmsStack({
  withVite: false,
  seedFixtures: false,
  installSignalHandlers: true,
})

process.send?.({
  type: 'ready',
  ports: stack.ports,
  workDir: stack.workDir,
  pids: {
    strapi: stack.strapi?.pid,
    node: stack.node?.pid,
  },
  forbiddenListeners: listListeners([...FORBIDDEN_PORTS]),
})

// Stay alive until signal handlers dispose + exit.
setInterval(() => {}, 60_000)
