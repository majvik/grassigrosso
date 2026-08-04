import type { Schema, Struct } from '@strapi/strapi';

export interface CatalogFilterHelpSegment extends Struct.ComponentSchema {
  collectionName: 'components_catalog_filter_help_segments';
  info: {
    displayName: '\u0421\u0435\u0433\u043C\u0435\u043D\u0442 \u043F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0438 \u0444\u0438\u043B\u044C\u0442\u0440\u0430';
    icon: 'file';
  };
  attributes: {
    body: Schema.Attribute.Text;
    list_index: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    photo: Schema.Attribute.Media<'images'>;
    variant: Schema.Attribute.Enumeration<
      ['intro', 'heading', 'paragraph', 'listItem', 'numberedListItem']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'paragraph'>;
  };
}

export interface CatalogFilterHelpSummaryItem extends Struct.ComponentSchema {
  collectionName: 'components_catalog_filter_help_summary_items';
  info: {
    displayName: '\u041F\u0443\u043D\u043A\u0442 \u00AB\u0415\u0441\u043B\u0438 \u043A\u043E\u0440\u043E\u0442\u043A\u043E\u00BB';
    icon: 'bulletList';
  };
  attributes: {
    highlight: Schema.Attribute.String & Schema.Attribute.Required;
    lead: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface CatalogHeroSlide extends Struct.ComponentSchema {
  collectionName: 'components_catalog_hero_slides';
  info: {
    displayName: '\u0421\u043B\u0430\u0439\u0434 hero \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430';
    icon: 'landscape';
  };
  attributes: {
    alt_text: Schema.Attribute.String;
    poster: Schema.Attribute.Media<'images'>;
    slide_image: Schema.Attribute.Media<'images'>;
    slide_video: Schema.Attribute.Media<'videos' | 'files'>;
  };
}

export interface CatalogProductGalleryItem extends Struct.ComponentSchema {
  collectionName: 'components_catalog_product_gallery_items';
  info: {
    displayName: '\u042D\u043B\u0435\u043C\u0435\u043D\u0442 \u0433\u0430\u043B\u0435\u0440\u0435\u0438 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430';
    icon: 'picture';
  };
  attributes: {
    alt_text: Schema.Attribute.String;
    poster: Schema.Attribute.Media<'images'>;
    slide_image: Schema.Attribute.Media<'images'>;
    slide_video: Schema.Attribute.Media<'videos' | 'files'>;
  };
}

export interface LegalInlineRun extends Struct.ComponentSchema {
  collectionName: 'components_legal_inline_runs';
  info: {
    description: '\u0414\u0438\u0441\u043A\u0440\u0438\u043C\u0438\u043D\u0430\u0442\u043E\u0440 text|link; \u043F\u0443\u0431\u043B\u0438\u0447\u043D\u044B\u0439 feed \u043F\u0440\u0438\u0432\u043E\u0434\u0438\u0442 link_label \u2192 children[]';
    displayName: '\u0418\u043D\u043B\u0430\u0439\u043D-\u0444\u0440\u0430\u0433\u043C\u0435\u043D\u0442';
    icon: 'quote';
  };
  attributes: {
    href: Schema.Attribute.String;
    link_label: Schema.Attribute.String;
    strong: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    type: Schema.Attribute.Enumeration<['text', 'link']> &
      Schema.Attribute.Required;
    value: Schema.Attribute.Text;
  };
}

export interface LegalListBlock extends Struct.ComponentSchema {
  collectionName: 'components_legal_list_blocks';
  info: {
    displayName: '\u0421\u043F\u0438\u0441\u043E\u043A';
    icon: 'bulletList';
  };
  attributes: {
    heading: Schema.Attribute.String;
    items: Schema.Attribute.Component<'legal.list-item', true> &
      Schema.Attribute.Required;
  };
}

export interface LegalListItem extends Struct.ComponentSchema {
  collectionName: 'components_legal_list_items';
  info: {
    displayName: '\u041F\u0443\u043D\u043A\u0442 \u0441\u043F\u0438\u0441\u043A\u0430';
    icon: 'bulletList';
  };
  attributes: {
    runs: Schema.Attribute.Component<'legal.inline-run', true> &
      Schema.Attribute.Required;
  };
}

export interface LegalOperatorBlock extends Struct.ComponentSchema {
  collectionName: 'components_legal_operator_blocks';
  info: {
    displayName: '\u041E\u043F\u0435\u0440\u0430\u0442\u043E\u0440';
    icon: 'user';
  };
  attributes: {
    address: Schema.Attribute.Text & Schema.Attribute.Required;
    email: Schema.Attribute.Email & Schema.Attribute.Required;
    heading: Schema.Attribute.String;
    inn: Schema.Attribute.String & Schema.Attribute.Required;
    legal_name: Schema.Attribute.String & Schema.Attribute.Required;
    ogrn: Schema.Attribute.String & Schema.Attribute.Required;
    role_label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface LegalParagraphBlock extends Struct.ComponentSchema {
  collectionName: 'components_legal_paragraph_blocks';
  info: {
    displayName: '\u0410\u0431\u0437\u0430\u0446';
    icon: 'write';
  };
  attributes: {
    heading: Schema.Attribute.String;
    runs: Schema.Attribute.Component<'legal.inline-run', true> &
      Schema.Attribute.Required;
  };
}

export interface LegalTableBlock extends Struct.ComponentSchema {
  collectionName: 'components_legal_table_blocks';
  info: {
    displayName: '\u0422\u0430\u0431\u043B\u0438\u0446\u0430';
    icon: 'grid';
  };
  attributes: {
    headers: Schema.Attribute.Component<'legal.table-header', true> &
      Schema.Attribute.Required;
    heading: Schema.Attribute.String;
    rows: Schema.Attribute.Component<'legal.table-row', true> &
      Schema.Attribute.Required;
  };
}

export interface LegalTableCell extends Struct.ComponentSchema {
  collectionName: 'components_legal_table_cells';
  info: {
    displayName: '\u042F\u0447\u0435\u0439\u043A\u0430 \u0442\u0430\u0431\u043B\u0438\u0446\u044B';
    icon: 'grid';
  };
  attributes: {
    runs: Schema.Attribute.Component<'legal.inline-run', true> &
      Schema.Attribute.Required;
  };
}

export interface LegalTableHeader extends Struct.ComponentSchema {
  collectionName: 'components_legal_table_headers';
  info: {
    displayName: '\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043A\u043E\u043B\u043E\u043D\u043A\u0438';
    icon: 'layer';
  };
  attributes: {
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface LegalTableRow extends Struct.ComponentSchema {
  collectionName: 'components_legal_table_rows';
  info: {
    displayName: '\u0421\u0442\u0440\u043E\u043A\u0430 \u0442\u0430\u0431\u043B\u0438\u0446\u044B';
    icon: 'dashboard';
  };
  attributes: {
    cells: Schema.Attribute.Component<'legal.table-cell', true> &
      Schema.Attribute.Required;
  };
}

export interface PageCollectionCard extends Struct.ComponentSchema {
  collectionName: 'components_page_collection_cards';
  info: {
    displayName: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u0438';
    icon: 'picture';
  };
  attributes: {
    features: Schema.Attribute.Component<'page.list-item', true>;
    href: Schema.Attribute.String;
    image: Schema.Attribute.Media<'images'>;
    image_alt: Schema.Attribute.String;
    name: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageContactInfo extends Struct.ComponentSchema {
  collectionName: 'components_page_contact_infos';
  info: {
    displayName: '\u041A\u043E\u043D\u0442\u0430\u043A\u0442 \u0432 \u0431\u043B\u043E\u043A\u0435 \u0441\u0432\u044F\u0437\u0438';
    icon: 'phone';
  };
  attributes: {
    href: Schema.Attribute.String;
    icon_key: Schema.Attribute.Enumeration<['phone', 'email', 'location']> &
      Schema.Attribute.Required;
    note: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageDealerPackage extends Struct.ComponentSchema {
  collectionName: 'components_page_dealer_packages';
  info: {
    displayName: '\u0414\u0438\u043B\u0435\u0440\u0441\u043A\u0438\u0439 \u043F\u0430\u043A\u0435\u0442';
    icon: 'crown';
  };
  attributes: {
    cta_label: Schema.Attribute.String;
    featured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    features: Schema.Attribute.Component<'page.list-item', true>;
    form_option_label: Schema.Attribute.String & Schema.Attribute.Required;
    price: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.Enumeration<
      ['standard', 'individual', 'exclusive']
    > &
      Schema.Attribute.Required;
  };
}

export interface PageDiscountRow extends Struct.ComponentSchema {
  collectionName: 'components_page_discount_rows';
  info: {
    displayName: '\u0421\u0442\u0440\u043E\u043A\u0430 \u0441\u043A\u0438\u0434\u043A\u0438';
    icon: 'priceTag';
  };
  attributes: {
    amount_label: Schema.Attribute.String & Schema.Attribute.Required;
    discount_label: Schema.Attribute.String & Schema.Attribute.Required;
    highlight: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    terms_label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageDocumentCard extends Struct.ComponentSchema {
  collectionName: 'components_page_document_cards';
  info: {
    displayName: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0434\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430';
    icon: 'file';
  };
  attributes: {
    document_key: Schema.Attribute.String & Schema.Attribute.Required;
    file: Schema.Attribute.Media<'files'>;
    kind: Schema.Attribute.Enumeration<['certificate', 'company']> &
      Schema.Attribute.Required;
    request_aria_label: Schema.Attribute.String;
    request_label: Schema.Attribute.String;
    size_label: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    type_label: Schema.Attribute.String;
  };
}

export interface PageFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_page_faq_items';
  info: {
    displayName: '\u041F\u0443\u043D\u043A\u0442 FAQ';
    icon: 'question';
  };
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required;
    open_by_default: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageGeoCity extends Struct.ComponentSchema {
  collectionName: 'components_page_geo_cities';
  info: {
    displayName: '\u0413\u043E\u0440\u043E\u0434 \u0433\u0435\u043E\u0433\u0440\u0430\u0444\u0438\u0438';
    icon: 'pinMap';
  };
  attributes: {
    badge: Schema.Attribute.String;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

export interface PageHero extends Struct.ComponentSchema {
  collectionName: 'components_page_heroes';
  info: {
    displayName: '\u0428\u0430\u043F\u043A\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B';
    icon: 'landscape';
  };
  attributes: {
    cta_label: Schema.Attribute.String;
    cta_url: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    image_alt: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageHeroMedia extends Struct.ComponentSchema {
  collectionName: 'components_page_hero_medias';
  info: {
    displayName: '\u0428\u0430\u043F\u043A\u0430 \u0441 \u0432\u0438\u0434\u0435\u043E';
    icon: 'landscape';
  };
  attributes: {
    cta_label: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    poster: Schema.Attribute.Media<'images'>;
    poster_alt: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    title_tm: Schema.Attribute.String;
    video_desktop: Schema.Attribute.Media<'videos'>;
    video_mobile: Schema.Attribute.Media<'videos'>;
  };
}

export interface PageHotelCategory extends Struct.ComponentSchema {
  collectionName: 'components_page_hotel_categories';
  info: {
    displayName: '\u041A\u0430\u0442\u0435\u0433\u043E\u0440\u0438\u044F \u043E\u0442\u0435\u043B\u044F';
    icon: 'layer';
  };
  attributes: {
    active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

export interface PageHotelProduct extends Struct.ComponentSchema {
  collectionName: 'components_page_hotel_products';
  info: {
    displayName: '\u041F\u0440\u043E\u0434\u0443\u043A\u0442 \u043E\u0442\u0435\u043B\u044F\u043C';
    icon: 'shoppingCart';
  };
  attributes: {
    catalog_key: Schema.Attribute.String & Schema.Attribute.Required;
    cta_label: Schema.Attribute.String;
    description: Schema.Attribute.Text;
    image: Schema.Attribute.Media<'images'>;
    image_alt: Schema.Attribute.String;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageListItem extends Struct.ComponentSchema {
  collectionName: 'components_page_list_items';
  info: {
    displayName: '\u041F\u0443\u043D\u043A\u0442 \u0441\u043F\u0438\u0441\u043A\u0430';
    icon: 'bulletList';
  };
  attributes: {
    href: Schema.Attribute.String;
    text: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageOfferCard extends Struct.ComponentSchema {
  collectionName: 'components_page_offer_cards';
  info: {
    displayName: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F';
    icon: 'gift';
  };
  attributes: {
    bullets: Schema.Attribute.Component<'page.list-item', true>;
    icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageOffice extends Struct.ComponentSchema {
  collectionName: 'components_page_offices';
  info: {
    displayName: '\u041E\u0444\u0438\u0441';
    icon: 'house';
  };
  attributes: {
    address: Schema.Attribute.String & Schema.Attribute.Required;
    badge: Schema.Attribute.String;
    city: Schema.Attribute.String & Schema.Attribute.Required;
    email: Schema.Attribute.String;
    map_iframe_html: Schema.Attribute.Text & Schema.Attribute.Required;
    phone: Schema.Attribute.String;
    phone_href: Schema.Attribute.String;
    region: Schema.Attribute.String;
    schedule: Schema.Attribute.String;
    slug: Schema.Attribute.String & Schema.Attribute.Required;
    tab_label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageRefreshFeature extends Struct.ComponentSchema {
  collectionName: 'components_page_refresh_features';
  info: {
    displayName: '\u041F\u0443\u043D\u043A\u0442 Refresh-\u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u044B';
    icon: 'refresh';
  };
  attributes: {
    icon: Schema.Attribute.Media<'images'>;
    text: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageRequirementCard extends Struct.ComponentSchema {
  collectionName: 'components_page_requirement_cards';
  info: {
    displayName: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0442\u0440\u0435\u0431\u043E\u0432\u0430\u043D\u0438\u0439';
    icon: 'check';
  };
  attributes: {
    bullets: Schema.Attribute.Component<'page.list-item', true>;
    icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageSection extends Struct.ComponentSchema {
  collectionName: 'components_page_sections';
  info: {
    displayName: '\u0421\u0435\u043A\u0446\u0438\u044F';
    icon: 'layer';
  };
  attributes: {
    body: Schema.Attribute.Text;
    items: Schema.Attribute.Component<'page.list-item', true>;
    subtitle: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageSolutionCard extends Struct.ComponentSchema {
  collectionName: 'components_page_solution_cards';
  info: {
    displayName: '\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0430 \u0440\u0435\u0448\u0435\u043D\u0438\u044F';
    icon: 'puzzle';
  };
  attributes: {
    href: Schema.Attribute.String;
    icon: Schema.Attribute.Media<'images'>;
    text: Schema.Attribute.Text;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageStat extends Struct.ComponentSchema {
  collectionName: 'components_page_stats';
  info: {
    displayName: '\u041F\u043E\u043A\u0430\u0437\u0430\u0442\u0435\u043B\u044C';
    icon: 'chartBubble';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface PageTestimonial extends Struct.ComponentSchema {
  collectionName: 'components_page_testimonials';
  info: {
    displayName: '\u041E\u0442\u0437\u044B\u0432';
    icon: 'quote';
  };
  attributes: {
    author_name: Schema.Attribute.String;
    author_role: Schema.Attribute.String;
    company: Schema.Attribute.String & Schema.Attribute.Required;
    rating: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<5>;
    tag: Schema.Attribute.String;
    text: Schema.Attribute.Text & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'catalog.filter-help-segment': CatalogFilterHelpSegment;
      'catalog.filter-help-summary-item': CatalogFilterHelpSummaryItem;
      'catalog.hero-slide': CatalogHeroSlide;
      'catalog.product-gallery-item': CatalogProductGalleryItem;
      'legal.inline-run': LegalInlineRun;
      'legal.list-block': LegalListBlock;
      'legal.list-item': LegalListItem;
      'legal.operator-block': LegalOperatorBlock;
      'legal.paragraph-block': LegalParagraphBlock;
      'legal.table-block': LegalTableBlock;
      'legal.table-cell': LegalTableCell;
      'legal.table-header': LegalTableHeader;
      'legal.table-row': LegalTableRow;
      'page.collection-card': PageCollectionCard;
      'page.contact-info': PageContactInfo;
      'page.dealer-package': PageDealerPackage;
      'page.discount-row': PageDiscountRow;
      'page.document-card': PageDocumentCard;
      'page.faq-item': PageFaqItem;
      'page.geo-city': PageGeoCity;
      'page.hero': PageHero;
      'page.hero-media': PageHeroMedia;
      'page.hotel-category': PageHotelCategory;
      'page.hotel-product': PageHotelProduct;
      'page.list-item': PageListItem;
      'page.offer-card': PageOfferCard;
      'page.office': PageOffice;
      'page.refresh-feature': PageRefreshFeature;
      'page.requirement-card': PageRequirementCard;
      'page.section': PageSection;
      'page.solution-card': PageSolutionCard;
      'page.stat': PageStat;
      'page.testimonial': PageTestimonial;
    }
  }
}
