use super::*;
use soroban_sdk::testutils::{Address as _, StellarAssetContract};
use soroban_sdk::Env;

#[contract]
struct MockFactory;

#[contractimpl]
impl MockFactory {
    pub fn is_registered_vault(env: Env, vault: Address) -> bool {
        env.storage().instance().get(&vault).unwrap_or(false)
    }

    pub fn register(env: Env, vault: Address) {
        env.storage().instance().set(&vault, &true);
    }
}

struct TestCtx<'a> {
    env: Env,
    treasury: TreasuryClient<'a>,
    factory: MockFactoryClient<'a>,
    token_admin: token::StellarAssetClient<'a>,
    token: token::Client<'a>,
    admin: Address,
}

fn setup<'a>() -> TestCtx<'a> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let token_issuer = Address::generate(&env);
    let sac: StellarAssetContract = env.register_stellar_asset_contract_v2(token_issuer.clone());
    let token_id = sac.address();
    let token = token::Client::new(&env, &token_id);
    let token_admin = token::StellarAssetClient::new(&env, &token_id);

    let factory_id = env.register(MockFactory, ());
    let factory = MockFactoryClient::new(&env, &factory_id);

    let treasury_id = env.register(Treasury, ());
    let treasury = TreasuryClient::new(&env, &treasury_id);
    treasury.initialize(&admin, &token_id, &factory_id);

    TestCtx {
        env,
        treasury,
        factory,
        token_admin,
        token,
        admin,
    }
}

#[test]
fn fund_increases_balance() {
    let ctx = setup();
    ctx.token_admin.mint(&ctx.admin, &1_000_000);
    ctx.treasury.fund(&ctx.admin, &500_000);

    assert_eq!(ctx.treasury.get_balance(), 500_000);
    assert_eq!(ctx.treasury.get_total_funded(), 500_000);
    assert_eq!(ctx.token.balance(&ctx.admin), 500_000);
}

#[test]
fn pay_interest_requires_registered_vault() {
    let ctx = setup();
    ctx.token_admin.mint(&ctx.admin, &1_000_000);
    ctx.treasury.fund(&ctx.admin, &1_000_000);

    let unregistered_vault = Address::generate(&ctx.env);
    let recipient = Address::generate(&ctx.env);
    let result = ctx.treasury.try_pay_interest(&unregistered_vault, &recipient, &100);
    assert_eq!(result, Err(Ok(Error::NotRegisteredVault)));
}

#[test]
fn pay_interest_pays_registered_vault() {
    let ctx = setup();
    ctx.token_admin.mint(&ctx.admin, &1_000_000);
    ctx.treasury.fund(&ctx.admin, &1_000_000);

    let vault = Address::generate(&ctx.env);
    ctx.factory.register(&vault);
    let recipient = Address::generate(&ctx.env);

    let paid = ctx.treasury.pay_interest(&vault, &recipient, &250);
    assert_eq!(paid, 250);
    assert_eq!(ctx.token.balance(&recipient), 250);
    assert_eq!(ctx.treasury.get_balance(), 1_000_000 - 250);
    assert_eq!(ctx.treasury.get_total_paid(), 250);
}

#[test]
fn pay_interest_caps_at_available_balance() {
    let ctx = setup();
    ctx.token_admin.mint(&ctx.admin, &100);
    ctx.treasury.fund(&ctx.admin, &100);

    let vault = Address::generate(&ctx.env);
    ctx.factory.register(&vault);
    let recipient = Address::generate(&ctx.env);

    let paid = ctx.treasury.pay_interest(&vault, &recipient, &10_000);
    assert_eq!(paid, 100);
    assert_eq!(ctx.treasury.get_balance(), 0);
}

#[test]
fn pay_interest_rejects_zero_amount() {
    let ctx = setup();
    let vault = Address::generate(&ctx.env);
    ctx.factory.register(&vault);
    let recipient = Address::generate(&ctx.env);

    let result = ctx.treasury.try_pay_interest(&vault, &recipient, &0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn double_initialize_fails() {
    let ctx = setup();
    let result = ctx.treasury.try_initialize(&ctx.admin, &ctx.token.address, &ctx.factory.address);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}
