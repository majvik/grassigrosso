export function CatalogLoadingCardsGrid() {
  return (
    <div
      className="catalogue-new-cards catalogue-new-cards--loading"
      aria-busy="true"
      aria-label="Загрузка каталога"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div className="catalogue-new-card-skeleton" key={index} aria-hidden="true">
          <div className="catalogue-new-card-skeleton-media" />
          <div className="catalogue-new-card-skeleton-body">
            <div className="catalogue-new-card-skeleton-line catalogue-new-card-skeleton-line--title" />
            <div className="catalogue-new-card-skeleton-line" />
            <div className="catalogue-new-card-skeleton-line catalogue-new-card-skeleton-line--short" />
          </div>
        </div>
      ))}
    </div>
  )
}
