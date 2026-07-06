# Haven — Deployment Guide

## Contracts (Stellar Testnet)

Deployed via `scripts/deploy-contracts.sh` (wraps the `stellar` CLI). Current
testnet deployment:

| Contract | Address |
|---|---|
| `NUSD` token (demo USDC-equivalent, Stellar Asset Contract) | `CAY52FQXHECKJHLF6T7LH5ZP7PVNIIQ6XLTTZZ2EPXR6G3GYI4F3IVAF` |
| `mock-strategy` | `CAKT45ZBNSCNVHCIZDEJV3SAXTVYVR72PKQOT4D756H3ZMPBXWJNWR6N` |
| `treasury` | `CDIBRKKEDNVIDXXHWFSESLSQTLS7AFCACZACZUPHF2OT4BTRDDPMW2JC` |
| `goal-factory` | `CCY576KKLDZEUJTQ7HXU25KPS553BNFD3LFQ6KMAFYRWIWCLMGUFFWM2` |
| `goal-vault` Wasm hash (used by the factory's deployer) | `b169e251f65420b33dbb0e6cee5ea91454e8ad897c64fd2440b01498e2fe50ec` |
| Deployer / admin account | `GAL3BVPCLBRPUWFQMMANW6B2YOGBHC6OT3BD3EYE2PQSFEQZARUQWX5M` |

The treasury has been funded with 100,000 NUSD so `claim()` calls have a
real reserve to pay out against. The `NUSD` asset's issuing account is the
deployer, so the deployer can mint more at any time with:

```bash
stellar contract invoke --id <TOKEN> --source haven-deployer --network testnet \
  -- transfer --from <DEPLOYER_ADDRESS> --to <RECIPIENT> --amount <STROOPS>
```

(A payment *from* the issuing account of a classic Stellar asset is treated
as issuance — this is why `treasury::fund` and the "mint to a test wallet"
step above both work as ordinary `transfer` calls with the issuer as
source, with no separate `mint` entrypoint needed for a classic-asset-backed
SAC.)

### Redeploying

```bash
NETWORK=testnet DEPLOYER=haven-deployer ASSET_CODE=NUSD ./scripts/deploy-contracts.sh
```

This always creates **fresh** contract instances (Soroban contract addresses
are deterministic per deploy transaction, not per source file) — it does not
upgrade the existing deployment in place. After it completes, copy the
printed addresses into `backend/.env`.

### A pitfall worth documenting

Earlier in this build, `goal-factory` depended directly on the `goal-vault`
crate to reuse its generated `GoalVaultClient` for the two calls the factory
makes into a freshly deployed vault (`initialize`, `close_goal`,
`update_metadata`). That silently links `goal-vault`'s entire
`#[contractimpl]` block into `goal-factory`'s own Wasm — both crates export a
function named `initialize` with different signatures, which collide at the
contract-spec level and made every `goal-factory::initialize` call fail with
`"trying to invoke non-existent contract function"` once actually deployed
(the collision doesn't reliably surface in unit tests, only against a real
deployed binary). The fix: never depend on another contract's crate directly
to get its client type. Define a narrow `#[contractclient]` trait with just
the functions you call (see `goal-factory/src/lib.rs`'s local `VaultClient`,
mirroring the pattern already used for `StrategyClient`/`TreasuryClient`/
`FactoryClient` in `haven-common`). This is also why `goal-factory`'s test
suite imports the compiled vault Wasm via `contractimport!` instead of the
crate — that path never risks linking foreign contract entry points in.

## Backend

### Local (no Docker)

```bash
cd backend
pnpm install
pnpm prisma:migrate   # applies migrations to DATABASE_URL
pnpm dev              # Fastify API on :4000
pnpm indexer          # separate process: polls Soroban RPC, writes to Postgres
pnpm jobs             # separate process: daily analytics snapshot + deadline reminders
```

Environment variables are documented in `docs/environment-variables.md` and
inline in `backend/.env.example`.

### A pitfall worth documenting (backend build)

`pnpm dev` (via `tsx`) resolves the `@/*` path aliases used throughout
`backend/src` live, so it never surfaces a real problem: `tsc` does **not**
rewrite those aliases into relative imports — it only type-checks against
them. A plain `tsc` production build compiles cleanly, but the emitted
`dist/server.js` still contains `import ... from "@/app.js"`, which plain
Node can't resolve at all, so the container crashes on boot with
`ERR_MODULE_NOT_FOUND`. This only shows up once you actually run the
compiled output (`node dist/server.js` or a real container) — `pnpm dev`,
`pnpm typecheck`, and `pnpm test` all stay green regardless, which is why it
first surfaced during Docker image verification rather than earlier. Fixed
by adding `tsc-alias` as a second build step (`"build": "tsc -p
tsconfig.json && tsc-alias -p tsconfig.json"`), which rewrites the aliases
to relative paths in the compiled JS afterward. If you add a new path alias
to `tsconfig.json`, no extra config is needed — `tsc-alias` reads the same
`paths` map — but always sanity-check by actually running
`node dist/server.js` (or the Docker image) after a build, not just `tsc
--noEmit`, since that's the only thing that would have caught this.

### Another pitfall: unpinned pnpm version inside the image

Both `backend/Dockerfile` and `frontend/Dockerfile` run `corepack enable`
with no `packageManager` field originally pinned in `package.json` —
Corepack then fetched *whatever pnpm is latest* (11.9.0 at the time of this
build) instead of the 10.18.3 this project was developed and tested
against. pnpm 11 changed defaults twice over in ways that broke a `--prod`
install inside the image: it now blocks packages published very recently
(`minimumReleaseAge`, default 1 day) and blocks any dependency's
`postinstall`/`preinstall` script (`onlyBuiltDependencies`) unless
explicitly allow-listed — both silently absent in pnpm 10. Both projects
now pin `"packageManager": "pnpm@10.18.3"` in `package.json` (Corepack reads
this automatically) and `pnpm-workspace.yaml` explicitly sets
`minimumReleaseAge: 0` and lists the `onlyBuiltDependencies` Prisma/esbuild
need. **The lesson generalizes beyond this one version bump**: never let a
Docker base image's package-manager version float — pin it, or a
"latest pnpm/npm/yarn" bump upstream can break a build with zero code
changes on your side, and the failure will look nothing like the actual
cause.

### Docker Compose (full local stack)

```bash
docker compose up -d postgres redis
cd backend && pnpm prisma:deploy   # run migrations against the containerized Postgres once
cd .. && docker compose up -d --build
```

`docker-compose.yml` at the repo root runs Postgres, Redis, the API, the
indexer, and the cron jobs process — the latter three all build from the
same `backend/Dockerfile` image and differ only in their `command` (one
image, three processes: `dist/server.js`, `dist/indexer/index.js`,
`dist/jobs/index.js`). Run migrations from the host once before first start;
the production image intentionally excludes the `prisma` CLI (a
devDependency) to keep the runtime image lean, so `prisma migrate deploy`
isn't runnable *inside* the container as shipped.

### Hosting a real environment (Railway / Fly / Render)

Any container host works since the backend is a single stateless Fastify
process plus two worker processes reading the same Postgres/Redis. Point
`DATABASE_URL`/`REDIS_URL` at managed instances, set the contract addresses
and `SEP10_SERVER_SECRET`/`JWT_SECRET` as secrets (never in the image), and
run `prisma migrate deploy` as a release step before the API process starts.

## Frontend

### Local (no Docker)

```bash
cd frontend
pnpm install
pnpm dev   # Next.js on :3000
```

### Docker

```bash
docker build -t haven-frontend ./frontend \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com \
  --build-arg NEXT_PUBLIC_WS_URL=wss://api.example.com/ws
docker run -p 3000:3000 haven-frontend
```

`NEXT_PUBLIC_*` variables are inlined into the client bundle at **build**
time (see `frontend/Dockerfile`) — they can't be swapped at container start
the way a backend's env vars can. Building one image per target environment
(or building at deploy time in CI) is the tradeoff that comes with static
inlining; there's no way around it without moving those values to a runtime
config-fetch, which isn't worth the complexity here.

### Vercel

The frontend is a stock Next.js App Router project — deploying to Vercel
needs no special configuration beyond setting the `NEXT_PUBLIC_*` variables
in the project's environment settings. `output: "standalone"` in
`next.config.ts` is only exercised by the Docker path; Vercel ignores it and
uses its own build output.

## CI

`.github/workflows/ci.yml` runs three independent jobs on every push and PR:
contracts (`cargo test` + `clippy`, using the same build-order dependency as
local dev), backend (`prisma generate` + `tsc` + `vitest`), and frontend
(`tsc` + `eslint` + Playwright e2e + production build). See
`docs/testing.md` for what each suite actually covers.

## Production contract deployment checklist (not yet done)

The current deployment is testnet-only, single-admin-key. Before a mainnet
deployment:

- [ ] Replace the single-key admin (`haven-deployer`) with a multisig or a
      timelocked upgrade path for `set_vault_wasm_hash` / strategy swaps.
- [ ] Replace `mock-strategy` with a real yield source (see
      `docs/architecture.md` §6 for the swap mechanism — no `goal-vault`
      changes required).
- [ ] Fund the treasury from a real reserve with a documented replenishment
      policy, not an ad-hoc `transfer` from a demo issuer.
- [ ] Point `USDC_TOKEN_CONTRACT_ID` at the real Circle-issued USDC Stellar
      Asset Contract instead of the demo `NUSD` asset.
- [ ] Security review of the contracts beyond the invariants checklist in
      `docs/contracts.md` (a from-scratch build's own tests are necessary
      but not sufficient before real funds are at stake).
