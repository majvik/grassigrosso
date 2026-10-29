# Catalogue product page only — design specification

## Decision

Product cards must never open a quick-view modal. A card opens the existing product view at `/catalog?product=<slug>`. That view is the single product-detail surface for both product modes.

## Preserved controls

The product view keeps the accepted modal capabilities: gallery, specification segments, tags, “Связаться с менеджером”, favourite toggle, “Скопировать ссылку”, and product-share help. In showcase, contact leads to the manager contact form. In commerce, this same page is the future owner of variant selection and add-to-cart; cards will not own cart actions.

## Removal boundary

- Remove quick-view initialization and its overlay markup.
- Remove the overlay relocation hook.
- Card clicks navigate to the existing shared product URL while favourite, gallery navigation, and removal controls retain their own behavior.
- Do not delete reusable gallery/spec/share/favourite modules used by the product page.
- Other purpose-specific modals (filter help, favourites confirmation, cookies) are outside scope.

## Success criteria

1. Clicking a card changes the URL to `/catalog?product=<slug>` and renders the product view.
2. The page exposes contact, favourite, share, share help, gallery, and specifications.
3. `#catalogueImageModal` is absent from the DOM and its controller is not initialized.
4. Showcase remains free of prices, store actions, and smart selector.
5. Automated UI, typecheck, and build checks pass locally.
