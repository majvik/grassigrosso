import { GridViewIcon, ListViewIcon } from '@/components/catalog-page/icons'
import { CATALOG_SORT_OPTIONS } from '@/components/pages/catalog-page-data'

export function CatalogToolbar() {
  return (
    <div className="catalogue-new-toolbar">
      <span className="catalogue-new-results">
        Найдено: <strong>6</strong> моделей
      </span>
      <button type="button" className="catalogue-new-mobile-filters-open" id="catalogue-new-mobile-filters-open">
        Фильтры
      </button>
      <div className="catalogue-new-sort">
        <span className="catalogue-new-sort-sizer" aria-hidden="true">
          {CATALOG_SORT_OPTIONS.map((option) => (
            <span className="catalogue-new-sort-sizer-line" key={option.value}>
              {option.label}
            </span>
          ))}
        </span>
        <button type="button" className="catalogue-new-sort-trigger" aria-haspopup="listbox" aria-expanded="false">
          {CATALOG_SORT_OPTIONS[0].label}
        </button>
        <ul className="catalogue-new-sort-menu" role="listbox" hidden>
          {CATALOG_SORT_OPTIONS.map((option, index) => (
            <li key={option.value}>
              <button
                type="button"
                className={`catalogue-new-sort-option${index === 0 ? ' is-active' : ''}`}
                data-value={option.value}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="catalogue-new-view-toggle" aria-label="Режим отображения каталога">
        <button type="button" className="catalogue-new-view-btn" data-view="list" aria-label="Показать списком">
          <ListViewIcon />
        </button>
        <button
          type="button"
          className="catalogue-new-view-btn is-active"
          data-view="grid"
          aria-label="Показать таблицей"
          aria-pressed="true"
        >
          <GridViewIcon />
        </button>
      </div>
    </div>
  )
}

export function CatalogFavouritesBackRow() {
  return (
    <div className="catalogue-new-favourites-back-row" id="catalogue-new-favourites-back-row" hidden>
      <div className="catalogue-new-favourites-back-row-inner">
        <button type="button" className="catalogue-new-favourites-back" id="catalogue-new-favourites-back">
          <img src="/icons/arrow-back-left.svg" alt="" aria-hidden="true" />
          <span>Назад</span>
        </button>
        <button type="button" className="catalogue-new-favourites-clear-all" id="catalogue-new-favourites-clear-all">
          Очистить
        </button>
      </div>
    </div>
  )
}

export function CatalogFavouritesActions() {
  return (
    <div className="catalogue-new-favourites-actions" id="catalogue-new-favourites-actions" hidden>
      <button type="button" className="catalogue-new-manager-contact-btn" id="catalogue-new-favourites-contact" disabled>
        Связаться с менеджером по позициям
      </button>
      <button type="button" className="catalogue-new-share-btn" id="catalogue-new-favourites-share" aria-label="Поделиться избранным" disabled>
        <img className="catalogue-new-share-icon--default" src="/icons/share-default.svg" alt="" aria-hidden="true" />
        <img className="catalogue-new-share-icon--hover" src="/icons/share-hover.svg" alt="" aria-hidden="true" />
        <span className="catalogue-new-share-label">Поделиться</span>
      </button>
    </div>
  )
}
