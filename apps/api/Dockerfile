# Same Debian/Node ABI in build and runtime for better-sqlite3 and argon2.
FROM node:26.13.0-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install --global pnpm@12.15.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @uni/shared build && pnpm --filter api build \
    && pnpm --filter api deploy --prod --legacy /opt/api

FROM node:26.13.0-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends util-linux ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production APP_HOST=0.0.0.0 APP_PORT=3000 DATABASE_URL=/data/university.sqlite BACKUP_DIRECTORY=/backups
COPY --from=build --chown=node:node /opt/api ./
COPY infra/scripts/api-entrypoint.sh /usr/local/bin/university-api
RUN chmod 755 /usr/local/bin/university-api
USER node
EXPOSE 3000
ENTRYPOINT ["university-api"]
CMD ["node", "dist/main.js"]
