# Phase 7 Global Site Chrome — content contract

**Status:** Phase A contract freeze. No schemas or runtime implementation.

## Coverage

The machine-readable source is `07-content-contract.json`: 13 consumers and 41 owned rows (34 CMS, 7 code), with no blank or unowned rows. Consumers are `index`, `hotels`, `dealers`, `contacts`, `documents`, `download-catalog`, `catalog`, `privacy`, `terms`, `cookies`, `404`, `unsubscribe`, and `marketing-template`.

Header desktop and mobile are one atomic surface. Footer is part of the same payload. The exact behavior key sets are frozen in JSON. Unknown, missing, duplicate, or reordered keys reject the whole payload.

## Locked ownership

- CMS: announcement text, public phone/schedule, existing logo slots, ordered primary navigation, contact CTA text/href, footer description/requisites/groups/contacts/policies/copyright.
- Code: selectors/classes/data attributes, active-link calculation, mobile open/close aria and icons, menu behavior/focus, cookie banner, form consent/routing, analytics and JSON-LD.
- CMS content never grants a new UI slot and is never rendered as HTML.

## URL/media contract

Internal hrefs use the exact allowlist in JSON. Phone and email fields have exact contracted `tel:`/`mailto:` values. Media must be a non-empty root-relative URL without traversal, credentials, protocol, query, fragment, or HTML-like content.

`contacts.html` currently uses `#contact-form` for its CTA while all other inputs use `/contacts#contact-form`. This is a legacy-equivalent baseline only; the canonical CMS/default value is `/contacts#contact-form`, to be normalized by the Phase D generator.

`hotels.html` and `dealers.html` currently use `#` for the footer catalog link. The link has no contracted modal hook and is classified as legacy drift; the canonical CMS/default value is `/catalog`, to be normalized by the generator.

## Mechanical matrix

Each JSON row contains `path`, DOM selector/attribute, owner, consumer set, validator, fallback, and automated test owner. The Phase A harness scans all 13 files for complete desktop/mobile/footer baseline, exact navigation order, footer link order, controls, and the sole CTA legacy exception.

## Failure contract

Atomic reject on blank required values, HTML-like strings, unsafe/non-allowlisted hrefs, invalid media, unknown fields/keys, duplicate keys, missing keys, or reordered behavior keys. Built-in negatives cover each class before Phase B.
