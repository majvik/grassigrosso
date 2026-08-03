import type { Schema, Struct } from '@strapi/strapi';

export interface CatalogFilterHelpSegment extends Struct.ComponentSchema {
  collectionName: 'components_catalog_filter_help_segments';
  info: {
    displayName: 'Filter help segment';
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
    displayName: 'Filter help summary item';
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
    displayName: 'Catalog hero slide';
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
    displayName: 'Product gallery item';
    icon: 'picture';
  };
  attributes: {
    alt_text: Schema.Attribute.String;
    poster: Schema.Attribute.Media<'images'>;
    slide_image: Schema.Attribute.Media<'images'>;
    slide_video: Schema.Attribute.Media<'videos' | 'files'>;
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

export interface PageHero extends Struct.ComponentSchema {
  collectionName: 'components_page_heroes';
  info: {
    displayName: 'Hero \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B';
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

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'catalog.filter-help-segment': CatalogFilterHelpSegment;
      'catalog.filter-help-summary-item': CatalogFilterHelpSummaryItem;
      'catalog.hero-slide': CatalogHeroSlide;
      'catalog.product-gallery-item': CatalogProductGalleryItem;
      'page.faq-item': PageFaqItem;
      'page.hero': PageHero;
      'page.list-item': PageListItem;
      'page.section': PageSection;
    }
  }
}
