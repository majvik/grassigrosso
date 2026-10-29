# Editorial Product Page Design

## Problem

The current product route (`/catalog?product=<slug>`) presents the gallery and product facts as a conventional two-column catalogue card. It is functional, but the composition does not communicate the premium, editorial character requested by the client.

## Approved direction

Use Pentagram's editorial principles—large imagery, asymmetric rhythm, restrained copy blocks, strong typography and generous whitespace—without copying its monochrome identity. Grassigrosso's green/cream palette, soft brand character and existing type system remain the visual source of truth.

## Product-page composition

1. The product gallery opens the page as the dominant full-width stage, before the product name. It uses a dedicated Product CMS field and the catalogue hero-slider interaction language rather than reusing the compact card carousel. It supports responsive/Retina image sources and does not introduce a second quick-view surface.
2. A compact editorial masthead follows the gallery and contains the oversized product name and existing tags.
   - tags sit on their own spaced row below the name;
   - favourite and icon-only share controls sit opposite the name;
   - the product-share help trigger is not rendered on this page.
3. Below the masthead, a deliberately asymmetric information grid separates:
   - always-visible primary characteristics and filling information, without tabs;
   - the segmented product characteristics;
   - the manager contact action;
   - favourite, share and share-help controls;
   - a reserved product-primary-action region that can later host “Добавить в корзину” only on the product page.
4. Secondary editorial media comes from a separate Product CMS field and forms a deterministic bento grid after the information band: one large tile spanning two rows, two smaller stacked tiles, and an optional wide tile below. It never duplicates the card or product-slider gallery implicitly.
5. Existing FAQ and manager-help sections remain below the product story.

## Visual rules

- Media is the primary visual element and spans the available product-page width.
- The desktop gallery uses a cinematic aspect ratio instead of a square card ratio.
- Text is limited to narrow readable measures inside a wider asymmetric grid.
- Large headings and whitespace create hierarchy; extra decorative sections are not invented.
- Existing Grassigrosso colors, typography and softly rounded image treatment remain.
- Controls remain visibly interactive and accessible; editorial styling must not hide essential product actions.

## Responsive behavior

- Desktop: oversized masthead, wide gallery, asymmetric two-column information band.
- Tablet: wide gallery and balanced two-column information where space permits.
- Mobile: single editorial flow, full-width media inside the mobile page gutter, readable controls and no horizontal overflow.
- Gallery swipe/dots, keyboard behavior and active-slide synchronization remain unchanged.

## Data and scope boundaries

- Keep `gallery` as the catalogue-card gallery.
- Add `detail_gallery` as the product-page slider source and `bento_gallery` as the editorial bento source. Both reuse the existing media component so Strapi editing remains familiar.
- When `detail_gallery` is empty, the current card gallery is a temporary compatibility fallback; an empty `bento_gallery` renders no bento wall.
- The public catalogue feed returns all three galleries and responsive source descriptors from Strapi upload formats.
- Do not add prices, cart behavior or commerce APIs in showcase mode.
- Preserve manager contact, favourite and share behavior. The share control is a fixed square/circle at every viewport.
- No quick-view modal may return.

## Product behavior additions

- Product pages resolve directly from the API product model, not from one of the currently rendered/paginated cards, so every active catalogue product has a page.
- The title remains editorial but uses a smaller responsive maximum so long product names fit without colliding with actions.
- Beneath “Основные характеристики”, render a firmness scale from `firmnessSide1/2`: ten segments and an `N/10` score. Equal/single-sided values render one unlabeled row; genuinely dual-sided values render “Сторона 1” and “Сторона 2”. The scale width equals the main-characteristics block, never the full page.
- The CTA row contains the manager action on the left and “Найти похожие” on the right. Similar products are derived from the current product’s construction type, firmness, height range and primary filling signals, then shown in the normal catalogue with those filters reflected in UI state.

## Success criteria

- At desktop width the gallery is wider than the information column and uses a non-square cinematic ratio.
- The gallery precedes the product title and is visually dominant.
- Primary characteristics and filling information are visible together without tab controls.
- Secondary product media appears in a deterministic bento grid, not a randomly offset masonry layout.
- Product information flows vertically at full width; specification groups and actions are not compressed into competing page columns.
- Characteristic rows use a bounded label track and a flexible wrapping value track so long values remain paired with their labels.
- Characteristics and actions form a separate editorial information band below the gallery.
- At mobile width the page becomes one column without overflow.
- Product route, gallery, contact, favourite, share and browser back navigation continue to work.
- Every active product opens even when it lies beyond the first paginated catalogue batch.
- Card, detail-slider and bento media remain independently editable in Strapi.
- Retina-capable browsers receive a useful `srcset` instead of upscaling only the low-resolution fallback.
- Automated catalogue/showcase UI checks, typecheck and build pass locally.
