//! GoalVault: one instance per savings goal.
//!
//! Holds custody of a single goal's deposited token, tracks its target,
//! deadline, pause state, and strategy, and computes interest **on demand**
//! from `(principal, apy_bps, elapsed_seconds)` rather than writing accrual
//! on a schedule. Interest is checkpointed (settled into `accrued_interest`
//! and the clock reset) on every state-changing call so multiple deposits
//! and withdrawals over time compound correctly without per-block writes.
//!
//! Every fund-moving or state-changing entrypoint requires the goal owner's
//! authorization (`owner.require_auth()`); nothing here trusts a caller
//! address without it.
#![no_std]

use haven_common::{
    linear_interest, progress_bps, DepositMade, GoalCompleted, GoalUpdated, InterestAccrued, StrategyClient,
    TreasuryClient, Withdrawal, MAX_APY_BPS,
};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, String,
};

const LEDGER_THRESHOLD: u32 = 120_960; // ~7 days at 5s/ledger
const LEDGER_BUMP: u32 = 535_680; // ~31 days at 5s/ledger

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Goal,
}

#[contracttype]
#[derive(Clone)]
pub struct GoalData {
    pub goal_id: u64,
    pub owner: Address,
    pub name: String,
    pub icon: String,
    pub target_amount: i128,
    pub deposited_amount: i128,
    pub strategy_id: Address,
    pub unlock_date: u64,
    pub created_at: u64,
    pub completed: bool,
    pub paused: bool,
    pub closed: bool,
    pub checkpoint_ts: u64,
    pub accrued_interest: i128,
    pub claimed_interest: i128,
    pub token: Address,
    pub treasury: Address,
    pub factory: Address,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Progress {
    pub deposited: i128,
    pub target: i128,
    pub remaining: i128,
    pub percent_bps: u32,
    pub unlock_date: u64,
    pub completed: bool,
    pub paused: bool,
    pub expired: bool,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InsufficientBalance = 4,
    GoalPaused = 5,
    AlreadyPaused = 6,
    NotPaused = 7,
    GoalClosed = 8,
    AlreadyClosed = 9,
    InvalidTarget = 10,
    InvalidDeadline = 11,
    NothingToClaim = 12,
    Overflow = 13,
}

#[contract]
pub struct GoalVault;

#[contractimpl]
impl GoalVault {
    /// Called exactly once by `goal-factory` immediately after this
    /// contract instance is deployed.
    #[allow(clippy::too_many_arguments)]
    pub fn initialize(
        env: Env,
        goal_id: u64,
        owner: Address,
        name: String,
        icon: String,
        target_amount: i128,
        unlock_date: u64,
        strategy_id: Address,
        token: Address,
        treasury: Address,
        factory: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Goal) {
            return Err(Error::AlreadyInitialized);
        }
        if target_amount <= 0 {
            return Err(Error::InvalidTarget);
        }
        let now = env.ledger().timestamp();
        if unlock_date <= now {
            return Err(Error::InvalidDeadline);
        }
        owner.require_auth();

        let goal = GoalData {
            goal_id,
            owner,
            name,
            icon,
            target_amount,
            deposited_amount: 0,
            strategy_id,
            unlock_date,
            created_at: now,
            completed: false,
            paused: false,
            closed: false,
            checkpoint_ts: now,
            accrued_interest: 0,
            claimed_interest: 0,
            token,
            treasury,
            factory,
        };
        Self::save(&env, &goal);
        Ok(())
    }

    /// Deposit `amount` of the goal's token into the vault. Only the goal
    /// owner may deposit. Interest is checkpointed *before* the new
    /// principal is added so the deposit itself doesn't retroactively earn
    /// interest for time it wasn't in the vault.
    pub fn deposit(env: Env, amount: i128) -> Result<i128, Error> {
        let mut goal = Self::load(&env)?;
        if goal.closed {
            return Err(Error::GoalClosed);
        }
        if goal.paused {
            return Err(Error::GoalPaused);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        goal.owner.require_auth();

        Self::checkpoint_interest(&env, &mut goal);

        token::Client::new(&env, &goal.token).transfer(&goal.owner, env.current_contract_address(), &amount);

        goal.deposited_amount = goal
            .deposited_amount
            .checked_add(amount)
            .ok_or(Error::Overflow)?;

        let newly_completed = !goal.completed && goal.deposited_amount >= goal.target_amount;
        if newly_completed {
            goal.completed = true;
        }

        Self::save(&env, &goal);

        DepositMade {
            goal_id: goal.goal_id,
            owner: goal.owner.clone(),
            amount,
            total_deposited: goal.deposited_amount,
        }
        .publish(&env);
        if newly_completed {
            GoalCompleted {
                goal_id: goal.goal_id,
                owner: goal.owner.clone(),
                deposited_amount: goal.deposited_amount,
                completed_at: env.ledger().timestamp(),
            }
            .publish(&env);
        }

        Ok(goal.deposited_amount)
    }

    /// Withdraw `amount` of principal back to the owner. Always available to
    /// the owner regardless of pause state or deadline — this is the
    /// owner's own money and Haven does not implement a hard lock. Only
    /// *interest accrual* pauses; withdrawal of principal never does.
    pub fn withdraw(env: Env, amount: i128) -> Result<i128, Error> {
        let mut goal = Self::load(&env)?;
        if goal.closed {
            return Err(Error::GoalClosed);
        }
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        goal.owner.require_auth();

        if amount > goal.deposited_amount {
            return Err(Error::InsufficientBalance);
        }

        Self::checkpoint_interest(&env, &mut goal);

        token::Client::new(&env, &goal.token).transfer(&env.current_contract_address(), &goal.owner, &amount);

        goal.deposited_amount = goal
            .deposited_amount
            .checked_sub(amount)
            .ok_or(Error::Overflow)?;

        if goal.completed && goal.deposited_amount < goal.target_amount {
            goal.completed = false;
        }

        Self::save(&env, &goal);

        Withdrawal {
            goal_id: goal.goal_id,
            owner: goal.owner.clone(),
            amount,
            remaining: goal.deposited_amount,
        }
        .publish(&env);

        Ok(goal.deposited_amount)
    }

    /// Claim currently accrued interest, pulling the payout from the
    /// treasury. Returns the amount actually paid (may be less than the
    /// entitlement if the treasury's reserve is thin).
    pub fn claim(env: Env) -> Result<i128, Error> {
        let mut goal = Self::load(&env)?;
        if goal.closed {
            return Err(Error::GoalClosed);
        }
        goal.owner.require_auth();

        Self::checkpoint_interest(&env, &mut goal);

        if goal.accrued_interest <= 0 {
            return Err(Error::NothingToClaim);
        }

        let requested = goal.accrued_interest;
        let paid: i128 = TreasuryClient::new(&env, &goal.treasury).pay_interest(
            &env.current_contract_address(),
            &goal.owner,
            &requested,
        );

        goal.accrued_interest = goal.accrued_interest.checked_sub(paid).ok_or(Error::Overflow)?;
        goal.claimed_interest = goal.claimed_interest.checked_add(paid).ok_or(Error::Overflow)?;

        Self::save(&env, &goal);

        InterestAccrued {
            goal_id: goal.goal_id,
            owner: goal.owner.clone(),
            kind: symbol_short!("claim"),
            amount: paid,
            total: goal.claimed_interest,
        }
        .publish(&env);

        Ok(paid)
    }

    /// Read-only projection of total claimable interest right now: interest
    /// already checkpointed plus interest accrued since the last checkpoint.
    /// Never mutates storage, so it's free to call as often as the UI wants.
    pub fn calculate_interest(env: Env) -> Result<i128, Error> {
        let goal = Self::load(&env)?;
        if goal.paused || goal.closed {
            return Ok(goal.accrued_interest);
        }
        let now = env.ledger().timestamp();
        let elapsed = now.saturating_sub(goal.checkpoint_ts);
        let apy = Self::live_apy(&env, &goal.strategy_id);
        let projected = linear_interest(goal.deposited_amount, apy, elapsed);
        goal.accrued_interest.checked_add(projected).ok_or(Error::Overflow)
    }

    pub fn get_progress(env: Env) -> Result<Progress, Error> {
        let goal = Self::load(&env)?;
        let now = env.ledger().timestamp();
        let remaining = if goal.target_amount > goal.deposited_amount {
            goal.target_amount - goal.deposited_amount
        } else {
            0
        };
        Ok(Progress {
            deposited: goal.deposited_amount,
            target: goal.target_amount,
            remaining,
            percent_bps: progress_bps(goal.deposited_amount, goal.target_amount),
            unlock_date: goal.unlock_date,
            completed: goal.completed,
            paused: goal.paused,
            expired: !goal.completed && now > goal.unlock_date,
        })
    }

    pub fn extend_deadline(env: Env, new_unlock_date: u64) -> Result<(), Error> {
        let mut goal = Self::load(&env)?;
        if goal.closed {
            return Err(Error::GoalClosed);
        }
        goal.owner.require_auth();

        if new_unlock_date <= goal.unlock_date || new_unlock_date <= env.ledger().timestamp() {
            return Err(Error::InvalidDeadline);
        }
        goal.unlock_date = new_unlock_date;
        Self::save(&env, &goal);

        GoalUpdated {
            goal_id: goal.goal_id,
            field: symbol_short!("deadline"),
        }
        .publish(&env);
        Ok(())
    }

    pub fn change_target(env: Env, new_target: i128) -> Result<(), Error> {
        let mut goal = Self::load(&env)?;
        if goal.closed {
            return Err(Error::GoalClosed);
        }
        goal.owner.require_auth();

        if new_target <= 0 {
            return Err(Error::InvalidTarget);
        }
        goal.target_amount = new_target;

        let now_completed = goal.deposited_amount >= new_target;
        let newly_completed = !goal.completed && now_completed;
        goal.completed = now_completed;

        Self::save(&env, &goal);

        GoalUpdated {
            goal_id: goal.goal_id,
            field: symbol_short!("target"),
        }
        .publish(&env);
        if newly_completed {
            GoalCompleted {
                goal_id: goal.goal_id,
                owner: goal.owner.clone(),
                deposited_amount: goal.deposited_amount,
                completed_at: env.ledger().timestamp(),
            }
            .publish(&env);
        }
        Ok(())
    }

    /// Update display metadata (name/icon). Typically invoked via
    /// `goal-factory::update_goal`, which proxies here after its own
    /// registry bookkeeping, but is also directly callable by the owner.
    pub fn update_metadata(env: Env, name: Option<String>, icon: Option<String>) -> Result<(), Error> {
        let mut goal = Self::load(&env)?;
        if goal.closed {
            return Err(Error::GoalClosed);
        }
        goal.owner.require_auth();

        if let Some(n) = name {
            goal.name = n;
        }
        if let Some(i) = icon {
            goal.icon = i;
        }
        Self::save(&env, &goal);

        GoalUpdated {
            goal_id: goal.goal_id,
            field: symbol_short!("meta"),
        }
        .publish(&env);
        Ok(())
    }

    /// Freeze interest accrual and new deposits. Withdrawals remain
    /// available. Settles (checkpoints) interest earned up to now before
    /// freezing the clock, so resuming later never double-counts.
    pub fn pause(env: Env) -> Result<(), Error> {
        let mut goal = Self::load(&env)?;
        if goal.closed {
            return Err(Error::GoalClosed);
        }
        goal.owner.require_auth();
        if goal.paused {
            return Err(Error::AlreadyPaused);
        }

        Self::checkpoint_interest(&env, &mut goal);
        goal.paused = true;
        Self::save(&env, &goal);

        GoalUpdated {
            goal_id: goal.goal_id,
            field: symbol_short!("paused"),
        }
        .publish(&env);
        Ok(())
    }

    pub fn resume(env: Env) -> Result<(), Error> {
        let mut goal = Self::load(&env)?;
        if goal.closed {
            return Err(Error::GoalClosed);
        }
        goal.owner.require_auth();
        if !goal.paused {
            return Err(Error::NotPaused);
        }

        goal.paused = false;
        goal.checkpoint_ts = env.ledger().timestamp();
        Self::save(&env, &goal);

        GoalUpdated {
            goal_id: goal.goal_id,
            field: symbol_short!("resumed"),
        }
        .publish(&env);
        Ok(())
    }

    /// Fully close the goal: returns all remaining principal and claims all
    /// outstanding interest, then marks the vault permanently closed.
    /// Typically invoked by `goal-factory::delete_goal` after this returns
    /// successfully, the factory removes the goal from its registry and
    /// emits `GoalDeleted`.
    pub fn close_goal(env: Env) -> Result<(i128, i128), Error> {
        let mut goal = Self::load(&env)?;
        if goal.closed {
            return Err(Error::AlreadyClosed);
        }
        goal.owner.require_auth();

        Self::checkpoint_interest(&env, &mut goal);

        let principal = goal.deposited_amount;
        if principal > 0 {
            token::Client::new(&env, &goal.token).transfer(&env.current_contract_address(), &goal.owner, &principal);
            goal.deposited_amount = 0;
        }

        let mut paid = 0i128;
        if goal.accrued_interest > 0 {
            paid = TreasuryClient::new(&env, &goal.treasury).pay_interest(
                &env.current_contract_address(),
                &goal.owner,
                &goal.accrued_interest,
            );
            goal.claimed_interest = goal.claimed_interest.checked_add(paid).ok_or(Error::Overflow)?;
            goal.accrued_interest = goal.accrued_interest.checked_sub(paid).ok_or(Error::Overflow)?;
        }

        goal.closed = true;
        goal.paused = true;
        Self::save(&env, &goal);

        if principal > 0 {
            Withdrawal {
                goal_id: goal.goal_id,
                owner: goal.owner.clone(),
                amount: principal,
                remaining: 0,
            }
            .publish(&env);
        }
        if paid > 0 {
            InterestAccrued {
                goal_id: goal.goal_id,
                owner: goal.owner.clone(),
                kind: symbol_short!("claim"),
                amount: paid,
                total: goal.claimed_interest,
            }
            .publish(&env);
        }

        Ok((principal, paid))
    }

    pub fn get_goal(env: Env) -> Result<GoalData, Error> {
        Self::load(&env)
    }

    // ---- internal helpers ----

    fn live_apy(env: &Env, strategy_id: &Address) -> u32 {
        let apy = StrategyClient::new(env, strategy_id).get_apy();
        if apy > MAX_APY_BPS {
            MAX_APY_BPS
        } else {
            apy
        }
    }

    /// Settle interest earned since `goal.checkpoint_ts` into
    /// `accrued_interest` and move the checkpoint forward to now. No-op
    /// (besides moving the clock) while paused, since paused goals stop
    /// accruing by design.
    fn checkpoint_interest(env: &Env, goal: &mut GoalData) {
        let now = env.ledger().timestamp();
        if goal.paused {
            goal.checkpoint_ts = now;
            return;
        }
        let elapsed = now.saturating_sub(goal.checkpoint_ts);
        if elapsed == 0 {
            return;
        }
        let apy = Self::live_apy(env, &goal.strategy_id);
        let interest = linear_interest(goal.deposited_amount, apy, elapsed);
        goal.checkpoint_ts = now;
        if interest > 0 {
            goal.accrued_interest = goal
                .accrued_interest
                .checked_add(interest)
                .expect("haven: accrued interest overflow");
            InterestAccrued {
                goal_id: goal.goal_id,
                owner: goal.owner.clone(),
                kind: symbol_short!("accrue"),
                amount: interest,
                total: goal.accrued_interest,
            }
            .publish(env);
        }
    }

    fn load(env: &Env) -> Result<GoalData, Error> {
        env.storage().instance().get(&DataKey::Goal).ok_or(Error::NotInitialized)
    }

    fn save(env: &Env, goal: &GoalData) {
        env.storage().instance().set(&DataKey::Goal, goal);
        env.storage()
            .instance()
            .extend_ttl(LEDGER_THRESHOLD, LEDGER_BUMP);
    }
}

#[cfg(test)]
mod test;
