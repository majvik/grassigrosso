# ---------- build stage ----------
FROM node:22-slim AS build
WORKDIR /app
ENV npm_config_audit=false \
    npm_config_fund=false \
    npm_config_loglevel=error \
    npm_config_update_notifier=false \
    npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
  npm ci --no-audit --fund=false --no-update-notifier --loglevel=error

COPY strapi-catalog/package.json strapi-catalog/package-lock.json ./strapi-catalog/
RUN --mount=type=cache,target=/root/.npm \
  npm install --prefix strapi-catalog --no-audit --fund=false --no-update-notifier --loglevel=error

COPY . .
# VITE_* нужны только на этапе сборки. Используем нейтральное имя build-arg,
# чтобы buildkit не помечал публичный browser key как secret.
ARG YANDEX_MAPS_BROWSER_ARG
RUN VITE_YANDEX_MAPS_API_KEY="${YANDEX_MAPS_BROWSER_ARG}" npm run build

RUN npm prune --omit=dev --no-audit --fund=false --no-update-notifier --loglevel=error


# ---------- runtime stage ----------
FROM node:22-slim
WORKDIR /app

ARG GIT_SHA=dev
ENV NODE_ENV=production
ENV PORT=3000
ENV STRAPI_PORT=1337
ENV STRAPI_URL=http://127.0.0.1:1337
ENV APP_VERSION=${GIT_SHA}
ENV npm_config_audit=false \
    npm_config_fund=false \
    npm_config_loglevel=error \
    npm_config_update_notifier=false \
    npm_config_fetch_retries=5 \
    npm_config_fetch_retry_mintimeout=20000 \
    npm_config_fetch_retry_maxtimeout=120000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./
COPY --from=build /app/server.cjs ./
COPY --from=build /app/lib ./lib
COPY --from=build /app/dist ./dist

# Keep locally-authored Strapi content (seed/uploads/schemas/Admin) in the image,
# but do not copy the build-stage node_modules tree (~786MB / 866s on Timeweb).
COPY --from=build /app/strapi-catalog/package.json ./strapi-catalog/package.json
COPY --from=build /app/strapi-catalog/package-lock.json ./strapi-catalog/package-lock.json
RUN --mount=type=cache,target=/root/.npm \
  apt-get update && apt-get install -y --no-install-recommends curl python3 make g++ \
  && npm install --prefix strapi-catalog --omit=dev --no-audit --fund=false --no-update-notifier --loglevel=error \
  && apt-get purge -y --auto-remove python3 make g++ \
  && rm -rf /var/lib/apt/lists/* /root/.cache

COPY --from=build /app/strapi-catalog/dist ./strapi-catalog/dist
COPY --from=build /app/strapi-catalog/src ./strapi-catalog/src
COPY --from=build /app/strapi-catalog/config ./strapi-catalog/config
COPY --from=build /app/strapi-catalog/scripts ./strapi-catalog/scripts
COPY --from=build /app/strapi-catalog/types ./strapi-catalog/types
COPY --from=build /app/strapi-catalog/public ./strapi-catalog/public
COPY --from=build /app/strapi-catalog/database ./strapi-catalog/database
COPY --from=build /app/strapi-catalog/favicon.png ./strapi-catalog/favicon.png
COPY --from=build /app/strapi-catalog/jsconfig.json ./strapi-catalog/jsconfig.json
COPY --from=build /app/strapi-catalog/tsconfig.json ./strapi-catalog/tsconfig.json
COPY --from=build /app/scripts/start-services.sh ./scripts/start-services.sh

RUN mkdir -p /app/data/documents /app/data/strapi \
  && chmod +x /app/scripts/start-services.sh

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=10 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health', r=>process.exit(r.statusCode===200?0:1)).on('error', ()=>process.exit(1))"

CMD ["/app/scripts/start-services.sh"]
