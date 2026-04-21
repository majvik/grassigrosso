# ---------- build stage ----------
FROM node:22-slim AS build
WORKDIR /app
ENV npm_config_audit=false \
    npm_config_fund=false \
    npm_config_loglevel=error \
    npm_config_update_notifier=false

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --no-audit --fund=false --no-update-notifier --loglevel=error

COPY strapi-catalog/package.json strapi-catalog/package-lock.json ./strapi-catalog/
RUN npm install --prefix strapi-catalog --no-audit --fund=false --no-update-notifier --loglevel=error

COPY . .
# VITE_* нужны только на этапе сборки. Используем нейтральное имя build-arg,
# чтобы buildkit не помечал публичный browser key как secret.
ARG YANDEX_MAPS_BROWSER_ARG
RUN VITE_YANDEX_MAPS_API_KEY="${YANDEX_MAPS_BROWSER_ARG}" npm run build
RUN npm run build --prefix strapi-catalog

RUN npm prune --omit=dev --no-audit --fund=false --no-update-notifier --loglevel=error
RUN npm prune --prefix strapi-catalog --omit=dev --no-audit --fund=false --no-update-notifier --loglevel=error


# ---------- runtime stage ----------
FROM node:22-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

ARG GIT_SHA=dev
ENV NODE_ENV=production
ENV PORT=3000
ENV STRAPI_PORT=1337
ENV STRAPI_URL=http://127.0.0.1:1337
ENV APP_VERSION=${GIT_SHA}

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/server.cjs ./
COPY --from=build /app/lib ./lib
COPY --from=build /app/dist ./dist
COPY --from=build /app/strapi-catalog ./strapi-catalog
COPY --from=build /app/scripts/start-services.sh ./scripts/start-services.sh

RUN mkdir -p /app/data/documents /app/data/strapi \
  && chmod +x /app/scripts/start-services.sh

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=10 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health', r=>process.exit(r.statusCode===200?0:1)).on('error', ()=>process.exit(1))"

CMD ["/app/scripts/start-services.sh"]
