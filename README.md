# Nest - Decentralized Savings Platform

> Save for your dreams, not just your balance.

Nest is a full-stack, goal-based decentralized savings platform on Stellar Soroban. Users create named savings goals (e.g., a laptop, college fees, a house down payment), each backed by its own isolated on-chain vault contract that accrues transparent, on-chain interest.

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Installation Guide](#installation-guide)
- [Environment Variables](#environment-variables)
- [Smart Contract Deployment Guide](#smart-contract-deployment-guide)
- [Event Streaming Architecture](#event-streaming-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Testing Instructions](#testing-instructions)
- [CI/CD Pipeline Documentation](#cicd-pipeline-documentation)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Demo Walkthrough](#demo-walkthrough)
- [Screenshots](#screenshots)

## Project Overview
Nest reinvents savings by connecting user aspirations directly to yield-bearing decentralized instruments. Unlike traditional banks where yield is opaque, Nest deploys a separate Soroban vault per goal, allowing granular tracking of accrued interest drawn from a protocol-level Treasury.

## Features
- **Goal-Based Vaults**: Individual smart contracts for every user goal.
- **On-Chain Interest**: Transparent APY distribution managed by a Strategy contract and funded via a protocol Treasury.
- **Real-Time Updates**: Instant UI reflection of on-chain state changes via WebSocket streaming.
- **Prepare/Submit Workflow**: Secure transaction signing avoiding premature on-chain failures.
- **Mobile Responsive Dashboard**: Beautiful Next.js UI using Tailwind CSS and Radix primitives.
- **Gamified Achievements**: Automated milestone tracking for savings consistency.

## Architecture
Nest comprises three main layers:
1. **Soroban Smart Contracts**: Rust-based contracts (`goal-factory`, `goal-vault`, `treasury`, `mock-strategy`).
2. **Backend Services**: Node/Fastify API, Postgres DB, and an on-chain event indexer.
3. **Frontend Dashboard**: Next.js 16 App Router application.

For deep dives, see [`docs/architecture.md`](docs/architecture.md).

## Technology Stack
- **Smart Contracts**: Rust, Stellar Soroban
- **Backend**: Node.js, Fastify, TypeScript, Prisma, PostgreSQL, Redis
- **Frontend**: React, Next.js 16, Tailwind CSS, Playwright, Zustand
- **CI/CD**: GitHub Actions, Docker Compose

## Installation Guide
### Prerequisites
- Node.js >= 22
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
Detailed documentation is found in [`docs/environment-variables.md`](docs/environment-variables.md). Ensure `SOROBAN_RPC_URL` and Contract IDs are aligned across backend and frontend.

## Smart Contract Deployment Guide
Deploy to the Stellar Testnet using the automated script:
```bash
./scripts/deploy-contracts.sh
```
This deploys the `NUSD` token, Vault Wasm, Strategy, Treasury, and Factory, linking them securely. Copy the output IDs to your `.env` files.

## Event Streaming Architecture
The Nest Backend runs a specialized **Indexer** that listens for Soroban events (e.g., `Deposit`, `Withdraw`, `GoalCreated`). These events are parsed, stored in Postgres via Prisma, and broadcast to the Next.js frontend via WebSocket.
The frontend uses a unified `WebSocketProvider` to automatically invalidate React Query caches, ensuring the user sees updated balances instantly without manual refreshes.

## Frontend Architecture
Built on Next.js 16 App Router, the frontend leverages Server Components for SEO and initial load speed, combined with Client Components for heavy interactivity. 
- State management: `zustand`
- Data fetching: `@tanstack/react-query`
- Styling: Tailwind CSS & `shadcn/ui`

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
  - `backend`: Sets up Node 22, generates Prisma client, runs typechecks & vitest.
  - `frontend`: Installs Playwright, runs ESLint, typecheck, e2e tests, and verifies production build.

## Deployment Guide
For production deployment strategies (Docker, Vercel, Railway), refer to [`docs/deployment.md`](docs/deployment.md). The project includes a complete `docker-compose.yml` for unified backend deployment.

## Troubleshooting Guide
- **Transaction Fails with `ExistingValue`**: Ensure you are using a fresh deployer account or the script is configured to idempotently skip existing assets.
- **WebSocket Disconnects**: Verify Redis is running locally, as Fastify relies on Redis pub/sub for scaling WS connections.
- **Prisma Errors**: Ensure `DATABASE_URL` is correct and `pnpm prisma:migrate` has been run.

## Demo Walkthrough
1. Connect Wallet (e.g., Freighter) on Testnet.
2. Click "Create Goal" (e.g., "New Laptop" for $2,000).
3. Sign the transaction. The goal appears instantly on the dashboard via WS.
4. Click "Deposit", approve the asset transfer, and watch the progress bar animate.
5. Time-skip (if in dev mode) or wait for interest accrual and click "Withdraw".

## Screenshots
*(Add path to images here once deployed)*
- `![Dashboard](public/dashboard-screenshot.png)`
- `![Create Goal](public/create-goal.png)`
