# Haven — Backend API Reference

Base URL (local dev): `http://localhost:4000`

## Authentication

Wallet-based auth via [SEP-10](https://developers.stellar.org/docs/learn/encyclopedia/security/sep-0010). The
backend never sees a private key.

1. `POST /auth/challenge` `{ publicKey }` → `{ challengeXdr, nonce, expiresAt }`
2. Wallet signs `challengeXdr` locally.
3. `POST /auth/verify` `{ publicKey, nonce, signedChallengeXdr }` → `{ token, expiresAt, user }`
4. Send `Authorization: Bearer <token>` on every subsequent request.
5. `POST /auth/logout` (authenticated) revokes the session.
6. `GET /auth/me` (authenticated) returns the current user's profile.

Sessions are stored server-side (`sessions` table, hashed token) so logout
and revocation are real, not just client-side token deletion.

## The "prepare / submit" pattern

Every endpoint that moves funds or changes on-chain state (`POST /goal`,
`PATCH /goal/:id`, `DELETE /goal/:id`, `POST /deposit`, `POST /withdraw`,
`POST /claim`) is **dual-mode**, driven by whether the request body includes
`signedXdr`:

- **Without `signedXdr`** ("prepare"): the backend simulates the invocation
  against Soroban RPC, assembles it with the correct resource fees, and
  returns `{ status: "PREPARED", xdr, simulatedCost }` — an unsigned
  transaction for the wallet to sign. The backend never signs a user-funds
  transaction itself.
- **With `signedXdr`** ("submit"): the backend relays the already-signed
  transaction to Soroban RPC, polls until it confirms, updates Postgres from
  the confirmed on-chain result, and returns `{ status: "CONFIRMED", goal }`.

This matches `docs/architecture.md`'s deposit data-flow exactly, generalized
to every mutating endpoint.

## Endpoints

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/auth/challenge` | — | SEP-10 challenge issuance |
| `POST` | `/auth/verify` | — | SEP-10 verification → session token |
| `POST` | `/auth/logout` | ✓ | Revokes the current session |
| `GET` | `/auth/me` | ✓ | Current user profile |
| `GET` | `/goals` | ✓ | `?includeClosed=true` to include closed goals |
| `POST` | `/goal` | ✓ | Prepare/submit `create_goal` |
| `GET` | `/goal/:id` | ✓ | Single goal (progress, balances) |
| `GET` | `/goal/:id/history` | ✓ | Full on-chain-derived history for a goal |
| `PATCH` | `/goal/:id` | ✓ | Prepare/submit exactly one of: `paused`, `targetAmount`, `unlockDate`, `name`/`icon` |
| `DELETE` | `/goal/:id` | ✓ | Prepare/submit `close_goal` + registry removal |
| `POST` | `/deposit` | ✓ | `{ goalId, amount, signedXdr? }` |
| `POST` | `/withdraw` | ✓ | `{ goalId, amount, signedXdr? }` |
| `POST` | `/claim` | ✓ | `{ goalId, signedXdr? }` — claims accrued interest |
| `GET` | `/transactions` | ✓ | `?goalId=&limit=&cursor=` |
| `GET` | `/analytics` | ✓ | `?days=30` — see below |
| `GET` | `/notifications` | ✓ | `?unreadOnly=true` |
| `PATCH` | `/notifications/:id/read` | ✓ | Mark one notification read |
| `PATCH` | `/notifications/read-all` | ✓ | Mark all read |
| `POST` | `/planner` | — | Deterministic goal-planning calculator (see below); stateless, no auth needed |
| `GET` | `/ws?token=<jwt>` | via query token | WebSocket upgrade; pushes JSON events for the authenticated user |
| `GET` | `/health` | — | Liveness check |

## `GET /analytics` response shape

```json
{
  "totalSaved": 1250.5,
  "totalInterestEarned": 12.34,
  "totalAccruedInterest": 4.1,
  "totalClaimedInterest": 8.24,
  "activeGoals": 2,
  "completedGoals": 1,
  "completionRate": 33.33,
  "depositCount": 14,
  "averageDeposit": 89.32,
  "savingsStreakDays": 6,
  "contributionChart": [{ "date": "2026-06-30", "total": 100, "count": 1 }],
  "goalSuccessPredictions": [
    { "goalId": "...", "name": "MacBook Pro", "onTrack": true, "confidencePercent": 82, "impliedDailyRate": 12.5, "requiredDailyRate": 9.1 }
  ]
}
```

`goalSuccessPredictions` and the planner's `chanceOfSuccessPercent` are
**deterministic heuristics** (documented formulas in
`src/services/analytics.service.ts` / `src/services/planner.service.ts`),
not a statistical or ML model — there is no external AI API call anywhere
in this stack, per the product requirement.

## `POST /planner` request/response

Request:
```json
{ "targetAmount": 2500, "months": 12, "currentSaved": 0, "apyBps": 500 }
```
(or `targetDate` instead of `months`)

Response:
```json
{
  "remaining": 2500,
  "monthsRemaining": 11.99,
  "weeksRemaining": 52.14,
  "weeklyDeposit": 46.75,
  "monthlyDeposit": 203.28,
  "projectedInterest": 62.5,
  "chanceOfSuccessPercent": 82,
  "expectedCompletionDate": "2027-07-03T20:03:15.030Z",
  "suggestions": ["Saving $46.75 per week gets you to $2,500.00 by ..."]
}
```

## Error shape

Every error response is:
```json
{ "error": { "code": "GOAL_CLOSED", "message": "This goal has been closed", "details": null } }
```
`code` is a stable machine-readable string (see `src/utils/errors.ts` for
the common ones); `details` carries Zod validation failures when the error
is a validation error.

## WebSocket events

Connect to `ws://localhost:4000/ws?token=<session JWT>`. The server pushes
JSON messages shaped `{ "type": "<event>", "goalId": "<uuid>" }` whenever
the indexer processes an on-chain event affecting one of your goals — types
mirror the contract event names (`deposit_made`, `withdrawal`,
`interest_accrued`, `goal_completed`, `goal_updated`, `GoalCreated`,
`GoalDeleted`). The client should treat these as cache-invalidation
signals and refetch the affected goal/analytics query, not as the source of
truth for the new values.
