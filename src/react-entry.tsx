import React from 'react'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { ReactIslandRoot } from './components/app/ReactIslandRoot'

const roots = document.querySelectorAll<HTMLElement>('[data-react-root]')

roots.forEach((node) => {
  const fallbackHtml = node.innerHTML

  flushSync(() => {
    createRoot(node).render(
      <React.StrictMode>
        <ReactIslandRoot
          fallbackHtml={fallbackHtml}
          page={node.dataset.reactPage || document.body.dataset.page || document.documentElement.dataset.page || 'index'}
        />
      </React.StrictMode>
    )
  })
})
