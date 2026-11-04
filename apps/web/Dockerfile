FROM node:24.15.0-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@12.15.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --filter web...
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @uni/shared build && pnpm --filter web build

FROM caddy:2.11.7-alpine AS runtime
# Static web uses 8080: remove the upstream privileged-port file capability.
RUN setcap -r /usr/bin/caddy
ENV XDG_CONFIG_HOME=/tmp/config XDG_DATA_HOME=/tmp/data
COPY infra/Web.Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv
USER 1000:1000
EXPOSE 8080
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
