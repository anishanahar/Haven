# Haven - Decentralized Savings Platform

> Save for your dreams, not just your balance.

Haven is a full-stack, goal-based decentralized savings platform built on Stellar Soroban. Users create named savings goals (e.g., a laptop, college fees, a house down payment), each backed by its own isolated on-chain vault contract that accrues transparent, on-chain interest.

## Links

| Resource | Link |
|----------|------|
| 🚀 Live Demo | https://havenstellar.vercel.app |
| 🎥 Demo Video | https://youtu.be/3aFvuG2WHz0 |

## Deployed Contracts (Testnet)

| Contract | Address | Explorer Link |
|----------|---------|---------------|
| Token (NUSD) | `CBESJ5W7CBME5HGMEHOBWSYE2L3AWZHZI2OK4W7BWU3K5YPB5LVVWHUB` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBESJ5W7CBME5HGMEHOBWSYE2L3AWZHZI2OK4W7BWU3K5YPB5LVVWHUB) |
| Strategy | `CCZDR3Z5CIS4NAZWVFKRRFX76HKGETL6SIVBX6JUZACASM6T6PXUPPVQ` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCZDR3Z5CIS4NAZWVFKRRFX76HKGETL6SIVBX6JUZACASM6T6PXUPPVQ) |
| Treasury | `CB4NCVRUREERK5CG4KNJU7B3AYHH2LIBGCSCGF4F2V5QDY6BC5IR3U6M` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CB4NCVRUREERK5CG4KNJU7B3AYHH2LIBGCSCGF4F2V5QDY6BC5IR3U6M) |
| Goal Factory | `CCY2ORSSP5H2CWFBINFLYBMWLOWL4RT4C4DTNZYQQG7BWAX5Q7DK5DAL` | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCY2ORSSP5H2CWFBINFLYBMWLOWL4RT4C4DTNZYQQG7BWAX5Q7DK5DAL) |

## Project Overview
Haven reinvents savings by connecting user aspirations directly to yield-bearing decentralized instruments. Unlike traditional banks where yield is opaque, Haven deploys a separate Soroban vault per goal, allowing granular tracking of accrued interest drawn from a protocol-level Treasury.

## Features
- **Goal-Based Vaults**: Individual smart contracts for every user goal.
- **On-Chain Interest**: Transparent APY distribution managed by a Strategy contract and funded via a protocol Treasury.
- **Real-Time Updates**: Instant UI reflection of on-chain state changes via Fastify WebSocket streaming.
- **Wallet Integration**: Seamless connection using `@creit.tech/stellar-wallets-kit` (Freighter, etc.).
- **Mobile Responsive Dashboard**: Beautiful Next.js UI using Tailwind CSS v4, Framer Motion, and Base UI.
- **Gamified Achievements**: Automated milestone tracking, points, and user levels for savings consistency.

### 🔍 Wallet Integration Evidence (For Reviewers)
Wallet connection and transaction signing is fully integrated into the frontend application. 
The core implementation using `@creit.tech/stellar-wallets-kit` can be found in:
**[`frontend/src/lib/wallet-kit.ts`](frontend/src/lib/wallet-kit.ts)**

It supports **Freighter**, **xBull**, **Lobstr**, **Rabet**, and **Albedo** wallets.

## Architecture
Haven comprises three main layers:
1. **Soroban Smart Contracts**: Rust-based contracts (`goal-factory`, `goal-vault`, `treasury`, `mock-strategy`).
2. **Backend Services**: Node/Fastify API, Postgres DB, Redis for pub/sub, and an on-chain event indexer.
3. **Frontend Dashboard**: Next.js 16 App Router application.

## CI?CD Pipelines

<img width="1454" height="830" alt="Screenshot 2026-07-06 at 1 01 48 PM" src="https://github.com/user-attachments/assets/582a8263-7b9d-4c9e-9534-8250052a9535" />

## Mobile Responsive

<img width="354" height="686" alt="Screenshot 2026-07-06 at 1 03 51 PM" src="https://github.com/user-attachments/assets/17ed39e6-8894-4c07-877e-424cc089a2da" />

## Technology Stack
- **Smart Contracts**: Rust, Stellar Soroban, Stellar SDK v16
- **Backend**: Node.js (>= 20), Fastify v5, TypeScript, Prisma v6, PostgreSQL, Redis
- **Frontend**: React 19, Next.js 16, Tailwind CSS v4, Zustand, React Query, Playwright for E2E
- **CI/CD**: GitHub Actions, Docker Compose

## Installation Guide
### Prerequisites
- Node.js >= 20
- pnpm
- Rust toolchain (`wasm32-unknown-unknown` target)
- Stellar CLI

### Setup
```bash
# 1. Contracts
./scripts/build-contracts.sh

# 2. Backend
cd backend
cp .env.example .env
pnpm install
pnpm prisma:migrate
pnpm dev

# 3. Frontend
cd ../frontend
cp .env.example .env.local
pnpm install
pnpm dev
```

## Environment Variables
Ensure `SOROBAN_RPC_URL` and Contract IDs are aligned across backend and frontend.

## Smart Contract Deployment Guide
Deploy to the Stellar Testnet using the automated script:
```bash
./scripts/deploy-contracts.sh
```
This deploys the `NUSD` token, Vault Wasm, Strategy, Treasury, and Factory, linking them securely. Copy the output IDs to your `.env` files.

## Event Streaming Architecture
The Haven Backend runs a specialized **Indexer** that listens for Soroban events (e.g., `Deposit`, `Withdraw`, `GoalCreated`). These events are parsed, stored in Postgres via Prisma, and broadcast to the Next.js frontend via WebSocket. The frontend uses a unified `WebSocketProvider` to automatically invalidate React Query caches, ensuring instant updates.

## Frontend Architecture
Built on Next.js 16 App Router, the frontend leverages Server Components for SEO and initial load speed, combined with Client Components for interactivity.
- State management: `zustand`
- Data fetching: `@tanstack/react-query`
- Styling: Tailwind CSS v4
- E2E Testing: Playwright

## Testing Instructions
```bash
# Contracts (Rust)
cd contracts && cargo test --workspace

# Backend (Vitest)
cd backend && pnpm test

# Frontend (Playwright e2e)
cd frontend && pnpm test:e2e
```

## CI/CD Pipeline Documentation
A complete GitHub Actions pipeline is defined in `.github/workflows/ci.yml`.
- **Triggers**: On push to `main` and Pull Requests.
- **Jobs**:
  - `contracts`: Installs Rust, compiles Wasm, runs cargo test & clippy.
  - `backend`: Sets up Node, generates Prisma client, runs typechecks & vitest.
  - `frontend`: Installs Playwright, runs ESLint, typecheck, e2e tests, and verifies production build.

## Deployment Guide
The project includes a complete `docker-compose.yml` for unified backend and database deployment. Frontend can be deployed directly to Vercel.
