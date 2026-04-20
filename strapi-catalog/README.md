# 🚀 Getting started with Strapi

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>

---

## Grassigrosso catalog notes

### Safety: no auto-seed / no auto-link

- Project bootstrap does **not** create or mutate products automatically.
- `src/index.js` only logs `Catalog bootstrap: auto-seed/auto-link is disabled`.
- This guarantees that real products are not modified by startup logic.

### Product filter fields (RU options in Strapi)

Product content type (`api::product.product`) uses Russian option values in Strapi admin:

- `firmness`: `мягкий`, `средний`, `жесткий`
- `mattress_type`: `пружинный`, `беспружинный`, `топер`
- `load_range`: `до_90_кг`, `до_110_кг`, `до_130_кг`, `до_150_кг`, `свыше_150_кг`
- `height_range`: `низкий`, `средний`, `высокий`
- `widths`: `ширина_80`, `ширина_90`, `ширина_120`, `ширина_140`, `ширина_160`, `ширина_180`, `ширина_200`
- `lengths`: `длина_190`, `длина_195`, `длина_200`
- `fillings`: `кокос`, `латекс`, `мемори`, `ппу`, `холкон`
- `features`: relation `manyToMany` to `api::feature-option.feature-option` (multi-select)

`feature-option` entries should be created/managed in admin (for example: `Съемный чехол`, `Эффект зима-лето`, `Разная жесткость сторон`).

### API mapping for storefront compatibility

Public catalog feed keeps storefront codes stable even though Strapi values are Russian:

- `firmness`: `soft|medium|hard`
- `mattressType`: `spring|nospring|topper`
- `loadRange`: `upTo90|upTo110|upTo130|upTo150|over150`
- `heightRange`: `low|mid|high`
- `widths/lengths`: numeric values without prefixes (e.g. `160`, `200`)
- `fillings/features`: frontend codes (`coir`, `memory`, `removableCover`, etc.)
