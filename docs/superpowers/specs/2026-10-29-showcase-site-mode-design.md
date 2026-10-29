# Showcase site mode — design specification

## Problem

The first public launch must remain a content catalogue, without commerce, prices, or the AI-powered smart selector. Development of those capabilities continues in a separate branch, so deleting their source code would create unnecessary divergence and rework.

Hiding controls with CSS is not sufficient. In showcase mode the browser must not receive price or commerce data, and the Node server must not initialize or expose smart-selection and commerce endpoints.

## Branch and release model

- `release/showcase-launch` is the first-launch line. Its runtime mode is `showcase`.
- `codex/store-commerce-smart-selector` remains the ongoing commerce line.
- Shared fixes should be made in the showcase line when applicable and then deliberately merged or cherry-picked into the commerce line.
- This task is local-only. It does not push, deploy, or modify Timeweb, `main`, or production.

## Runtime contract

One environment variable controls the complete product surface:

```env
SITE_MODE=showcase
```

Allowed effective modes are:

- `showcase`: content catalogue only;
- `commerce`: prices, store APIs, and smart selector are available.

The contract is fail-closed: only the exact normalized value `commerce` enables commercial capabilities. A missing, empty, or unknown value resolves to `showcase`. Separate flags for price, smart selection, and commerce are intentionally not supported because they could create inconsistent user/server states.

## Capability matrix

| Surface | `showcase` | `commerce` |
| --- | --- | --- |
| Catalogue content and ordinary filters | Available | Available |
| Hero CTA | “Скачать каталог” | Smart selector |
| Prices in cards/list rows | Not rendered | Rendered |
| Price filter and price sorting | Not rendered | Rendered |
| Price/commerce fields in public catalogue API | Removed | Available |
| `POST /api/catalog/smart-select` | Not registered; 404 | Registered |
| `/api/commerce/*` | Not registered; 404 | Registered |
| Gemini selector initialization | Never initialized | Initialized |
| Medusa clients/router initialization | Never initialized | Initialized |

## Shared mode source

`lib/site-mode.cjs` is the source of truth for normalization and capability derivation. Both `server.cjs` and Vite consume this module. Vite injects the effective mode as a compile-time constant for the React/browser layer, avoiding a second environment variable that could drift from the server configuration.

## Server isolation

In showcase mode:

1. Smart-selector and commerce modules are not loaded at server startup.
2. Their Express routes are not registered. Requests receive the normal internal API 404 response.
3. `GET /api/catalog/products` removes all price and commerce identity fields before caching and returning either Strapi or snapshot data.
4. No Gemini or Medusa client is instantiated and no request can reach those integrations through this server.

This is intentional server-side unavailability, not presentational hiding.

## Browser surface

In showcase mode:

- the catalogue hero contains the established `/download-catalog` CTA;
- the smart-selector modal has no entry point;
- product cards contain neither visible prices nor `data-price` metadata;
- price filter controls and price sort options do not exist in the DOM;
- catalogue content and non-commercial filters continue to work normally.

Commercial source files may remain in the repository for the commerce line, but they must have no reachable showcase UI or server route.

## Documentation and operations

- `.env.example` must explicitly document `SITE_MODE=showcase` and the fail-closed rule.
- A dedicated site-mode document must describe the matrix, branch flow, local commands, and release verification.
- Timeweb environments must use an explicit mode even though the safe default is showcase. This task only prepares that documentation; it does not change Timeweb.

## Success criteria

1. Missing/unknown `SITE_MODE` resolves to showcase; only `commerce` enables commercial capabilities.
2. Automated server checks prove smart and commerce endpoints return 404 in showcase.
3. Automated API checks prove price/commerce fields are absent from showcase catalogue responses.
4. Automated UI checks prove the download CTA exists and smart selector, prices, price filters, and price sorts do not.
5. Commerce-mode contract checks prove those capabilities remain available when explicitly enabled.
6. Typecheck, relevant catalogue checks, and production build pass locally.

## Non-goals

- Deleting the Medusa, pricing, or smart-selector implementation.
- Implementing additional store functionality.
- Pushing, deploying, or modifying remote branches/environments.
- Redesigning the catalogue or download form.
