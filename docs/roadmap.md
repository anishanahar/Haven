# Nest — Roadmap

## Shipped

- Contracts: `goal-factory`, `goal-vault`, `treasury`, `mock-strategy` —
  deployed to Stellar Testnet, 47 passing tests, events, auth, overflow
  checks (see `docs/contracts.md`).
- Backend: Fastify API, SEP-10 wallet auth, Prisma/Postgres, event indexer,
  cron jobs, deterministic goal planner and analytics (see `docs/api.md`).
- Frontend: landing page, dashboard, 8-step create-goal wizard, goal detail
  (deposit/withdraw/claim/pause/edit/close), transactions, analytics,
  settings — all verified against the live testnet deployment.
- CI (contracts + backend + frontend), Playwright e2e smoke tests, Docker
  images and Compose for local orchestration.

## Not yet built

- **Gamification** — achievements/badges (first deposit, $100 saved,
  goal completed, 100-day streak), confetti moments, progress levels.
  Deferred by explicit user choice in favor of testing/deployment; the
  `analytics_snapshots` and `goal_history` tables already capture the raw
  data an achievements engine would key off of.
- **Deeper backend test coverage** — the service/repository layer that talks
  to Postgres and Soroban RPC is currently verified by hand against real
  testnet transactions, not by automated integration tests. A testcontainers
  Postgres + mocked Soroban RPC client would close this gap.
- **Real wallet e2e coverage** — the Playwright suite mocks the backend and
  never drives an actual Freighter/xBull browser extension; the signed-
  transaction path is verified manually, not in CI.
- **Notification delivery beyond in-app** — `notifications` table and bell
  UI exist; there's no email/push channel.
- **Multi-currency display** — `Settings` has a currency selector UI but the
  backend doesn't yet convert amounts (everything is USDC-denominated).

## Path to mainnet

See the "Production contract deployment checklist" in `docs/deployment.md`
— multisig admin, a real yield strategy behind the `StrategyClient`
interface, real USDC, and a security review are all outstanding before any
real funds should touch these contracts.

## Architectural headroom already built in

These aren't "todo" items — they're already possible without further
contract changes, by design:

- **Swapping `mock-strategy`** for a lending/stable-pool/treasury/aggregator
  strategy: deploy a contract implementing `get_apy() -> u32` and call
  `set_vault_wasm_hash`/`set_strategy` — `goal-vault` never changes.
- **Upgrading the vault Wasm** for new goals without touching existing ones:
  `goal-factory::set_vault_wasm_hash` (admin-gated).
- **Rebuilding the entire Postgres projection from ledger 0**: the indexer
  treats Postgres as a disposable cache of on-chain events, not a source of
  truth (see `docs/architecture.md`).
