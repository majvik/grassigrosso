import { FavouriteFullIcon, FavouriteOutlineIcon } from '@/components/catalog-page/icons'
import { CATALOG_FALLBACK_CARDS, type CatalogFallbackCardData } from '@/components/pages/catalog-page-data'

function CatalogFallbackCard({ card }: { card: CatalogFallbackCardData }) {
  return (
    <article
      className="catalogue-new-card"
      data-product-slug={card.slug}
      data-collection={card.collection}
      data-firmness={card.firmness}
      data-type={card.type}
      data-height={card.height}
      data-load={card.load}
    >
      <picture>
        <source type="image/avif" srcSet={card.image.sources.avif} />
        <source type="image/webp" srcSet={card.image.sources.webp} />
        <img src={card.image.src} alt={card.image.alt} />
      </picture>
      <div className="catalogue-new-card-body">
        <h3>{card.title}</h3>
        <p className="catalogue-new-meta">
          <span className="catalogue-new-meta-line">
            Высота: <span className="catalogue-new-meta-value">{card.metaHeightLabel}</span>
          </span>
          <span className="catalogue-new-meta-line">
            Нагрузка: <span className="catalogue-new-meta-value">{card.metaLoadLabel}</span>
          </span>
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
