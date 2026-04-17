import type { Schema, Struct } from '@strapi/strapi';

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
      'catalog.hero-slide': CatalogHeroSlide;
    }
  }
}
