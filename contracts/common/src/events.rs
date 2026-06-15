//! Shared, typed contract events for the Nest suite, defined once so
//! `goal-vault` and `goal-factory` emit an identical schema. Built with the
//! `#[contractevent]` macro so the event shapes are part of each contract's
//! published interface spec (discoverable by SDKs/tooling), rather than
//! loose `env.events().publish(..)` tuples.
use soroban_sdk::{contractevent, Address, String, Symbol};

/// Emitted by `goal-factory::create_goal` once a new vault is deployed and
/// registered.
#[contractevent]
pub struct GoalCreated {
    #[topic]
    pub goal_id: u64,
    #[topic]
    pub owner: Address,
    pub vault: Address,
    pub name: String,
    pub target_amount: i128,
    pub unlock_date: u64,
}

/// Emitted by `goal-factory::delete_goal` after the vault has been fully
/// closed (principal returned, interest claimed) and removed from the
/// registry.
#[contractevent]
pub struct GoalDeleted {
    #[topic]
    pub goal_id: u64,
    #[topic]
    pub owner: Address,
    pub vault: Address,
    pub principal_returned: i128,
    pub interest_claimed: i128,
}

/// Emitted for any metadata/parameter change on a goal: `field` is one of
/// `"target"`, `"deadline"`, `"meta"`, `"paused"`, `"resumed"`. Consumers
/// re-read `goal-vault::get_goal` for the new value rather than the event
/// carrying every possible field's type.
#[contractevent]
pub struct GoalUpdated {
    #[topic]
    pub goal_id: u64,
    #[topic]
    pub field: Symbol,
}

/// Emitted by `goal-vault::deposit`.
#[contractevent]
pub struct DepositMade {
    #[topic]
    pub goal_id: u64,
    #[topic]
    pub owner: Address,
    pub amount: i128,
    pub total_deposited: i128,
}

/// Emitted by `goal-vault::withdraw` and as part of `close_goal`.
#[contractevent]
pub struct Withdrawal {
    #[topic]
    pub goal_id: u64,
    #[topic]
    pub owner: Address,
    pub amount: i128,
    pub remaining: i128,
}

/// Emitted whenever interest is checkpointed (`kind = "accrue"`) or paid out
/// by the treasury (`kind = "claim"`).
#[contractevent]
pub struct InterestAccrued {
    #[topic]
    pub goal_id: u64,
    #[topic]
    pub owner: Address,
    #[topic]
    pub kind: Symbol,
    pub amount: i128,
    pub total: i128,
}

/// Emitted the moment `deposited_amount` first reaches `target_amount`.
#[contractevent]
pub struct GoalCompleted {
    #[topic]
    pub goal_id: u64,
    #[topic]
    pub owner: Address,
    pub deposited_amount: i128,
    pub completed_at: u64,
}
