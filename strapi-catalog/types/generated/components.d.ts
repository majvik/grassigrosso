import type { Schema, Struct } from '@strapi/strapi';

export interface CatalogFilterHelpSegment extends Struct.ComponentSchema {
  collectionName: 'components_catalog_filter_help_segments';
  info: {
    displayName: 'Filter help segment';
    icon: 'file';
  };
  attributes: {
    body: Schema.Attribute.Text;
    photo: Schema.Attribute.Media<'images'>;
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

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'catalog.filter-help-segment': CatalogFilterHelpSegment;
      'catalog.hero-slide': CatalogHeroSlide;
    }
  }
}
