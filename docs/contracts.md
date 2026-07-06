# Haven — Contract Reference

Source: `contracts/`. Built and tested against `soroban-sdk = "26.1.0"`,
target `wasm32v1-none` (the target the Soroban Environment requires on Rust
1.84+; `wasm32-unknown-unknown` is no longer supported by soroban-sdk 26).

Build order matters: `goal-vault` must be built to Wasm **before** running
`goal-factory`'s tests, since those tests dynamically deploy a real
`goal-vault` binary to exercise the factory's deployer logic end-to-end. Use
`scripts/build-contracts.sh`, which builds in the correct order and is a
prerequisite for `cargo test --workspace` (see `contracts/goal-factory/src/test.rs`,
which `contractimport!`s the compiled `goal_vault.wasm`).

```
scripts/build-contracts.sh   # builds all 4 contracts to wasm32v1-none
cd contracts && cargo test --workspace   # 47 tests
cd contracts && cargo clippy --workspace --all-targets
```

## Contracts

| Crate | Wasm | Purpose |
|---|---|---|
| `haven-common` | (not deployed — plain lib) | Shared math (`linear_interest`, `progress_bps`), cross-contract client interfaces (`StrategyClient`, `TreasuryClient`, `FactoryClient`), and shared typed events. |
| `mock-strategy` | `mock_strategy.wasm` | Fixed-APY strategy (default 500 bps / 5%), admin-adjustable. |
| `treasury` | `treasury.wasm` | Holds the interest reserve, pays vaults, verifies callers against the factory registry. |
| `goal-vault` | `goal_vault.wasm` | One instance per goal; owns deposit/withdraw/interest/lifecycle logic. |
| `goal-factory` | `goal_factory.wasm` | Deploys vaults, owns the `user -> goals` and `vault -> is-registered` registries. |

## `goal-vault`

### State (`GoalData`, single instance-storage entry under `DataKey::Goal`)

```
goal_id, owner, name, icon, target_amount, deposited_amount, strategy_id,
unlock_date, created_at, completed, paused, closed, checkpoint_ts,
accrued_interest, claimed_interest, token, treasury, factory
```

Stored as one entry so a single `extend_ttl` call on every write keeps the
whole goal alive — no risk of one field's TTL lagging another's.

### Entrypoints

| Function | Auth | Effect |
|---|---|---|
| `initialize(goal_id, owner, name, icon, target_amount, unlock_date, strategy_id, token, treasury, factory)` | `owner` | One-time setup. Rejects `target_amount <= 0` and `unlock_date <= now`. |
| `deposit(amount)` | `owner` | Checkpoints interest, transfers `amount` from owner into the vault, adds to principal. Rejects if closed, paused, or `amount <= 0`. Flips `completed` and emits `GoalCompleted` the moment the target is first reached. |
| `withdraw(amount)` | `owner` | Checkpoints interest, transfers `amount` of principal back to owner. Always available (even while paused) — Haven never hard-locks a user's own principal. Rejects `amount > deposited_amount`. |
| `claim()` | `owner` | Checkpoints interest, requests the full accrued amount from `treasury::pay_interest`, records however much was actually paid. Errors `NothingToClaim` if nothing has accrued. |
| `calculate_interest()` | none (view) | Read-only projection: checkpointed interest + linear interest since the last checkpoint. Never mutates state. |
| `get_progress()` | none (view) | `{ deposited, target, remaining, percent_bps, unlock_date, completed, paused, expired }`. |
| `extend_deadline(new_unlock_date)` | `owner` | Must move strictly forward and stay in the future. |
| `change_target(new_target)` | `owner` | Recomputes `completed`; may emit `GoalCompleted` or un-complete the goal. |
| `update_metadata(name?, icon?)` | `owner` | Partial update; typically invoked via `goal-factory::update_goal`. |
| `pause()` / `resume()` | `owner` | Freezes/unfreezes interest accrual only. Deposits are blocked while paused; withdrawals never are. |
| `close_goal()` | `owner` | Terminal: returns all principal, claims all outstanding interest, marks `closed = true`. Idempotency guarded (`AlreadyClosed`). |
| `get_goal()` | none (view) | Full `GoalData` snapshot, used by the indexer as a reconciliation fallback. |

### Interest accrual invariant

`checkpoint_interest` is called at the top of every state-changing function
before principal changes. It:
1. Computes `elapsed = now - checkpoint_ts`.
2. If paused, only advances `checkpoint_ts` (freezes the clock, accrues
   nothing).
3. Otherwise calls `linear_interest(deposited_amount, live_apy, elapsed)`,
   adds it to `accrued_interest`, and emits `InterestAccrued { kind: "accrue" }`.
4. Always advances `checkpoint_ts = now`.

This guarantees interest is computed strictly from `(principal at the start
of the interval, time elapsed)` — a deposit made *during* an interval only
starts earning from the next checkpoint onward, and a withdrawal reduces the
principal base for all subsequent intervals. No interest is ever written on
a block-by-block schedule.

## `goal-factory`

### Registry (persistent storage)

- `UserGoals(Address) -> Vec<u64>` — every goal id a user owns.
- `GoalRecord(u64) -> { goal_id, owner, vault, created_at }` — id → vault
  address + owner, used for ownership checks on update/delete.
- `VaultRegistry(Address) -> bool` — reverse index, `true` for any address
  this factory has deployed and not yet removed; this is what `treasury`
  calls into via `is_registered_vault`.

### Entrypoints

| Function | Auth | Effect |
|---|---|---|
| `initialize(admin, vault_wasm_hash, token, treasury, default_strategy)` | `admin` | One-time setup; stores the Wasm hash new vaults are deployed from. |
| `create_goal(owner, name, icon, target_amount, unlock_date)` | `owner` | Deploys a new `goal-vault` at a salt derived from a monotonic `goal_id` counter (`bytes[24..32] = goal_id.to_be_bytes()`, guaranteeing every id — and therefore every deployment address — is unique), calls its `initialize`, registers it, emits `GoalCreated`. |
| `delete_goal(owner, goal_id)` | `owner` | Verifies registry ownership, calls `vault.close_goal()`, removes all registry entries, emits `GoalDeleted`. |
| `update_goal(owner, goal_id, name?, icon?)` | `owner` | Verifies ownership, proxies to `vault.update_metadata`, emits `GoalUpdated`. |
| `get_user_goals(user)` | none (view) | All `GoalRecord`s for a user. |
| `get_goal(goal_id)` | none (view) | Single `GoalRecord`. |
| `is_registered_vault(vault)` | none (view) | Used by `treasury`. |
| `set_vault_wasm_hash(admin, new_hash)` | `admin` | Points future deployments at a new vault version; existing vaults are untouched (see "Replacing MockStrategy" pattern in `docs/architecture.md` §6 for the analogous idea applied to vault upgrades). |

## `treasury`

| Function | Auth | Effect |
|---|---|---|
| `initialize(admin, token, factory)` | `admin` | One-time setup. |
| `fund(from, amount)` | `from` | Transfers `amount` of `token` from `from` into the treasury's reserve. |
| `pay_interest(vault, recipient, amount)` | `vault` (contract self-auth) | Confirms `vault` via `factory.is_registered_vault`, pays `min(amount, current_balance)` to `recipient`, returns the amount actually paid. |
| `get_balance()` / `get_total_funded()` / `get_total_paid()` | none (view) | Reserve accounting. |

`vault.require_auth()` inside `pay_interest` is satisfied by Soroban's
contract-as-authorizer rule: a contract address authorizes an invocation
simply by being the direct caller in the current call stack — no signature
is needed or possible for a contract address. This is what makes it safe for
`goal-vault::claim` to call `treasury::pay_interest(env.current_contract_address(), ...)`
without the treasury trusting anything beyond "this call really did
originate from that vault contract in this transaction," which it then
cross-checks against the factory's registry.

## `mock-strategy`

| Function | Auth | Effect |
|---|---|---|
| `initialize(admin, apy_bps)` | `admin` | Sets the fixed APY (basis points), capped at `MAX_APY_BPS` (10_000 = 100%). |
| `get_apy()` | none (view) | The only function `goal-vault` calls. Any replacement strategy must implement this exact signature. |
| `set_apy(admin, new_apy_bps)` | `admin` | Demo lever to show different accrual rates without redeploying. |

## Events (all via `#[contractevent]`, defined once in `haven-common::events`)

| Event | Emitted by | Topics | Data |
|---|---|---|---|
| `GoalCreated` | `goal-factory::create_goal` | `goal_id`, `owner` | `vault, name, target_amount, unlock_date` |
| `GoalDeleted` | `goal-factory::delete_goal` | `goal_id`, `owner` | `vault, principal_returned, interest_claimed` |
| `GoalUpdated` | `goal-vault` (target/deadline/meta/paused/resumed) and `goal-factory::update_goal` (meta) | `goal_id`, `field` | — (consumers re-read `get_goal`) |
| `DepositMade` | `goal-vault::deposit` | `goal_id`, `owner` | `amount, total_deposited` |
| `Withdrawal` | `goal-vault::withdraw`, `close_goal` | `goal_id`, `owner` | `amount, remaining` |
| `InterestAccrued` | `goal-vault` checkpoint (`kind="accrue"`) and `claim`/`close_goal` (`kind="claim"`) | `goal_id`, `owner`, `kind` | `amount, total` |
| `GoalCompleted` | `goal-vault::deposit`, `change_target` | `goal_id`, `owner` | `deposited_amount, completed_at` |

`treasury` additionally emits `TreasuryFunded` and `InterestPaid` (not part
of the shared schema — internal to reserve accounting) and `mock-strategy`
emits `ApyUpdated`.

## Threat model / invariants checklist

- **Unauthorized mutation**: every state-changing entrypoint on every
  contract calls `require_auth()` on the relevant principal (`owner` for
  vault ops, `admin` for factory/treasury/strategy admin ops, `vault` itself
  for treasury payouts) before touching storage. Verified by
  `deposit_without_owner_auth_panics` in `goal-vault`'s test suite.
- **Over-withdrawal**: `withdraw` and `close_goal` compare against
  `deposited_amount` (principal only — interest is a separate claim path)
  before transferring. Verified by `withdraw_prevents_over_withdrawal`.
- **Overflow**: all arithmetic on `i128` balances uses `checked_add` /
  `checked_sub` / `checked_mul`, mapped to `Error::Overflow` rather than
  wrapping. `linear_interest`'s multiplication chain in `haven-common` also
  uses checked ops and panics (aborting the whole invocation) on overflow.
- **Zero/negative deposits**: `deposit`, `withdraw`, `fund`, and
  `pay_interest` all reject `amount <= 0`.
- **Duplicate goal ids**: `goal-factory`'s `goal_id` is a monotonically
  incrementing `u64` counter in instance storage; the deploy salt is derived
  directly from it, so two goals can never collide on id or deployed
  address. Verified by `create_goal_ids_are_unique_and_sequential`.
- **Expired goals**: Haven deliberately does not hard-lock funds past
  `unlock_date` — `get_progress().expired` is a UI signal, not an
  enforcement mechanism (see `docs/architecture.md` for the rationale).
  Verified by `get_progress_reports_expired_after_deadline`.
- **Treasury underfunding**: `pay_interest` caps payout at the treasury's
  live token balance and returns the actual amount paid; `goal-vault` only
  decrements `accrued_interest` by that returned amount, so any shortfall
  remains claimable later once the treasury is topped up. Verified by
  `pay_interest_caps_at_available_balance`.
- **Vault impersonation**: `treasury::pay_interest` never trusts the `vault`
  argument on its own — it cross-checks `factory.is_registered_vault(vault)`
  on every call. Verified by `pay_interest_requires_registered_vault`.
