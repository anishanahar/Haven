# syntax=docker/dockerfile:1

FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* .npmrc* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# NEXT_PUBLIC_* variables are inlined into the client bundle at build time,
# so they have to be real ENV (not just ARG) before `pnpm build` runs.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_STELLAR_NETWORK
ARG NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE
ARG NEXT_PUBLIC_HORIZON_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXT_PUBLIC_STELLAR_NETWORK=$NEXT_PUBLIC_STELLAR_NETWORK \
    NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=$NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE \
    NEXT_PUBLIC_HORIZON_URL=$NEXT_PUBLIC_HORIZON_URL
RUN pnpm build

FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
