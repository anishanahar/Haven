//! Shared types, math, and cross-contract client interfaces used across the
//! Nest contract suite. This crate is a plain Rust library (no `#[contract]`
//! here) so it can be depended on by every contract crate without pulling in
//! a second copy of the Soroban entrypoint machinery.
#![no_std]

use soroban_sdk::{contractclient, Address, Env};

mod events;
pub use events::*;

/// Basis-point denominator: 10_000 bps == 100%.
pub const BPS_DENOMINATOR: i128 = 10_000;

/// Seconds in a 365-day year, used for linear interest accrual.
pub const SECONDS_PER_YEAR: u64 = 31_536_000;

/// Maximum APY we ever accept from a strategy (100_00 bps == 100%). Guards
/// against a misconfigured or malicious strategy contract inflating payouts.
pub const MAX_APY_BPS: u32 = 10_000;

/// Linear interest accrual, computed on demand rather than written on a
/// schedule:
///
/// ```text
/// interest = principal * apy_bps * elapsed_seconds / (10_000 * seconds_per_year)
/// ```
///
/// Returns `0` for a non-positive principal, zero APY, or zero elapsed time.
/// Uses checked i128 arithmetic throughout; panics (aborting the contract
/// invocation) on overflow rather than silently wrapping, which is the
/// correct failure mode for financial math.
pub fn linear_interest(principal: i128, apy_bps: u32, elapsed_seconds: u64) -> i128 {
    if principal <= 0 || apy_bps == 0 || elapsed_seconds == 0 {
        return 0;
    }

    let numerator = principal
        .checked_mul(apy_bps as i128)
        .and_then(|v| v.checked_mul(elapsed_seconds as i128))
        .expect("nest-common: interest numerator overflow");

    let denominator = BPS_DENOMINATOR
        .checked_mul(SECONDS_PER_YEAR as i128)
        .expect("nest-common: interest denominator overflow");

    numerator / denominator
}

/// Basis-point progress of `deposited` towards `target`, clamped to
/// `[0, 10_000]`. Returns `10_000` (100%) when `target <= 0` and
/// `deposited > 0` to avoid a division by zero.
pub fn progress_bps(deposited: i128, target: i128) -> u32 {
    if target <= 0 {
        return if deposited > 0 { 10_000 } else { 0 };
    }
    let bps = deposited
        .checked_mul(BPS_DENOMINATOR)
        .expect("nest-common: progress overflow")
        / target;
    if bps < 0 {
        0
    } else if bps > 10_000 {
        10_000
    } else {
        bps as u32
    }
}

/// Cross-contract interface implemented by every yield strategy
/// (`mock-strategy` today; lending/stable-pool/treasury/aggregator
/// strategies later). `goal-vault` only ever talks to this interface, so
/// swapping the strategy implementation never requires touching
/// `goal-vault`'s code — only the stored `strategy_id` address changes.
#[contractclient(name = "StrategyClient")]
pub trait StrategyInterface {
    /// Current APY in basis points (500 == 5.00%).
    fn get_apy(env: Env) -> u32;
}

/// Cross-contract interface implemented by the `treasury` contract.
#[contractclient(name = "TreasuryClient")]
pub trait TreasuryInterface {
    /// Pay `amount` of accrued interest to `recipient` on behalf of `vault`.
    /// Returns the amount actually paid (may be less than requested if the
    /// treasury's reserve is insufficient). Only callable by a contract
    /// address that the treasury can confirm is a registered vault.
    fn pay_interest(env: Env, vault: Address, recipient: Address, amount: i128) -> i128;
}

/// Cross-contract interface implemented by the `goal-factory` contract,
/// used by `treasury` to confirm a caller claiming to be "a vault" is
/// actually a vault the factory deployed, without a hardcoded allowlist.
#[contractclient(name = "FactoryClient")]
pub trait FactoryInterface {
    fn is_registered_vault(env: Env, vault: Address) -> bool;
}
