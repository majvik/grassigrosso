import type { CatalogProduct } from '@/catalog/catalog-api'
import { getCatalogFirmnessRows } from '@/catalog/catalog-firmness-scale'

export function CatalogFirmnessScale({ side1, side2 }: {
  side1: CatalogProduct['firmnessSide1']
  side2: CatalogProduct['firmnessSide2']
}) {
  const rows = getCatalogFirmnessRows(side1, side2)
  if (!rows.length) return null

  return (
    <section className="catalogue-new-firmness-scale" data-product-firmness-scale>
      <h3 className="catalogue-new-firmness-title">Жесткость</h3>
      {rows.map(({ label, score }) => (
        <div key={label} className={`catalogue-new-firmness-row${label ? '' : ' is-single'}`}>
          {label && <span className="catalogue-new-firmness-label">{label}</span>}
          <div className="catalogue-new-firmness-track" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => (
              <span key={index} className={`catalogue-new-firmness-segment${index < score ? ' is-filled' : ''}`} />
            ))}
          </div>
          <span className="catalogue-new-firmness-score">{score}/10</span>
        </div>
      ))}
    </section>
  )
}
