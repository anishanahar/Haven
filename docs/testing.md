# Nest — Testing Guide

Three independent test suites, one per layer. None of them are placeholders —
each exercises real logic (contract state transitions, HTTP handlers, and
rendered UI) rather than asserting trivial truths.

## Contracts (Rust / Soroban)

```bash
cd contracts
../scripts/build-contracts.sh   # must run first — see note below
cargo test --workspace          # 47 tests
cargo clippy --workspace --all-targets
```

**Build order matters.** `goal-factory`'s tests dynamically deploy a real
`goal-vault` Wasm binary (via `contractimport!`) to exercise the factory's
deployer logic end-to-end, so `goal-vault` must already be built to
`wasm32v1-none` before `cargo test` runs on the workspace. The build script
handles this ordering; running `cargo test` directly without it first will
fail with a missing-file error pointing at
`target/wasm32v1-none/release/goal_vault.wasm`.

Coverage: goal creation, deposits, withdrawals, linear interest accrual
(checked at 6-month and 1-year marks against the exact formula), unauthorized
access (`#[should_panic]` on a missing signature), deadline/expiry handling,
target-reached completion, pause/resume freezing accrual, treasury payouts
(including capping at available balance and rejecting unregistered
callers), factory registry uniqueness, and multi-goal/multi-user scenarios.
See `docs/contracts.md` for the full invariants checklist each test backs.

## Backend (Vitest)

```bash
cd backend
pnpm test
```

Current suite covers the pure-function layer: `toStroops`/`fromStroops`
(amount conversion, including truncation and negative values),
`linearInterest` (mirrors the contract formula bit-for-bit), and
`planGoal` (the deterministic goal planner — target reached, past dates
rejected, longer horizon lowers required contribution).

**What's deliberately not covered by automated tests today:** the
service/repository layer that talks to Postgres and Soroban RPC. That layer
was instead verified by hand against the real testnet deployment (see
`docs/api.md` and the session's manual walkthrough: SEP-10 challenge →
verify → create goal → deposit → withdraw, all confirmed on-chain and
reflected in Postgres). Adding integration tests against a real (or
testcontainers) Postgres instance and a mocked Soroban RPC client is the
natural next step — track it in `docs/roadmap.md`.

## Frontend (Playwright)

```bash
cd frontend
pnpm exec playwright install chromium   # first run only
pnpm test:e2e
```

`playwright.config.ts` boots a production build (`pnpm build && pnpm start`)
and runs against it. Suites:

- **`landing.spec.ts`** — hero/nav/CTA render with zero console errors;
  anchor-link navigation scrolls to the right section.
- **`auth-gate.spec.ts`** — unauthenticated visitors see the wallet-connect
  gate on every `/dashboard/*` route, never dashboard content.
- **`dashboard.spec.ts`** — authenticated flows with the backend mocked via
  `page.route()` (scoped to the backend's origin, `http://localhost:4000/*`
  — routes must be origin-scoped, not `**/path*`, or they'll also intercept
  the Next.js page navigation itself and replace the whole page with the
  mock JSON; this bit us once during development, see the git history for
  the fix): overview stats render, goal detail shows action buttons,
  analytics renders charts/predictions, sidebar navigation moves between
  sections.

These are UI-rendering smoke tests, not full on-chain e2e tests — driving an
actual browser wallet extension (Freighter) from a headless test runner is
out of scope for now. The full signed-transaction path (prepare → sign →
submit → confirm) was verified manually end-to-end against Stellar Testnet
during development.

## Running everything

```bash
# from the repo root
(cd contracts && ../scripts/build-contracts.sh && cargo test --workspace)
(cd backend && pnpm test && pnpm typecheck)
(cd frontend && pnpm typecheck && pnpm lint && pnpm test:e2e)
```

This is exactly what `.github/workflows/ci.yml` runs on every push/PR.
