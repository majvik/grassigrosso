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

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'catalog.filter-help-segment': CatalogFilterHelpSegment;
      'catalog.filter-help-summary-item': CatalogFilterHelpSummaryItem;
      'catalog.hero-slide': CatalogHeroSlide;
      'catalog.product-gallery-item': CatalogProductGalleryItem;
    }
  }
}
