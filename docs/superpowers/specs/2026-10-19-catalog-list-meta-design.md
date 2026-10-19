# Catalog list-view meta: layers + price placement

## Problem

In list view, «Наполнение» rendered as one long numbered string, and the price sat under the title/description while tags stayed at the bottom of the card body.

## Hypotheses

1. Meta HTML always escaped `layersCatalog` into a single `.catalogue-new-meta-value`.
2. Tags used `margin-top: auto` alone, so price (sibling above tags) stayed next to the description.

## Root cause

Confirmed both: no layer parsing in `buildCatalogCardMetaHtmlFromDataset`; price not grouped with the tags row.

## Success criteria

- Numbered `layersCatalog` (`1. … 2. …`) becomes a `<ul class="catalogue-new-meta-layers">` of `<li>` items.
- Card body order: title → meta → footer(price + tags); footer has `margin-top: auto`.
- `npm run check:catalog-card-list-meta` and `npm run check:catalog-card-price` pass; `typecheck` green.
