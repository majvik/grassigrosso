import React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { ReactIslandRoot } from './components/app/ReactIslandRoot'

const roots = document.querySelectorAll<HTMLElement>('[data-react-root]')

roots.forEach((node) => {
  flushSync(() => {
    createRoot(node).render(
      <React.StrictMode>
        <ReactIslandRoot
          page={node.dataset.reactPage || document.body.dataset.page || document.documentElement.dataset.page || 'index'}
        />
      </React.StrictMode>
    )
  })
})
