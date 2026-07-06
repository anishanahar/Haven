//! Treasury: holds a funded reserve of the savings token and pays out
//! simulated interest on behalf of goal vaults.
//!
//! `goal-vault` never mints or fabricates interest itself — it computes an
//! *entitlement* off its own principal/APY/time, then asks the treasury to
//! actually move funds. The treasury caps every payout at its real token
//! balance and only pays a caller it can confirm, via a cross-contract call
//! back into `goal-factory`, is a vault that factory actually deployed.
//! There is no hardcoded allowlist of vault addresses to keep in sync.
#![no_std]

use haven_common::FactoryClient;
use soroban_sdk::{contract, contractevent, contracterror, contractimpl, contracttype, token, Address, Env};

/// Emitted when the treasury's reserve is topped up.
#[contractevent]
pub struct TreasuryFunded {
    #[topic]
    pub from: Address,
    pub amount: i128,
    pub total_funded: i128,
}

/// Emitted when the treasury pays out simulated interest to a vault owner.
#[contractevent]
pub struct InterestPaid {
    #[topic]
    pub vault: Address,
    #[topic]
    pub recipient: Address,
    pub amount: i128,
    pub total_paid: i128,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Token,
    Factory,
    TotalFunded,
    TotalPaid,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    NotRegisteredVault = 4,
    Overflow = 5,
}

#[contract]
pub struct Treasury;

#[contractimpl]
impl Treasury {
    pub fn initialize(env: Env, admin: Address, token: Address, factory: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Factory, &factory);
        env.storage().instance().set(&DataKey::TotalFunded, &0i128);
        env.storage().instance().set(&DataKey::TotalPaid, &0i128);
        Ok(())
    }

    /// Admin (or anyone, in practice — funding your own users' interest
    /// reserve is a benign action) tops up the treasury's reserve.
    pub fn fund(env: Env, from: Address, amount: i128) -> Result<(), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        from.require_auth();

        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;
        token::Client::new(&env, &token_addr).transfer(&from, env.current_contract_address(), &amount);

        let total: i128 = env.storage().instance().get(&DataKey::TotalFunded).unwrap_or(0);
        let new_total = total.checked_add(amount).ok_or(Error::Overflow)?;
        env.storage().instance().set(&DataKey::TotalFunded, &new_total);

        TreasuryFunded {
            from,
            amount,
            total_funded: new_total,
        }
        .publish(&env);
        Ok(())
    }

    /// Pay `amount` of interest to `recipient` on behalf of `vault`.
    /// - `vault` must `require_auth` — satisfied automatically when this is
    ///   called directly by that vault contract in the same invocation
    ///   (Soroban's contract-as-authorizer pattern), never by an externally
    ///   supplied signature.
    /// - `vault` must additionally be confirmed as a real, factory-deployed
    ///   vault via a cross-contract call to `goal-factory::is_registered_vault`.
    /// - The payout is capped at the treasury's actual token balance; the
    ///   function returns the amount *actually* paid, which callers must
    ///   check (it may be less than requested if the reserve is thin).
    pub fn pay_interest(env: Env, vault: Address, recipient: Address, amount: i128) -> Result<i128, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        vault.require_auth();

        let factory: Address = env
            .storage()
            .instance()
            .get(&DataKey::Factory)
            .ok_or(Error::NotInitialized)?;
        let is_vault = FactoryClient::new(&env, &factory).is_registered_vault(&vault);
        if !is_vault {
            return Err(Error::NotRegisteredVault);
        }

        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;
        let token_client = token::Client::new(&env, &token_addr);
        let available = token_client.balance(&env.current_contract_address());
        let payout = if amount > available { available } else { amount };

        if payout > 0 {
            token_client.transfer(&env.current_contract_address(), &recipient, &payout);

            let total: i128 = env.storage().instance().get(&DataKey::TotalPaid).unwrap_or(0);
            let new_total = total.checked_add(payout).ok_or(Error::Overflow)?;
            env.storage().instance().set(&DataKey::TotalPaid, &new_total);

            InterestPaid {
                vault,
                recipient,
                amount: payout,
                total_paid: new_total,
            }
            .publish(&env);
        }

        Ok(payout)
    }

    pub fn get_balance(env: Env) -> Result<i128, Error> {
        let token_addr: Address = env
            .storage()
            .instance()
            .get(&DataKey::Token)
            .ok_or(Error::NotInitialized)?;
        Ok(token::Client::new(&env, &token_addr).balance(&env.current_contract_address()))
    }

    pub fn get_total_funded(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalFunded).unwrap_or(0)
    }

    pub fn get_total_paid(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::TotalPaid).unwrap_or(0)
    }

    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Admin).ok_or(Error::NotInitialized)
    }
}

#[cfg(test)]
mod test;
