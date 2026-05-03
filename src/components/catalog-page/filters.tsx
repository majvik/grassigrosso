import { HelpIcon } from '@/components/catalog-page/icons'
import { CATALOG_FILTER_GROUPS, type CatalogFilterGroupData } from '@/components/pages/catalog-page-data'

function CatalogFilterGroup({ group }: { group: CatalogFilterGroupData }) {
  const triggerLabel = group.kind === 'select' ? group.defaultLabel : group.options[0]?.label ?? group.defaultLabel

  return (
    <div className="catalogue-new-filter-group" data-filter-group={group.filterGroup}>
      <button type="button" className="catalogue-new-filter-accordion-trigger" aria-expanded={group.expanded}>
        <h3>{group.title}</h3>
        <span className="catalogue-new-tag catalogue-new-filter-selection-count" hidden aria-hidden="true" />
      </button>
      <div className="catalogue-new-filter-accordion-panel" hidden={!group.expanded}>
        <div className="catalogue-new-filter-help-row">
          <button
            type="button"
            className="catalogue-new-filter-help-trigger"
            data-filter-help-open={group.helpOpen}
            aria-haspopup="dialog"
            aria-label={group.helpRowAriaLabel}
          >
            <span className="catalogue-new-filter-help-icon" aria-hidden="true">
              <HelpIcon />
            </span>
            <span className="catalogue-new-filter-help-label">{group.helpLabel}</span>
          </button>
        </div>

        {group.kind === 'chip' ? (
          <div className="catalogue-new-filter-list">
            {group.options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                className={`catalogue-new-chip${index === 0 ? ' is-active' : ''}`}
                data-filter-group={group.filterGroup}
                data-value={option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="catalogue-new-filter-field">
            {group.headLabel ? (
              <div className="catalogue-new-filter-field-head">
                <label>{group.headLabel}</label>
                {group.action && group.actionLabel ? (
                  <a href="#" className="catalogue-new-size-help-link" data-action={group.action}>
                    {group.actionLabel}
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="catalogue-new-size-select" data-catalog-select={group.filterGroup}>
              <button type="button" className="catalogue-new-size-select-trigger" aria-haspopup="listbox" aria-expanded="false">
                {triggerLabel}
              </button>
              <ul className="catalogue-new-size-select-menu" role="listbox" hidden>
                {group.searchPlaceholder ? (
                  <li className="catalogue-new-size-select-search-row">
                    <input
                      type="text"
                      className="catalogue-new-size-select-search"
                      placeholder={group.searchPlaceholder}
                      autoComplete="off"
                      spellCheck="false"
                      aria-label={group.searchValueLabel}
                    />
                  </li>
                ) : null}

                <li className="catalogue-new-size-select-all-row">
                  <div className="catalogue-new-size-select-all-row-inner">
                    <button type="button" className="catalogue-new-size-select-option is-active" data-value="all">
                      {group.defaultLabel}
                    </button>
                    {group.resetAction && group.resetLabel ? (
                      <button type="button" className="catalogue-new-size-reset-mark" data-action={group.resetAction}>
                        {group.resetLabel}
                      </button>
                    ) : null}
                  </div>
                </li>

                {group.options.map((option) => (
                  <li key={option.value}>
                    <button type="button" className="catalogue-new-size-select-option" data-value={option.value}>
                      {option.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {group.resetAction && group.resetLabel ? (
              <div className="catalogue-new-size-select-under" hidden aria-hidden="true">
                <button type="button" className="catalogue-new-size-reset-mark" data-action={group.resetAction}>
                  {group.resetLabel}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

export function CatalogSidebarFilters() {
  return (
    <aside className="catalogue-new-sidebar" id="catalogue-new-sidebar">
      <div className="catalogue-new-sidebar-head">
        <h2 className="catalogue-new-sidebar-title">Фильтры</h2>
        <button type="button" className="catalogue-new-mobile-filters-close" id="catalogue-new-mobile-filters-close" aria-label="Закрыть фильтры">
          ×
        </button>
        <button type="button" className="catalogue-new-reset">
          Сбросить
        </button>
      </div>

      <div className="catalogue-new-favourites-only-row">
        <div className="catalogue-new-favourites-only-text">
          <span className="catalogue-new-favourites-only-label" id="catalogue-new-favourites-only-label">
            Показывать только{' '}
            <a href="#catalogue-new-products" className="catalogue-new-favourites-link" id="catalogue-new-favourites-link">
              избранное
            </a>
          </span>
          <span className="catalogue-new-tag catalogue-new-favourites-only-count" id="catalogue-new-favourites-count" hidden>
            0
          </span>
        </div>
        <button
          type="button"
          className="catalogue-new-switch"
          id="catalogue-new-favourites-only-switch"
          role="switch"
          aria-checked="false"
          disabled
          aria-labelledby="catalogue-new-favourites-only-label"
        >
          <span className="catalogue-new-switch-thumb" aria-hidden="true" />
        </button>
      </div>

      {CATALOG_FILTER_GROUPS.map((group) => (
        <CatalogFilterGroup key={group.filterGroup} group={group} />
      ))}
    </aside>
  )
}
