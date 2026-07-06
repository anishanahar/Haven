# Haven — Environment Variables Reference

## Backend (`backend/.env`, see `backend/.env.example`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✓ | Postgres connection string |
| `REDIS_URL` | ✓ | Redis connection string (sessions, rate limiting, WS pub/sub) |
| `PORT` | | HTTP port (default `4000`) |
| `HOST` | | Bind host (default `0.0.0.0`) |
| `NODE_ENV` | | `development` \| `test` \| `production` |
| `LOG_LEVEL` | | pino level (default `info`) |
| `CORS_ORIGIN` | ✓ | Frontend origin allowed to call the API |
| `JWT_SECRET` | ✓ | Session token signing secret — long, random, rotate for prod |
| `JWT_EXPIRES_IN` | | Session lifetime (default `7d`) |
| `SEP10_CHALLENGE_TTL_SECONDS` | | Challenge validity window (default `300`) |
| `STELLAR_NETWORK` | ✓ | `TESTNET` \| `PUBLIC` \| `FUTURENET` |
| `SOROBAN_RPC_URL` | ✓ | Soroban RPC endpoint |
| `HORIZON_URL` | ✓ | Horizon endpoint (classic ops, e.g. trustlines) |
| `STELLAR_NETWORK_PASSPHRASE` | ✓ | Must match `STELLAR_NETWORK` |
| `SEP10_SERVER_SECRET` | ✓ | Dedicated Stellar keypair for signing auth challenges — **holds no funds, never used for anything else** |
| `HOME_DOMAIN` / `WEB_AUTH_DOMAIN` | ✓ | SEP-10 domain fields (frontend origin / API origin, no scheme) |
| `GOAL_FACTORY_CONTRACT_ID` | ✓ | Deployed `goal-factory` contract address |
| `TREASURY_CONTRACT_ID` | ✓ | Deployed `treasury` contract address |
| `MOCK_STRATEGY_CONTRACT_ID` | ✓ | Deployed `mock-strategy` contract address |
| `USDC_TOKEN_CONTRACT_ID` | ✓ | Savings token contract address |
| `INDEXER_POLL_INTERVAL_MS` | | Indexer poll cadence (default `3000`) |
| `INDEXER_START_LEDGER` | | Override cursor start; `0` = auto (near chain tip) |

**Never commit `.env`.** `SEP10_SERVER_SECRET` and `JWT_SECRET` are the only
real secrets in this stack — no user funds ever touch a key the backend
holds.

## Frontend (`frontend/.env.local`, see `frontend/.env.example`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✓ | Backend base URL |
| `NEXT_PUBLIC_WS_URL` | ✓ | Backend WebSocket URL |
| `NEXT_PUBLIC_STELLAR_NETWORK` | ✓ | `TESTNET` \| `PUBLIC` |
| `NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` | ✓ | Must match the backend's |
| `NEXT_PUBLIC_HORIZON_URL` | | Used for classic-asset operations (trustlines) client-side |

All frontend variables are `NEXT_PUBLIC_*` and inlined into the client
bundle at build time — never put a secret here.

## CI (`.github/workflows/ci.yml`)

The backend job sets placeholder values for `DATABASE_URL`/`REDIS_URL`/etc.
sufficient for `prisma generate` and `tsc`/`vitest`, which never open a real
connection. No live Postgres/Redis service containers are needed for the
current test suite (see `docs/testing.md`).
