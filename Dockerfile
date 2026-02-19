# ---------- build stage ----------
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_* подставляются в бандл на этапе сборки; передавать через --build-arg в CI
ARG VITE_YANDEX_MAPS_API_KEY
ENV VITE_YANDEX_MAPS_API_KEY=${VITE_YANDEX_MAPS_API_KEY}
RUN npm run build


# ---------- runtime stage ----------
FROM node:22-slim
WORKDIR /app

# (опционально, но полезно для health/debug)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=3000

# ставим только прод-зависимости
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# код сервера + собранный фронт из build stage
COPY --from=build /app/server.cjs ./
COPY --from=build /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=10 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3000)+'/health', r=>process.exit(r.statusCode===200?0:1)).on('error', ()=>process.exit(1))"

CMD ["node", "server.cjs"]
