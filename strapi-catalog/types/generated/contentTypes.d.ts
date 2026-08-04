import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
      Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiCatalogFilterHelpCatalogFilterHelp
  extends Struct.CollectionTypeSchema {
  collectionName: 'catalog_filter_helps';
  info: {
    displayName: '\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u043A \u0444\u0438\u043B\u044C\u0442\u0440\u0443 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430';
    pluralName: 'catalog-filter-helps';
    singularName: 'catalog-filter-help';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    filter_key: Schema.Attribute.Enumeration<
      [
        'collection',
        'size',
        'firmness',
        'type',
        'loadRange',
        'heightRange',
        'fillings',
        'features',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    is_active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::catalog-filter-help.catalog-filter-help'
    > &
      Schema.Attribute.Private;
    modal_title: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    segments: Schema.Attribute.Component<'catalog.filter-help-segment', true>;
    summary_items: Schema.Attribute.Component<
      'catalog.filter-help-summary-item',
      true
    >;
    summary_title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0415\u0441\u043B\u0438 \u043A\u043E\u0440\u043E\u0442\u043A\u043E'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCatalogNewHeroCatalogNewHero
  extends Struct.SingleTypeSchema {
  collectionName: 'catalog_new_heroes';
  info: {
    displayName: '\u0421\u043B\u0430\u0439\u0434\u0435\u0440 \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u0430';
    pluralName: 'catalog-new-heroes';
    singularName: 'catalog-new-hero';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    autoplay_ms: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 2500;
        },
        number
      > &
      Schema.Attribute.DefaultTo<6500>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::catalog-new-hero.catalog-new-hero'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    slides: Schema.Attribute.Component<'catalog.hero-slide', true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCatalogShareHelpCatalogShareHelp
  extends Struct.CollectionTypeSchema {
  collectionName: 'catalog_share_helps';
  info: {
    displayName: '\u041F\u043E\u0434\u0441\u043A\u0430\u0437\u043A\u0430 \u00AB\u041F\u043E\u0434\u0435\u043B\u0438\u0442\u044C\u0441\u044F\u00BB';
    pluralName: 'catalog-share-helps';
    singularName: 'catalog-share-help';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    is_active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::catalog-share-help.catalog-share-help'
    > &
      Schema.Attribute.Private;
    modal_title: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    segments: Schema.Attribute.Component<'catalog.filter-help-segment', true>;
    share_key: Schema.Attribute.Enumeration<
      ['favouritesShare', 'productShare']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    summary_items: Schema.Attribute.Component<
      'catalog.filter-help-summary-item',
      true
    >;
    summary_title: Schema.Attribute.String &
      Schema.Attribute.DefaultTo<'\u0415\u0441\u043B\u0438 \u043A\u043E\u0440\u043E\u0442\u043A\u043E'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCollectionCollection extends Struct.CollectionTypeSchema {
  collectionName: 'collections';
  info: {
    displayName: '\u041A\u043E\u043B\u043B\u0435\u043A\u0446\u0438\u044F';
    pluralName: 'collections';
    singularName: 'collection';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    is_active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::collection.collection'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiContactsPageContactsPage extends Struct.SingleTypeSchema {
  collectionName: 'contacts_pages';
  info: {
    displayName: '\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B';
    pluralName: 'contacts-pages';
    singularName: 'contacts-page';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    contact_form_title: Schema.Attribute.String;
    contact_info: Schema.Attribute.Component<'page.contact-info', true>;
    contact_section_title: Schema.Attribute.String;
    contact_submit_label: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    hero: Schema.Attribute.Component<'page.hero', false> &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::contacts-page.contacts-page'
    > &
      Schema.Attribute.Private;
    map_title: Schema.Attribute.String & Schema.Attribute.Required;
    offices: Schema.Attribute.Component<'page.office', true>;
    offices_title: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCookiesPageCookiesPage extends Struct.SingleTypeSchema {
  collectionName: 'cookies_pages';
  info: {
    displayName: '\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 cookie';
    pluralName: 'cookies-pages';
    singularName: 'cookies-page';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    body: Schema.Attribute.DynamicZone<
      [
        'legal.paragraph-block',
        'legal.list-block',
        'legal.table-block',
        'legal.operator-block',
      ]
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    effective_date: Schema.Attribute.Date & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::cookies-page.cookies-page'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDealersPageDealersPage extends Struct.SingleTypeSchema {
  collectionName: 'dealers_pages';
  info: {
    displayName: '\u0414\u0438\u043B\u0435\u0440\u0430\u043C';
    pluralName: 'dealers-pages';
    singularName: 'dealers-page';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    conditions: Schema.Attribute.Component<'page.list-item', true>;
    conditions_icon: Schema.Attribute.Media<'images'>;
    conditions_subtitle: Schema.Attribute.Text;
    conditions_title: Schema.Attribute.String & Schema.Attribute.Required;
    contact_form_title: Schema.Attribute.String;
    contact_info: Schema.Attribute.Component<'page.contact-info', true>;
    contact_package_field_label: Schema.Attribute.String;
    contact_package_placeholder: Schema.Attribute.String;
    contact_section_title: Schema.Attribute.String;
    contact_submit_label: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    faq_items: Schema.Attribute.Component<'page.faq-item', true>;
    faq_title: Schema.Attribute.String;
    geography_cities: Schema.Attribute.Component<'page.geo-city', true>;
    geography_map_image: Schema.Attribute.Media<'images'>;
    geography_subtitle: Schema.Attribute.Text;
    geography_title: Schema.Attribute.String & Schema.Attribute.Required;
    hero: Schema.Attribute.Component<'page.hero', false> &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::dealers-page.dealers-page'
    > &
      Schema.Attribute.Private;
    offers: Schema.Attribute.Component<'page.offer-card', true>;
    offers_subtitle: Schema.Attribute.Text;
    offers_title: Schema.Attribute.String & Schema.Attribute.Required;
    packages: Schema.Attribute.Component<'page.dealer-package', true>;
    packages_subtitle: Schema.Attribute.Text;
    packages_title: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    quality_body: Schema.Attribute.Text;
    quality_image: Schema.Attribute.Media<'images'>;
    quality_title: Schema.Attribute.String;
    requirements: Schema.Attribute.Component<'page.requirement-card', true>;
    requirements_subtitle: Schema.Attribute.Text;
    requirements_title: Schema.Attribute.String & Schema.Attribute.Required;
    stats: Schema.Attribute.Component<'page.stat', true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDocumentsPageDocumentsPage extends Struct.SingleTypeSchema {
  collectionName: 'documents_pages';
  info: {
    displayName: '\u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B';
    pluralName: 'documents-pages';
    singularName: 'documents-page';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    certificates: Schema.Attribute.Component<'page.document-card', true>;
    certificates_title: Schema.Attribute.String & Schema.Attribute.Required;
    company_documents: Schema.Attribute.Component<'page.document-card', true>;
    company_illustration: Schema.Attribute.Media<'images'>;
    company_title: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    faq_items: Schema.Attribute.Component<'page.faq-item', true>;
    faq_title: Schema.Attribute.String;
    help_body: Schema.Attribute.Text;
    help_cta_label: Schema.Attribute.String;
    help_title: Schema.Attribute.String & Schema.Attribute.Required;
    hero: Schema.Attribute.Component<'page.hero', false> &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::documents-page.documents-page'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDownloadCatalogPageDownloadCatalogPage
  extends Struct.SingleTypeSchema {
  collectionName: 'download_catalog_pages';
  info: {
    displayName: '\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u00AB\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u043A\u0430\u0442\u0430\u043B\u043E\u0433\u00BB';
    pluralName: 'download-catalog-pages';
    singularName: 'download-catalog-page';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    back_href: Schema.Attribute.String;
    back_label: Schema.Attribute.String;
    catalog_pdf: Schema.Attribute.Media<'files'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    lead: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::download-catalog-page.download-catalog-page'
    > &
      Schema.Attribute.Private;
    media_display_mode: Schema.Attribute.Enumeration<['slider', 'image_only']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'slider'>;
    publishedAt: Schema.Attribute.DateTime;
    slider_autoplay_ms: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 2500;
        },
        number
      > &
      Schema.Attribute.DefaultTo<6500>;
    slides: Schema.Attribute.Component<'catalog.hero-slide', true>;
    submit_label: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFeatureOptionFeatureOption
  extends Struct.CollectionTypeSchema {
  collectionName: 'feature_options';
  info: {
    displayName: '\u0414\u043E\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u043E\u0441\u043E\u0431\u0435\u043D\u043D\u043E\u0441\u0442\u044C';
    pluralName: 'feature-options';
    singularName: 'feature-option';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::feature-option.feature-option'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFillingOptionFillingOption
  extends Struct.CollectionTypeSchema {
  collectionName: 'filling_options';
  info: {
    displayName: '\u041D\u0430\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044C';
    pluralName: 'filling-options';
    singularName: 'filling-option';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    is_active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::filling-option.filling-option'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFirmnessOptionFirmnessOption
  extends Struct.CollectionTypeSchema {
  collectionName: 'firmness_options';
  info: {
    displayName: '\u0416\u0435\u0441\u0442\u043A\u043E\u0441\u0442\u044C';
    pluralName: 'firmness-options';
    singularName: 'firmness-option';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    is_active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::firmness-option.firmness-option'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiHeightRangeOptionHeightRangeOption
  extends Struct.CollectionTypeSchema {
  collectionName: 'height_range_options';
  info: {
    displayName: '\u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u0432\u044B\u0441\u043E\u0442\u044B';
    pluralName: 'height-range-options';
    singularName: 'height-range-option';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    is_active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::height-range-option.height-range-option'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiHotelsPageHotelsPage extends Struct.SingleTypeSchema {
  collectionName: 'hotels_pages';
  info: {
    displayName: '\u041E\u0442\u0435\u043B\u044F\u043C';
    pluralName: 'hotels-pages';
    singularName: 'hotels-page';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    categories: Schema.Attribute.Component<'page.hotel-category', true>;
    categories_title: Schema.Attribute.String & Schema.Attribute.Required;
    contact_form_title: Schema.Attribute.String;
    contact_info: Schema.Attribute.Component<'page.contact-info', true>;
    contact_section_title: Schema.Attribute.String;
    contact_submit_label: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    discount_col_amount: Schema.Attribute.String;
    discount_col_discount: Schema.Attribute.String;
    discount_col_terms: Schema.Attribute.String;
    discount_note: Schema.Attribute.Text;
    discount_rows: Schema.Attribute.Component<'page.discount-row', true>;
    discount_subtitle: Schema.Attribute.Text;
    discount_title: Schema.Attribute.String & Schema.Attribute.Required;
    faq_items: Schema.Attribute.Component<'page.faq-item', true>;
    faq_title: Schema.Attribute.String;
    hero: Schema.Attribute.Component<'page.hero', false> &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::hotels-page.hotels-page'
    > &
      Schema.Attribute.Private;
    products: Schema.Attribute.Component<'page.hotel-product', true>;
    publishedAt: Schema.Attribute.DateTime;
    refresh_badge: Schema.Attribute.String;
    refresh_cta_label: Schema.Attribute.String;
    refresh_description: Schema.Attribute.Text;
    refresh_features: Schema.Attribute.Component<'page.refresh-feature', true>;
    refresh_title: Schema.Attribute.String;
    stats: Schema.Attribute.Component<'page.stat', true>;
    stats_note: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiIndexPageIndexPage extends Struct.SingleTypeSchema {
  collectionName: 'index_pages';
  info: {
    displayName: '\u0413\u043B\u0430\u0432\u043D\u0430\u044F';
    pluralName: 'index-pages';
    singularName: 'index-page';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    collections: Schema.Attribute.Component<'page.collection-card', true>;
    collections_link_href: Schema.Attribute.String;
    collections_link_label: Schema.Attribute.String;
    collections_subtitle: Schema.Attribute.Text;
    collections_title: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    docs: Schema.Attribute.Component<'page.document-card', true>;
    docs_title: Schema.Attribute.String & Schema.Attribute.Required;
    hero: Schema.Attribute.Component<'page.hero-media', false> &
      Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::index-page.index-page'
    > &
      Schema.Attribute.Private;
    partners_image_desktop: Schema.Attribute.Media<'images'>;
    partners_image_mobile: Schema.Attribute.Media<'images'>;
    partners_title: Schema.Attribute.String & Schema.Attribute.Required;
    philosophy_cards: Schema.Attribute.Component<'page.solution-card', true>;
    philosophy_presentation: Schema.Attribute.Component<
      'page.document-card',
      false
    >;
    philosophy_title: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    solutions: Schema.Attribute.Component<'page.solution-card', true>;
    solutions_title: Schema.Attribute.String & Schema.Attribute.Required;
    testimonials: Schema.Attribute.Component<'page.testimonial', true>;
    testimonials_title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiLoadRangeOptionLoadRangeOption
  extends Struct.CollectionTypeSchema {
  collectionName: 'load_range_options';
  info: {
    displayName: '\u0414\u0438\u0430\u043F\u0430\u0437\u043E\u043D \u043D\u0430\u0433\u0440\u0443\u0437\u043A\u0438';
    pluralName: 'load-range-options';
    singularName: 'load-range-option';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    is_active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::load-range-option.load-range-option'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMattressSizeMattressSize
  extends Struct.CollectionTypeSchema {
  collectionName: 'mattress_sizes';
  info: {
    displayName: '\u0421\u0442\u0430\u043D\u0434\u0430\u0440\u0442\u0438\u0437\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0440\u0430\u0437\u043C\u0435\u0440';
    pluralName: 'mattress-sizes';
    singularName: 'mattress-size';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::mattress-size.mattress-size'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    products: Schema.Attribute.Relation<'manyToMany', 'api::product.product'>;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMattressTypeOptionMattressTypeOption
  extends Struct.CollectionTypeSchema {
  collectionName: 'mattress_type_options';
  info: {
    displayName: '\u0422\u0438\u043F \u043A\u043E\u043D\u0441\u0442\u0440\u0443\u043A\u0446\u0438\u0438';
    pluralName: 'mattress-type-options';
    singularName: 'mattress-type-option';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    is_active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::mattress-type-option.mattress-type-option'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPrivacyPagePrivacyPage extends Struct.SingleTypeSchema {
  collectionName: 'privacy_pages';
  info: {
    displayName: '\u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u043A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u0438';
    pluralName: 'privacy-pages';
    singularName: 'privacy-page';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    body: Schema.Attribute.DynamicZone<
      [
        'legal.paragraph-block',
        'legal.list-block',
        'legal.table-block',
        'legal.operator-block',
      ]
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    effective_date: Schema.Attribute.Date & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::privacy-page.privacy-page'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiProductProduct extends Struct.CollectionTypeSchema {
  collectionName: 'products';
  info: {
    displayName: '\u041F\u0440\u043E\u0434\u0443\u043A\u0442';
    pluralName: 'products';
    singularName: 'product';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    collection: Schema.Attribute.Relation<
      'manyToOne',
      'api::collection.collection'
    >;
    cover_description: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    features: Schema.Attribute.Relation<
      'manyToMany',
      'api::feature-option.feature-option'
    >;
    filling_options: Schema.Attribute.Relation<
      'manyToMany',
      'api::filling-option.filling-option'
    >;
    fillings: Schema.Attribute.Enumeration<
      [
        '\u043A\u043E\u043A\u043E\u0441',
        '\u043B\u0430\u0442\u0435\u043A\u0441',
        '\u043E\u0440\u0442\u043E_\u043F\u0435\u043D\u0430',
        '\u0441_\u044D\u0444\u0444\u0435\u043A\u0442\u043E\u043C_\u043F\u0430\u043C\u044F\u0442\u0438',
        '\u043D\u0430\u043D\u043E_\u043F\u0435\u043D\u0430',
        '\u0444\u043E\u0440\u043F\u043B\u0438\u0442',
      ]
    >;
    firmness: Schema.Attribute.Enumeration<
      [
        '\u043C\u044F\u0433\u043A\u0438\u0439',
        '\u0441\u0440\u0435\u0434\u043D\u0438\u0439',
        '\u0436\u0435\u0441\u0442\u043A\u0438\u0439',
        '\u0440\u0430\u0437\u043D\u0430\u044F_\u0436\u0435\u0441\u0442\u043A\u043E\u0441\u0442\u044C_\u0441\u0442\u043E\u0440\u043E\u043D',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'\u0441\u0440\u0435\u0434\u043D\u0438\u0439'>;
    firmness_option: Schema.Attribute.Relation<
      'manyToOne',
      'api::firmness-option.firmness-option'
    >;
    gallery: Schema.Attribute.Component<'catalog.product-gallery-item', true>;
    height_cm: Schema.Attribute.Decimal & Schema.Attribute.Required;
    height_range: Schema.Attribute.Enumeration<
      [
        '\u043A\u043E\u043C\u043F\u0430\u043A\u0442\u043D\u044B\u0435_\u0434\u043E_16_\u0441\u043C',
        '\u0441\u0440\u0435\u0434\u043D\u0438\u0435_16_22_\u0441\u043C',
        '\u0432\u044B\u0441\u043E\u043A\u0438\u0435_\u043E\u0442_23_\u0441\u043C',
      ]
    >;
    height_range_option: Schema.Attribute.Relation<
      'manyToOne',
      'api::height-range-option.height-range-option'
    >;
    image_url: Schema.Attribute.String;
    is_active: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    layers_catalog: Schema.Attribute.Text;
    load_range: Schema.Attribute.Enumeration<
      [
        '\u0434\u043E_120_\u043A\u0433',
        '\u0434\u043E_160_\u043A\u0433',
        '\u0434\u043E_180_\u043A\u0433',
        '\u0441\u0432\u044B\u0448\u0435_160_\u043A\u0433',
        '\u0441\u0432\u044B\u0448\u0435_180_\u043A\u0433',
      ]
    >;
    load_range_option: Schema.Attribute.Relation<
      'manyToOne',
      'api::load-range-option.load-range-option'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::product.product'
    > &
      Schema.Attribute.Private;
    mattress_type: Schema.Attribute.Enumeration<
      [
        '\u043F\u0440\u0443\u0436\u0438\u043D\u043D\u044B\u0439',
        '\u0431\u0435\u0441\u043F\u0440\u0443\u0436\u0438\u043D\u043D\u044B\u0439',
        '\u0442\u043E\u043F\u0435\u0440',
        '\u0434\u0432\u0443\u0445\u0441\u0442\u043E\u0440\u043E\u043D\u043D\u0438\u0435',
        '\u043E\u0434\u043D\u043E\u0441\u0442\u043E\u0440\u043E\u043D\u043D\u0438\u0435',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'\u0431\u0435\u0441\u043F\u0440\u0443\u0436\u0438\u043D\u043D\u044B\u0439'>;
    mattress_type_option: Schema.Attribute.Relation<
      'manyToOne',
      'api::mattress-type-option.mattress-type-option'
    >;
    max_load_kg: Schema.Attribute.Integer & Schema.Attribute.Required;
    media: Schema.Attribute.Media<'images'>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    sizes: Schema.Attribute.Relation<
      'manyToMany',
      'api::mattress-size.mattress-size'
    >;
    slug: Schema.Attribute.UID<'name'> &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    tags: Schema.Attribute.Relation<'manyToMany', 'api::tag.tag'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTagTag extends Struct.CollectionTypeSchema {
  collectionName: 'tags';
  info: {
    displayName: '\u0422\u0435\u0433';
    pluralName: 'tags';
    singularName: 'tag';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::tag.tag'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.UID<'name'> &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTermsPageTermsPage extends Struct.SingleTypeSchema {
  collectionName: 'terms_pages';
  info: {
    displayName: '\u041F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u0435\u043B\u044C\u0441\u043A\u043E\u0435 \u0441\u043E\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435';
    pluralName: 'terms-pages';
    singularName: 'terms-page';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    body: Schema.Attribute.DynamicZone<
      [
        'legal.paragraph-block',
        'legal.list-block',
        'legal.table-block',
        'legal.operator-block',
      ]
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    effective_date: Schema.Attribute.Date & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::terms-page.terms-page'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    title: Schema.Attribute.String & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.Text;
    caption: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    focalPoint: Schema.Attribute.JSON;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.Text;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::catalog-filter-help.catalog-filter-help': ApiCatalogFilterHelpCatalogFilterHelp;
      'api::catalog-new-hero.catalog-new-hero': ApiCatalogNewHeroCatalogNewHero;
      'api::catalog-share-help.catalog-share-help': ApiCatalogShareHelpCatalogShareHelp;
      'api::collection.collection': ApiCollectionCollection;
      'api::contacts-page.contacts-page': ApiContactsPageContactsPage;
      'api::cookies-page.cookies-page': ApiCookiesPageCookiesPage;
      'api::dealers-page.dealers-page': ApiDealersPageDealersPage;
      'api::documents-page.documents-page': ApiDocumentsPageDocumentsPage;
      'api::download-catalog-page.download-catalog-page': ApiDownloadCatalogPageDownloadCatalogPage;
      'api::feature-option.feature-option': ApiFeatureOptionFeatureOption;
      'api::filling-option.filling-option': ApiFillingOptionFillingOption;
      'api::firmness-option.firmness-option': ApiFirmnessOptionFirmnessOption;
      'api::height-range-option.height-range-option': ApiHeightRangeOptionHeightRangeOption;
      'api::hotels-page.hotels-page': ApiHotelsPageHotelsPage;
      'api::index-page.index-page': ApiIndexPageIndexPage;
      'api::load-range-option.load-range-option': ApiLoadRangeOptionLoadRangeOption;
      'api::mattress-size.mattress-size': ApiMattressSizeMattressSize;
      'api::mattress-type-option.mattress-type-option': ApiMattressTypeOptionMattressTypeOption;
      'api::privacy-page.privacy-page': ApiPrivacyPagePrivacyPage;
      'api::product.product': ApiProductProduct;
      'api::tag.tag': ApiTagTag;
      'api::terms-page.terms-page': ApiTermsPageTermsPage;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
