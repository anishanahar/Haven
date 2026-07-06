# syntax=docker/dockerfile:1

FROM node:22-slim AS base
WORKDIR /app
# Prisma's query engine needs a real OpenSSL present, or it silently
# guesses wrong at runtime (see the "failed to detect libssl" warning this
# fixes) on the "slim" Debian base.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* .npmrc* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm prisma:generate
RUN pnpm build

# One full install (deps stage) is reused as-is here rather than a second,
# separate `--prod` install: pnpm's content-addressable store havens the
# generated Prisma client under node_modules/.pnpm/..., not the flat
# node_modules/.prisma path a second bare install would produce without the
# schema present to regenerate against. Copying the already-correct
# node_modules straight from `build` is simpler and correct; the tradeoff is
# devDependencies ship in the image too.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

EXPOSE 4000
CMD ["node", "dist/server.js"]
