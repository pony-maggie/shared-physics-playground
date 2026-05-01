FROM node:22-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package-lock.json ./apps/server/
COPY apps/web/package.json apps/web/package-lock.json ./apps/web/
COPY packages ./packages

RUN npm install
RUN cd apps/server && npm ci
RUN cd apps/web && npm ci

FROM deps AS build

COPY tsconfig.base.json vitest.config.ts ./
COPY apps ./apps
COPY config/playground-access.example.json ./config/playground-access.example.json

RUN cd apps/web && npm run build
RUN cd apps/server && npm run build

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
COPY --from=build /app/config/playground-access.example.json ./config/playground-access.example.json

EXPOSE 2567 4173
