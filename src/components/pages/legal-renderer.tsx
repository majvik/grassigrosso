import { Fragment, type ReactNode } from 'react'
import type {
  LegalBlock,
  LegalOperatorBlock,
  LegalPageData,
  LegalRun,
  LegalTableBlock,
} from '@/pages/legal-types'
import { LEGAL_HREF_ALLOWLIST } from '@/pages/legal-page-contract'

function renderRuns(runs: LegalRun[]): ReactNode[] {
  return runs.map((run, index) => {
    if (run.type === 'text') {
      return run.strong ? <strong key={index}>{run.value}</strong> : <Fragment key={index}>{run.value}</Fragment>
    }
    if (!LEGAL_HREF_ALLOWLIST.includes(run.href)) {
      throw new Error(`legal renderer: href not allowlisted: ${run.href}`)
    }
    return (
      <a key={index} href={run.href}>
        {renderRuns(run.children)}
      </a>
    )
  })
}

function renderOperator(block: LegalOperatorBlock): ReactNode {
  const mailto = `mailto:${block.email}`
  if (!LEGAL_HREF_ALLOWLIST.includes(mailto)) {
    throw new Error(`legal renderer: operator email not allowlisted: ${block.email}`)
  }
  // Match SSR generator prose (deterministic, no extra email label).
  return (
    <p>
      {block.role_label}: {block.legal_name}, ОГРН {block.ogrn}, ИНН {block.inn}, адрес: {block.address},{' '}
      <a href={mailto}>{block.email}</a>
    </p>
  )
}

function renderTable(block: LegalTableBlock): ReactNode {
  return (
    <div className="legal-table-wrap">
      <table className="legal-table">
        <thead>
          <tr>
            {block.headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri}>
              {row.cells.map((cell, ci) => (
                <td key={ci} data-label={block.headers[ci]}>
                  {renderRuns(cell.runs)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function renderBlock(block: LegalBlock, index: number): ReactNode {
  const heading = block.heading ? <h2 key={`h-${index}`}>{block.heading}</h2> : null

  switch (block.type) {
    case 'paragraph':
      return (
        <Fragment key={index}>
          {heading}
          <p>{renderRuns(block.runs)}</p>
        </Fragment>
      )
    case 'list':
      return (
        <Fragment key={index}>
          {heading}
          <ul>
            {block.items.map((item, i) => (
              <li key={i}>{renderRuns(item.runs)}</li>
            ))}
          </ul>
        </Fragment>
      )
    case 'table':
      return (
        <Fragment key={index}>
          {heading}
          {renderTable(block)}
        </Fragment>
      )
    case 'operator':
      return (
        <Fragment key={index}>
          {heading}
          {renderOperator(block)}
        </Fragment>
      )
    default: {
      const _exhaustive: never = block
      throw new Error(`legal renderer: unknown block ${JSON.stringify(_exhaustive)}`)
    }
  }
}

/** Render structured legal CMS body into existing `.legal-*` slots (no raw HTML). */
export function renderLegalPageBody(data: LegalPageData): ReactNode {
  return data.body.map((block, index) => renderBlock(block, index))
}
