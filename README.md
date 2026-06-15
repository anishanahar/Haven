# Nest

> Save for your dreams, not just your balance.

Nest is a goal-based decentralized savings platform on Stellar Soroban. Users
create named savings goals (a laptop, college fees, a house down payment...),
each backed by its own isolated on-chain vault contract that accrues
transparent, on-chain interest.

This repository is a full-stack monorepo: Soroban smart contracts, a
Fastify/Postgres backend with an on-chain event indexer, and a Next.js
frontend — currently deployed and running end-to-end against **Stellar
Testnet**.

## Repository layout

```
contracts/   Rust/Soroban smart contracts (goal-factory, goal-vault, treasury, mock-strategy)
backend/     Fastify + TypeScript API, Prisma/Postgres, Soroban event indexer, cron jobs
frontend/    Next.js 16 App Router dashboard + landing page
scripts/     Contract build/deploy scripts
docs/        Architecture, contract reference, API reference, deployment, testing, roadmap
```

## Quick start

```bash
# 1. Contracts (requires the stellar CLI + Rust toolchain)
./scripts/build-contracts.sh
cd contracts && cargo test --workspace && cd ..

# 2. Backend
cd backend
cp .env.example .env   # fill in contract addresses — see docs/deployment.md
pnpm install
pnpm prisma:migrate
pnpm dev        # API on :4000
pnpm indexer    # separate terminal
pnpm jobs       # separate terminal

# 3. Frontend
cd ../frontend
cp .env.example .env.local
pnpm install
pnpm dev        # http://localhost:3000
```

Or run the backend + Postgres + Redis via Docker Compose — see
`docs/deployment.md`.

## Documentation

| Doc | What's in it |
|---|---|
| [`docs/architecture.md`](docs/architecture.md) | System design, why a factory + per-goal vault, interest model, data flow |
| [`docs/contracts.md`](docs/contracts.md) | Per-contract function reference, event schema, threat model |
| [`docs/api.md`](docs/api.md) | REST endpoints, the prepare/submit signing pattern, WebSocket events |
| [`docs/environment-variables.md`](docs/environment-variables.md) | Every env var, backend and frontend |
| [`docs/testing.md`](docs/testing.md) | How to run all three test suites |
| [`docs/deployment.md`](docs/deployment.md) | Local, Docker, and hosted deployment; current testnet addresses |
| [`docs/roadmap.md`](docs/roadmap.md) | What's shipped, what's deliberately deferred, path to mainnet |

## Current testnet deployment

See `docs/deployment.md` for live contract addresses. Treasury is funded
with demo `NUSD` (a Stellar Asset Contract standing in for USDC) so
interest claims have a real reserve to draw from.

## Status

Contracts, backend, indexer, and frontend are built and verified end-to-end
against the live testnet deployment (real signed transactions: create goal
→ deposit → withdraw, confirmed on-chain and reflected in the dashboard).
Gamification/achievements and deeper automated integration-test coverage are
the two largest deliberately-deferred items — see `docs/roadmap.md`.
