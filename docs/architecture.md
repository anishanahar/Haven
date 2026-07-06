# Haven — Architecture

> Save for your dreams, not just your balance.

This document is the system-level reference for Haven, a goal-based decentralized
savings platform built on Stellar Soroban. It covers the on-chain contract
architecture, the off-chain services that index and serve chain data, and the
client application. Read this before touching any phase of the codebase.

## 1. System Overview

Haven lets a user create multiple independent **savings goals** (e.g. "MacBook
Pro", "Emergency Fund"). Each goal is backed by its own on-chain vault holding
USDC (a Stellar Asset Contract token). Vaults accrue a simulated yield that is
funded by a shared Treasury contract. All contract state changes emit Soroban
events; a backend indexer consumes those events into Postgres so the frontend
never has to make expensive on-chain reads for lists, history, or analytics.

```
                        ┌──────────────────────────┐
                        │         Frontend          │
                        │   Next.js 14 (App Router)  │
                        │  Wallet Kit · TanStack Q.  │
                        └───────────┬───────────────┘
                                    │ REST + WebSocket
                                    ▼
                        ┌──────────────────────────┐
                        │          Backend           │
                        │  Fastify · Prisma · Redis  │
                        │  Controllers/Services/Repo  │
                        └──────┬─────────────┬──────┘
                               │             │
                     writes    │             │  reads (submits signed XDR)
                               ▼             ▼
                    ┌────────────────┐  ┌───────────────────┐
                    │  Postgres (idx) │  │  Soroban RPC (Testnet) │
                    └───────▲────────┘  └─────────┬─────────┘
                            │                       │
                            │ ingests events         │ tx / events
                    ┌───────┴────────┐              │
                    │    Indexer      │◄─────────────┘
                    │ (event listener,│
                    │  polling cursor)│
                    └────────────────┘
                                                     │
                        ┌────────────────────────────┴───────────────────┐
                        │                Soroban Contracts                 │
                        │                                                  │
                        │  GoalFactory ──deploys──► GoalVault (per goal)    │
                        │       │                        │  requests yield  │
                        │       │ registry               ▼                 │
                        │       │                    Treasury               │
                        │       │                        ▲                 │
                        │       └─ reads strategy ─► MockStrategy ─────────┘│
                        └──────────────────────────────────────────────────┘
```

Design principle: **the chain is the source of truth for balances and
ownership; Postgres is a read-optimized cache/projection.** The backend never
invents state — it only mirrors events emitted by the contracts. If the
indexer's database were wiped, it could be fully rebuilt by replaying events
from ledger 0 (or a checkpoint).

## 2. On-Chain Architecture (Soroban / Rust)

### 2.1 Contract responsibilities

| Contract | Responsibility |
|---|---|
| `goal-factory` | Registry of all goals per user. Deploys a new `goal-vault` instance (via `deployer` host function using the vault's Wasm hash) for every `create_goal` call. Tracks `user -> Vec<goal_id>` and `goal_id -> vault_address`. Emits lifecycle events. |
| `goal-vault` | One instance per goal. Holds custody of the goal's USDC via the token contract's `transfer`. Tracks target, deposited amount, deadline, strategy, paused/completed state. Computes interest on demand (never on a timer). Pulls interest from `treasury` at withdrawal/claim time. |
| `mock-strategy` | Stateless "strategy" contract returning a fixed APY (500 bps = 5%) via a `get_apy()` call. Exists so `goal-vault` depends on a `Strategy` trait/interface, not a concrete APY source — swapping in a lending/stable-pool/treasury/aggregator strategy later requires zero changes to `goal-vault`. |
| `treasury` | Holds a funded reserve of USDC used to pay simulated interest. Only contracts holding the `vault` role (verified via factory registry lookup, not a hardcoded allowlist) may request a payout, capped to the treasury's available balance. |

### 2.2 Why a factory + per-goal vault (not one shared contract)

- **Isolation**: a bug or drained balance in one goal cannot affect another
  goal's funds — each vault is its own contract instance with its own
  authorization boundary.
- **Auth simplicity**: `require_auth()` on the vault's owner is a single
  address check; no need to scope permissions inside a shared map.
- **Upgrade path**: individual vaults can, in principle, be migrated/upgraded
  independently (e.g. moving a specific goal to a new strategy) without a
  contract-wide migration.
- **Cost tradeoff (accepted)**: deploying a new Wasm instance per goal costs
  more than a map entry in a monolithic contract. For an MVP where each user
  creates a handful of goals, this is a worthwhile tradeoff for the isolation
  guarantees. The factory stores the vault's Wasm hash once and reuses it for
  every deployment (`deployer().with_current_contract(salt).deploy(wasm_hash)`),
  so redeploying an updated vault version is a single upload.

### 2.3 Strategy abstraction

`goal-vault` never computes APY itself in production terms — it calls the
configured strategy contract's `get_apy(goal_id)` and applies the linear
interest formula locally (see §2.5). `mock-strategy` always returns 500 bps.
Because the vault only depends on a fixed function signature
(`get_apy() -> u32` returning basis points), replacing it with a real lending
strategy, stable-pool strategy, treasury-managed strategy, or yield aggregator
is a matter of deploying a new contract with the same interface and updating
the `strategy_id` stored on the vault (via `set_strategy`, owner-gated) — no
redeploy of `goal-vault` itself.

### 2.4 Storage patterns

- **Instance storage** for contract-wide config (factory: vault Wasm hash,
  admin; treasury: admin, funded balance ledger; mock-strategy: fixed APY).
- **Persistent storage** for per-entity data that must survive and is billed
  per-entry with TTL bumps: goal metadata on `goal-vault`, the
  `user -> goal_ids` registry on `goal-factory`.
- **Temporary storage** is deliberately avoided for anything financial —
  balances and ownership must never expire.
- All persistent entries use explicit `extend_ttl` calls after every write so
  goals don't get archived mid-lifecycle.

### 2.5 Interest model

Interest is **never** written to storage on a schedule. It is derived purely
from `(principal, apy_bps, deposit_timestamp/last_checkpoint, now)` every time
it's read:

```
interest = principal * apy_bps * elapsed_seconds / (10_000 * SECONDS_PER_YEAR)
```

A deposit or withdrawal checkpoints `accrued_interest` and resets the elapsed
clock (see `goal-vault`'s `Position { principal, checkpoint_ts, accrued }`),
so compounding across multiple deposits stays correct without per-block
writes. `calculate_interest()` is a read-only view function; `claim()` is the
only function that actually moves funds from the Treasury.

### 2.6 Authorization

- Every state-mutating vault call (`deposit`, `withdraw`, `extend_deadline`,
  `change_target`, `claim`, `close_goal`, `pause`, `resume`) requires
  `owner.require_auth()`.
- `deposit` additionally requires the depositor's own auth for the token
  `transfer` (Soroban's token interface enforces this internally).
- Factory admin functions (updating the stored vault Wasm hash) require the
  factory admin's auth, set once at `initialize` and stored in instance
  storage.
- Treasury payouts require the caller to be a live vault address that is
  present in the factory's registry — treasury calls back into
  `goal-factory::is_registered_vault(vault_address)` rather than trusting a
  static allowlist, so newly deployed vaults are automatically eligible.

### 2.7 Events

`GoalCreated`, `GoalUpdated`, `GoalDeleted`, `DepositMade`, `Withdrawal`,
`InterestAccrued`, `GoalCompleted` — each carries the `goal_id`, `owner`
address, and the relevant amounts/timestamps as topics/data so the indexer
can filter cheaply by topic instead of decoding every event on the contract.

## 3. Off-Chain Architecture

### 3.1 Backend (Fastify + TypeScript)

Layered by responsibility, not by technical concern soup:

```
routes/        HTTP schema + wiring only (zod validation, no logic)
controllers/   Parse request → call service → shape response
services/      Business logic, orchestrates repositories + Soroban RPC calls
repositories/  Prisma queries only, no business logic
indexer/       Long-running process: polls Soroban RPC getEvents, upserts rows
jobs/          Cron: interest snapshotting for analytics, deadline reminders
websocket/     Broadcasts DB-committed changes to subscribed clients
```

Wallet authentication uses the [SEP-10](https://developers.stellar.org/docs/learn/encyclopedia/security/sep-0010)
challenge-response flow: backend issues a challenge transaction, the wallet
signs it, backend verifies the signature server-side and issues a session
JWT. No custodial key handling anywhere in the stack — the backend never
holds a user's signing key; it only ever receives already-signed XDR to
submit, or verifies signed auth challenges.

### 3.2 Indexer

A single long-running Node process (`backend/src/indexer`) that:
1. Persists a `cursor` (last processed ledger) in Postgres.
2. Polls `getEvents` on Soroban RPC from `cursor` onward, filtered to the
   four contract IDs.
3. Maps each event type to a repository upsert (idempotent — safe to
   reprocess if the cursor is rewound).
4. Publishes a Redis pub/sub message per processed event so the WebSocket
   layer can push to connected clients without polling Postgres.

### 3.3 Database

Postgres via Prisma. See `docs/database-schema.md` for the full schema and
`backend/prisma/schema.prisma` for the source of truth. Redis is used for
session storage, rate limiting, and the pub/sub bridge to WebSocket clients —
never as a durability layer.

### 3.4 Frontend (Next.js App Router)

Server components for static/SEO-relevant marketing pages; client components
for anything wallet- or wallet-state-dependent. TanStack Query owns all
server-state caching against the backend REST API and is invalidated by
WebSocket push events for real-time updates (deposit confirmations, interest
ticking, goal completion). Zod schemas are shared at the API boundary
(request/response validation on both ends) to keep frontend and backend
contracts from drifting.

## 4. Data Flow: Deposit Example

1. User submits deposit amount in the UI → frontend builds an unsigned
   Soroban transaction invoking `goal-vault::deposit` via Wallet Kit.
2. Wallet signs client-side; frontend submits signed XDR to backend
   `POST /deposit`, which forwards it to Soroban RPC (backend never signs).
3. Contract executes: transfers USDC from user to vault, checkpoints
   position, emits `DepositMade`.
4. Indexer picks up the event on its next poll, upserts a `transactions` row
   and updates the cached `goals.deposited_amount`.
5. Redis pub/sub notifies the WebSocket layer → connected client for that
   user receives a push → TanStack Query cache is patched optimistically and
   then reconciled with the confirmed row.

## 5. Security Model Summary

- No private keys ever touch the backend or database.
- All fund-moving contract calls require on-chain `require_auth()` from the
  goal owner; the backend's role is relay + index, never authorization.
- Treasury payouts are capped by both the vault's computed entitlement and
  the treasury's actual balance (checked, not assumed).
- All arithmetic uses checked operations (`checked_add`/`checked_mul` /
  Soroban's panic-on-overflow `i128` math) — see `contracts/common` for
  shared safe-math helpers used by every contract.
- Full threat model and per-function invariants are enumerated in
  `docs/contracts.md` (added in Phase 3) alongside the test suite.

## 6. Replacing MockStrategy (forward-looking)

To swap in a real strategy post-MVP:
1. Deploy a new contract implementing the same `get_apy() -> u32` interface
   (see `contracts/common::StrategyClient`).
2. Fund/connect it to its real yield source (lending pool, stable AMM, etc).
3. Call `goal_vault.set_strategy(new_strategy_address)` as the goal owner (or
   `goal_factory` batch-migration tooling, future work).
4. No redeploy of `goal-vault` or `goal-factory` Wasm is required.

## 7. Phased Delivery

This repository is built in the phases below; each phase's completion is
gated on the previous phase compiling/testing green.

1. Architecture (this document)
2. Folder structure
3. Smart contracts (Rust/Soroban) + unit tests
4. Backend (Fastify/TS)
5. Database (Prisma/Postgres)
6. Frontend components
7. Pages
8. Wallet integration
9. Indexer
10. Analytics
11. Testing
12. Deployment
