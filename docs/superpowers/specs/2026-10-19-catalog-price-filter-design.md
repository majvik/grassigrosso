# Catalog sidebar: price from–to + range

## Problem

В сайдбаре `/catalog` нет фильтра по цене. Нужен блок «Цена» с полями от/до и dual-range; границы — реальные min/max `price_rub` из админки (feed товаров).

## Decisions

1. Bounds считаются на клиенте из загруженного catalog products feed (`priceRub > 0`).
2. Пока selection = полные bounds — фильтр неактивен (товары без цены тоже видны).
3. При сужении диапазона товары без цены скрываются.
4. Блок — аккордеон перед «Коллекция», без help-row.
5. Сброс фильтров и badge аккордеона учитывают активный price-range.

## Success criteria

- В инпутах и на range видны реальные min/max из feed.
- Изменение от/до или thumbs фильтрует листинг.
- `npm run check:catalog-price-filter` + `typecheck` зелёные.
