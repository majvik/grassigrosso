function normalizeScore(value: unknown): number | null {
  const score = Number(value)
  return Number.isInteger(score) && score >= 1 && score <= 10 ? score : null
}

function buildSegments(score: number): string {
  return Array.from({ length: 10 }, (_, index) =>
    `<span class="catalogue-new-firmness-segment${index < score ? ' is-filled' : ''}" aria-hidden="true"></span>`,
  ).join('')
}

function buildRow(score: number, label = ''): string {
  const labelHtml = label
    ? `<span class="catalogue-new-firmness-label">${label}</span>`
    : '<span class="catalogue-new-firmness-label" aria-hidden="true"></span>'
  return (
    `<div class="catalogue-new-firmness-row${label ? '' : ' is-single'}">` +
    labelHtml +
    `<span class="catalogue-new-firmness-track">${buildSegments(score)}</span>` +
    `<span class="catalogue-new-firmness-score">${score}/10</span>` +
    `</div>`
  )
}

export function buildCatalogFirmnessScaleHtml(side1Value: unknown, side2Value: unknown): string {
  const side1 = normalizeScore(side1Value)
  const side2 = normalizeScore(side2Value)
  const fallback = side1 ?? side2
  if (fallback === null) return ''
  const rows = side1 !== null && side2 !== null && side1 !== side2
    ? buildRow(side1, 'Сторона 1') + buildRow(side2, 'Сторона 2')
    : buildRow(fallback)
  return (
    `<section class="catalogue-new-firmness-scale" data-product-firmness-scale>` +
    `<h3 class="catalogue-new-firmness-title">Жесткость</h3>` +
    rows +
    `</section>`
  )
}
