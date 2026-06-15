//! GoalFactory: deploys and tracks a `goal-vault` instance per savings goal.
//!
//! Owns the registry (`user -> [goal_id]`, `goal_id -> vault address`) and
//! is the single source of truth `treasury` consults (via
//! `is_registered_vault`) to confirm a contract claiming to be a vault
//! actually is one this factory deployed — there is no separately
//! maintained allowlist to fall out of sync.
#![no_std]

use nest_common::{GoalCreated, GoalDeleted, GoalUpdated};
use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, symbol_short, vec, Address, BytesN, Env,
    String, Vec,
};

const LEDGER_THRESHOLD: u32 = 120_960; // ~7 days at 5s/ledger
const LEDGER_BUMP: u32 = 535_680; // ~31 days at 5s/ledger

/// Deliberately *not* a dependency on the `goal-vault` crate: linking that
/// crate in directly would pull its `#[contractimpl]` entry points into this
/// contract's own Wasm (both export a function named `initialize` with
/// different signatures, which collide at the ABI level). Instead we only
/// import the exact vault interface this factory calls, the same pattern
/// `nest-common` uses for `StrategyClient`/`TreasuryClient`/`FactoryClient`.
#[contractclient(name = "VaultClient")]
#[allow(dead_code)]
trait VaultInterface {
    #[allow(clippy::too_many_arguments)]
    fn initialize(
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
    );
    fn close_goal(env: Env) -> (i128, i128);
    fn update_metadata(env: Env, name: Option<String>, icon: Option<String>);
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    VaultWasmHash,
    Token,
    Treasury,
    DefaultStrategy,
    GoalCounter,
    UserGoals(Address),
    GoalRecord(u64),
    VaultRegistry(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GoalRecord {
    pub goal_id: u64,
    pub owner: Address,
    pub vault: Address,
    pub created_at: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotAdmin = 3,
    GoalNotFound = 4,
    NotOwner = 5,
    InvalidTarget = 6,
    InvalidDeadline = 7,
}

#[contract]
pub struct GoalFactory;

#[contractimpl]
impl GoalFactory {
    pub fn initialize(
        env: Env,
        admin: Address,
        vault_wasm_hash: BytesN<32>,
        token: Address,
        treasury: Address,
        default_strategy: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::VaultWasmHash, &vault_wasm_hash);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Treasury, &treasury);
        env.storage()
            .instance()
            .set(&DataKey::DefaultStrategy, &default_strategy);
        env.storage().instance().set(&DataKey::GoalCounter, &0u64);
        Ok(())
    }

    /// Deploy a brand-new `goal-vault` instance for `owner` and register it.
    /// Returns `(goal_id, vault_address)`.
    pub fn create_goal(
        env: Env,
        owner: Address,
        name: String,
        icon: String,
        target_amount: i128,
        unlock_date: u64,
    ) -> Result<(u64, Address), Error> {
        owner.require_auth();

        if target_amount <= 0 {
            return Err(Error::InvalidTarget);
        }
        if unlock_date <= env.ledger().timestamp() {
            return Err(Error::InvalidDeadline);
        }

        let wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::VaultWasmHash)
            .ok_or(Error::NotInitialized)?;
        let token: Address = env.storage().instance().get(&DataKey::Token).ok_or(Error::NotInitialized)?;
        let treasury: Address = env
            .storage()
            .instance()
            .get(&DataKey::Treasury)
            .ok_or(Error::NotInitialized)?;
        let strategy: Address = env
            .storage()
            .instance()
            .get(&DataKey::DefaultStrategy)
            .ok_or(Error::NotInitialized)?;

        let goal_id: u64 = env.storage().instance().get(&DataKey::GoalCounter).unwrap_or(0) + 1;
        env.storage().instance().set(&DataKey::GoalCounter, &goal_id);

        let salt = Self::goal_salt(&env, goal_id);
        let vault_address = env.deployer().with_current_contract(salt).deploy_v2(wasm_hash, ());

        VaultClient::new(&env, &vault_address).initialize(
            &goal_id,
            &owner,
            &name,
            &icon,
            &target_amount,
            &unlock_date,
            &strategy,
            &token,
            &treasury,
            &env.current_contract_address(),
        );

        let now = env.ledger().timestamp();
        let record = GoalRecord {
            goal_id,
            owner: owner.clone(),
            vault: vault_address.clone(),
            created_at: now,
        };
        env.storage().persistent().set(&DataKey::GoalRecord(goal_id), &record);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::GoalRecord(goal_id), LEDGER_THRESHOLD, LEDGER_BUMP);

        env.storage()
            .persistent()
            .set(&DataKey::VaultRegistry(vault_address.clone()), &true);
        env.storage().persistent().extend_ttl(
            &DataKey::VaultRegistry(vault_address.clone()),
            LEDGER_THRESHOLD,
            LEDGER_BUMP,
        );

        let mut user_goals = Self::load_user_goals(&env, &owner);
        user_goals.push_back(goal_id);
        env.storage()
            .persistent()
            .set(&DataKey::UserGoals(owner.clone()), &user_goals);
        env.storage().persistent().extend_ttl(
            &DataKey::UserGoals(owner.clone()),
            LEDGER_THRESHOLD,
            LEDGER_BUMP,
        );

        GoalCreated {
            goal_id,
            owner,
            vault: vault_address.clone(),
            name,
            target_amount,
            unlock_date,
        }
        .publish(&env);

        Ok((goal_id, vault_address))
    }

    /// Fully closes the vault (returns principal + claims interest to the
    /// owner) and removes it from the registry.
    pub fn delete_goal(env: Env, owner: Address, goal_id: u64) -> Result<(), Error> {
        owner.require_auth();

        let record = Self::load_record(&env, goal_id)?;
        if record.owner != owner {
            return Err(Error::NotOwner);
        }

        let (principal, interest) = VaultClient::new(&env, &record.vault).close_goal();

        env.storage().persistent().remove(&DataKey::GoalRecord(goal_id));
        env.storage()
            .persistent()
            .remove(&DataKey::VaultRegistry(record.vault.clone()));

        let mut user_goals = Self::load_user_goals(&env, &owner);
        if let Some(idx) = user_goals.iter().position(|id| id == goal_id) {
            user_goals.remove(idx as u32);
        }
        env.storage()
            .persistent()
            .set(&DataKey::UserGoals(owner.clone()), &user_goals);

        GoalDeleted {
            goal_id,
            owner,
            vault: record.vault,
            principal_returned: principal,
            interest_claimed: interest,
        }
        .publish(&env);

        Ok(())
    }

    /// Proxy metadata (name/icon) updates to the vault after verifying
    /// registry ownership.
    pub fn update_goal(
        env: Env,
        owner: Address,
        goal_id: u64,
        name: Option<String>,
        icon: Option<String>,
    ) -> Result<(), Error> {
        owner.require_auth();

        let record = Self::load_record(&env, goal_id)?;
        if record.owner != owner {
            return Err(Error::NotOwner);
        }

        VaultClient::new(&env, &record.vault).update_metadata(&name, &icon);

        GoalUpdated {
            goal_id,
            field: symbol_short!("meta"),
        }
        .publish(&env);
        Ok(())
    }

    pub fn get_user_goals(env: Env, user: Address) -> Vec<GoalRecord> {
        let ids = Self::load_user_goals(&env, &user);
        let mut records = vec![&env];
        for id in ids.iter() {
            if let Ok(record) = Self::load_record(&env, id) {
                records.push_back(record);
            }
        }
        records
    }

    pub fn get_goal(env: Env, goal_id: u64) -> Result<GoalRecord, Error> {
        Self::load_record(&env, goal_id)
    }

    /// Used by `treasury` to confirm a payout requester is a real vault.
    pub fn is_registered_vault(env: Env, vault: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::VaultRegistry(vault))
            .unwrap_or(false)
    }

    pub fn get_goal_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::GoalCounter).unwrap_or(0)
    }

    /// Admin-only: point future `create_goal` deployments at a new
    /// `goal-vault` Wasm version. Existing vaults are unaffected.
    pub fn set_vault_wasm_hash(env: Env, admin: Address, new_hash: BytesN<32>) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if stored_admin != admin {
            return Err(Error::NotAdmin);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::VaultWasmHash, &new_hash);
        Ok(())
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Admin).ok_or(Error::NotInitialized)
    }

    // ---- internal helpers ----

    fn goal_salt(env: &Env, goal_id: u64) -> BytesN<32> {
        let mut bytes = [0u8; 32];
        bytes[24..32].copy_from_slice(&goal_id.to_be_bytes());
        BytesN::from_array(env, &bytes)
    }

    fn load_user_goals(env: &Env, user: &Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::UserGoals(user.clone()))
            .unwrap_or(vec![env])
    }

    fn load_record(env: &Env, goal_id: u64) -> Result<GoalRecord, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::GoalRecord(goal_id))
            .ok_or(Error::GoalNotFound)
    }
}

#[cfg(test)]
mod test;
