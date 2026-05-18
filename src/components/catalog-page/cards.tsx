import { FavouriteFullIcon, FavouriteOutlineIcon } from '@/components/catalog-page/icons'
import { CATALOG_FALLBACK_CARDS, type CatalogFallbackCardData } from '@/components/pages/catalog-page-data'

const HEIGHT_RANGE_LABELS: Record<string, string> = {
  low: 'Компактные до 16 см',
  mid: 'Средние 16-22 см',
  high: 'Высокие от 23 см',
}

const LOAD_RANGE_LABELS: Record<string, string> = {
  upTo120: 'до 120 кг',
  upTo160: 'до 160 кг',
  upTo180: 'до 180 кг',
  over160: 'Без ограничений',
}

const FIRMNESS_LABELS: Record<string, string> = {
  soft: 'Мягкий',
  medium: 'Средний',
  hard: 'Жесткий',
  dualFirmness: 'Разная жесткость сторон',
}

const TYPE_LABELS: Record<string, string> = {
  spring: 'Пружинный',
  nospring: 'Беспружинный',
  topper: 'Топер',
  doubleSided: 'Двухсторонние',
  singleSided: 'Односторонние',
}

function CatalogFallbackCard({ card }: { card: CatalogFallbackCardData }) {
  const heightRangeLabel = HEIGHT_RANGE_LABELS[card.heightRange] || card.heightRange
  const heightLabel = heightRangeLabel ? `${card.height} см (${heightRangeLabel})` : card.metaHeightLabel
  const loadLabel = LOAD_RANGE_LABELS[card.loadRange] || card.metaLoadLabel
  const specs = [
    ['Высота', heightLabel],
    ['Нагрузка', loadLabel],
    ['Жесткость', FIRMNESS_LABELS[card.firmness] || card.firmness],
    ['Тип матраса', TYPE_LABELS[card.type] || card.type],
    ['Размер', card.sizes.replaceAll('x', ' × ').split(',').join(', ')],
  ].filter(([, value]) => value)

  return (
    <article
      className="catalogue-new-card"
      data-product-slug={card.slug}
      data-collection={card.collection}
      data-firmness={card.firmness}
      data-type={card.type}
      data-height={card.height}
      data-load={card.load}
      data-load-range={card.loadRange}
      data-height-range={card.heightRange}
      data-sizes={card.sizes}
    >
      <picture>
        <source type="image/avif" srcSet={card.image.sources.avif} />
        <source type="image/webp" srcSet={card.image.sources.webp} />
        <img src={card.image.src} alt={card.image.alt} />
      </picture>
      <div className="catalogue-new-card-body">
        <h3>{card.title}</h3>
        <p className="catalogue-new-meta">
          {specs.map(([label, value]) => (
            <span className="catalogue-new-meta-line" key={label}>
              {label}: <span className="catalogue-new-meta-value">{value}</span>
            </span>
          ))}
        </p>
        <div className="catalogue-new-tags-row">
          <div className="catalogue-new-tags">
            {card.tags.map((tag) => (
              <span className="catalogue-new-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          <button
            type="button"
            className="catalogue-new-favourite"
            data-product-slug={card.slug}
            aria-pressed="false"
            aria-label="Добавить в избранное"
          >
            <span className="catalogue-new-favourite-icon catalogue-new-favourite-icon--empty" aria-hidden="true">
              <FavouriteOutlineIcon />
            </span>
            <span className="catalogue-new-favourite-icon catalogue-new-favourite-icon--full" aria-hidden="true">
              <FavouriteFullIcon />
            </span>
          </button>
        </div>
      </div>
    </article>
  )
}

export function CatalogFallbackCardsGrid() {
  return (
    <div className="catalogue-new-cards">
      {CATALOG_FALLBACK_CARDS.map((card) => (
        <CatalogFallbackCard key={card.slug} card={card} />
      ))}
    </div>
  )
}
