//! MockStrategy: a stand-in yield source that always reports a fixed APY.
//!
//! `goal-vault` only ever depends on the `StrategyInterface` defined in
//! `nest-common` (a `get_apy() -> u32` call). This contract is one concrete
//! implementation of that interface; it can be replaced post-MVP by a
//! lending strategy, a stable-pool strategy, a treasury-managed strategy, or
//! a yield aggregator — each implementing the same interface — by updating
//! the `strategy_id` stored on a vault. No change to `goal-vault` is ever
//! required.
#![no_std]

use nest_common::MAX_APY_BPS;
use soroban_sdk::{contract, contracterror, contractevent, contractimpl, contracttype, Address, Env};

/// Emitted when the admin changes the fixed demo APY.
#[contractevent]
pub struct ApyUpdated {
    pub old_apy_bps: u32,
    pub new_apy_bps: u32,
}

/// Default APY: 500 bps == 5.00%.
pub const DEFAULT_APY_BPS: u32 = 500;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    ApyBps,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidApy = 3,
}

#[contract]
pub struct MockStrategy;

#[contractimpl]
impl MockStrategy {
    /// One-time setup. `apy_bps` lets a deployment pick a non-default fixed
    /// rate (still capped at `MAX_APY_BPS`); pass `DEFAULT_APY_BPS` for the
    /// standard 5% demo rate.
    pub fn initialize(env: Env, admin: Address, apy_bps: u32) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        if apy_bps == 0 || apy_bps > MAX_APY_BPS {
            return Err(Error::InvalidApy);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::ApyBps, &apy_bps);
        Ok(())
    }

    /// Current fixed APY in basis points. This is the only function
    /// `goal-vault` calls; every future strategy implementation must expose
    /// this exact signature.
    pub fn get_apy(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ApyBps)
            .unwrap_or(DEFAULT_APY_BPS)
    }

    /// Admin-only override, useful for demoing different accrual rates
    /// without redeploying the contract.
    pub fn set_apy(env: Env, admin: Address, new_apy_bps: u32) -> Result<(), Error> {
        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if stored_admin != admin {
            return Err(Error::NotInitialized);
        }
        admin.require_auth();
        if new_apy_bps == 0 || new_apy_bps > MAX_APY_BPS {
            return Err(Error::InvalidApy);
        }
        let old_apy: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ApyBps)
            .unwrap_or(DEFAULT_APY_BPS);
        env.storage().instance().set(&DataKey::ApyBps, &new_apy_bps);
        ApyUpdated {
            old_apy_bps: old_apy,
            new_apy_bps,
        }
        .publish(&env);
        Ok(())
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }
}

#[cfg(test)]
mod test;
