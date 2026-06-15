use super::*;
use soroban_sdk::testutils::{Address as _, Ledger, StellarAssetContract};
use soroban_sdk::Env;

const YEAR: u64 = 31_536_000;
const DAY: u64 = 86_400;

#[contract]
struct TestStrategy;

#[contractimpl]
impl TestStrategy {
    pub fn get_apy(env: Env) -> u32 {
        env.storage().instance().get(&symbol_short!("apy")).unwrap_or(500)
    }

    pub fn set_apy(env: Env, apy: u32) {
        env.storage().instance().set(&symbol_short!("apy"), &apy);
    }
}

#[contract]
struct TestTreasury;

#[contractimpl]
impl TestTreasury {
    pub fn init(env: Env, token: Address) {
        env.storage().instance().set(&symbol_short!("token"), &token);
    }

    pub fn pay_interest(env: Env, _vault: Address, recipient: Address, amount: i128) -> i128 {
        let token_addr: Address = env.storage().instance().get(&symbol_short!("token")).unwrap();
        let client = token::Client::new(&env, &token_addr);
        let available = client.balance(&env.current_contract_address());
        let payout = if amount > available { available } else { amount };
        if payout > 0 {
            client.transfer(&env.current_contract_address(), &recipient, &payout);
        }
        payout
    }
}

struct TestCtx<'a> {
    env: Env,
    vault: GoalVaultClient<'a>,
    owner: Address,
    token: token::Client<'a>,
    treasury_id: Address,
    strategy: Address,
}

fn setup<'a>(target: i128, unlock_offset: u64) -> TestCtx<'a> {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().with_mut(|li| li.timestamp = 1_700_000_000);

    let owner = Address::generate(&env);
    let issuer = Address::generate(&env);
    let sac: StellarAssetContract = env.register_stellar_asset_contract_v2(issuer.clone());
    let token_id = sac.address();
    let token = token::Client::new(&env, &token_id);
    let token_admin = token::StellarAssetClient::new(&env, &token_id);
    token_admin.mint(&owner, &1_000_000_000);

    let strategy_id = env.register(TestStrategy, ());

    let treasury_id = env.register(TestTreasury, ());
    let treasury_client_init = TestTreasuryClient::new(&env, &treasury_id);
    treasury_client_init.init(&token_id);
    token_admin.mint(&treasury_id, &1_000_000_000);

    let factory = Address::generate(&env);
    let vault_id = env.register(GoalVault, ());
    let vault = GoalVaultClient::new(&env, &vault_id);

    let now = env.ledger().timestamp();
    vault.initialize(
        &1u64,
        &owner,
        &String::from_str(&env, "MacBook Pro"),
        &String::from_str(&env, "laptop"),
        &target,
        &(now + unlock_offset),
        &strategy_id,
        &token_id,
        &treasury_id,
        &factory,
    );

    TestCtx {
        env,
        vault,
        owner,
        token,
        treasury_id,
        strategy: strategy_id,
    }
}

#[test]
fn initialize_sets_goal_fields() {
    let ctx = setup(25_000_000_000, YEAR);
    let goal = ctx.vault.get_goal();
    assert_eq!(goal.owner, ctx.owner);
    assert_eq!(goal.target_amount, 25_000_000_000);
    assert_eq!(goal.deposited_amount, 0);
    assert!(!goal.completed);
    assert!(!goal.paused);
    assert!(!goal.closed);
}

#[test]
fn double_initialize_fails() {
    let ctx = setup(1000, YEAR);
    let now = ctx.env.ledger().timestamp();
    let result = ctx.vault.try_initialize(
        &1u64,
        &ctx.owner,
        &String::from_str(&ctx.env, "x"),
        &String::from_str(&ctx.env, "x"),
        &1000,
        &(now + YEAR),
        &ctx.strategy,
        &ctx.token.address,
        &ctx.treasury_id,
        &ctx.owner,
    );
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn deposit_accumulates_and_can_complete_goal() {
    let ctx = setup(1000, YEAR);
    let new_total = ctx.vault.deposit(&600);
    assert_eq!(new_total, 600);
    assert!(!ctx.vault.get_goal().completed);

    let new_total = ctx.vault.deposit(&400);
    assert_eq!(new_total, 1000);
    assert!(ctx.vault.get_goal().completed);
    assert_eq!(ctx.token.balance(&ctx.owner), 1_000_000_000 - 1000);
}

#[test]
fn deposit_rejects_zero_amount() {
    let ctx = setup(1000, YEAR);
    let result = ctx.vault.try_deposit(&0);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));
}

#[test]
#[should_panic]
fn deposit_without_owner_auth_panics() {
    let env = Env::default();
    env.ledger().with_mut(|li| li.timestamp = 1_700_000_000);

    let owner = Address::generate(&env);
    let issuer = Address::generate(&env);
    let sac: StellarAssetContract = env.register_stellar_asset_contract_v2(issuer.clone());
    let token_id = sac.address();

    let strategy_id = env.register(TestStrategy, ());
    let treasury_id = env.register(TestTreasury, ());
    let factory = Address::generate(&env);
    let vault_id = env.register(GoalVault, ());
    let vault = GoalVaultClient::new(&env, &vault_id);

    // Initialize with mocked auth so setup succeeds...
    env.mock_all_auths();
    vault.initialize(
        &1u64,
        &owner,
        &String::from_str(&env, "x"),
        &String::from_str(&env, "x"),
        &1000,
        &(env.ledger().timestamp() + YEAR),
        &strategy_id,
        &token_id,
        &treasury_id,
        &factory,
    );

    // ...then clear mocked auths so the next call has no authorization.
    env.set_auths(&[]);
    vault.deposit(&100);
}

#[test]
fn withdraw_prevents_over_withdrawal() {
    let ctx = setup(1000, YEAR);
    ctx.vault.deposit(&300);
    let result = ctx.vault.try_withdraw(&301);
    assert_eq!(result, Err(Ok(Error::InsufficientBalance)));
}

#[test]
fn withdraw_returns_funds_and_uncompletes_goal() {
    let ctx = setup(1000, YEAR);
    ctx.vault.deposit(&1000);
    assert!(ctx.vault.get_goal().completed);

    let remaining = ctx.vault.withdraw(&500);
    assert_eq!(remaining, 500);
    assert!(!ctx.vault.get_goal().completed);
    assert_eq!(ctx.token.balance(&ctx.owner), 1_000_000_000 - 500);
}

#[test]
fn interest_accrues_linearly_over_six_months_and_one_year() {
    let ctx = setup(1_000_000_000, YEAR * 2);
    ctx.vault.deposit(&100_0000000); // 100 units (7 decimals convention)

    ctx.env.ledger().with_mut(|li| li.timestamp += YEAR / 2);
    let six_month_interest = ctx.vault.calculate_interest();
    // 100 * 5% * 0.5 = 2.5
    assert_eq!(six_month_interest, 2_5000000);

    ctx.env.ledger().with_mut(|li| li.timestamp += YEAR / 2);
    let one_year_interest = ctx.vault.calculate_interest();
    // 100 * 5% * 1.0 = 5.0
    assert_eq!(one_year_interest, 5_0000000);
}

#[test]
fn claim_pulls_interest_from_treasury() {
    let ctx = setup(1_000_000_000, YEAR * 2);
    ctx.vault.deposit(&100_0000000);
    ctx.env.ledger().with_mut(|li| li.timestamp += YEAR);

    let paid = ctx.vault.claim();
    assert_eq!(paid, 5_0000000);
    assert_eq!(ctx.vault.get_goal().claimed_interest, 5_0000000);
    assert_eq!(ctx.vault.get_goal().accrued_interest, 0);
}

#[test]
fn claim_with_nothing_accrued_fails() {
    let ctx = setup(1000, YEAR);
    let result = ctx.vault.try_claim();
    assert_eq!(result, Err(Ok(Error::NothingToClaim)));
}

#[test]
fn pause_freezes_interest_accrual() {
    let ctx = setup(1_000_000_000, YEAR * 2);
    ctx.vault.deposit(&100_0000000);
    ctx.env.ledger().with_mut(|li| li.timestamp += YEAR / 2);

    ctx.vault.pause();
    let interest_at_pause = ctx.vault.calculate_interest();
    assert_eq!(interest_at_pause, 2_5000000);

    ctx.env.ledger().with_mut(|li| li.timestamp += YEAR / 2);
    let interest_after_time_while_paused = ctx.vault.calculate_interest();
    assert_eq!(interest_after_time_while_paused, interest_at_pause);
}

#[test]
fn resume_restarts_accrual_clock() {
    let ctx = setup(1_000_000_000, YEAR * 3);
    ctx.vault.deposit(&100_0000000);
    ctx.env.ledger().with_mut(|li| li.timestamp += YEAR / 2);
    ctx.vault.pause();
    ctx.env.ledger().with_mut(|li| li.timestamp += YEAR / 2);
    ctx.vault.resume();
    ctx.env.ledger().with_mut(|li| li.timestamp += YEAR / 2);

    let interest = ctx.vault.calculate_interest();
    // 2.5 accrued pre-pause + 2.5 accrued post-resume (another half year)
    assert_eq!(interest, 5_0000000);
}

#[test]
fn deposit_while_paused_fails() {
    let ctx = setup(1000, YEAR);
    ctx.vault.pause();
    let result = ctx.vault.try_deposit(&100);
    assert_eq!(result, Err(Ok(Error::GoalPaused)));
}

#[test]
fn double_pause_fails() {
    let ctx = setup(1000, YEAR);
    ctx.vault.pause();
    let result = ctx.vault.try_pause();
    assert_eq!(result, Err(Ok(Error::AlreadyPaused)));
}

#[test]
fn resume_without_pause_fails() {
    let ctx = setup(1000, YEAR);
    let result = ctx.vault.try_resume();
    assert_eq!(result, Err(Ok(Error::NotPaused)));
}

#[test]
fn change_target_can_trigger_completion() {
    let ctx = setup(1000, YEAR);
    ctx.vault.deposit(&500);
    assert!(!ctx.vault.get_goal().completed);

    ctx.vault.change_target(&400);
    assert!(ctx.vault.get_goal().completed);
}

#[test]
fn change_target_rejects_non_positive() {
    let ctx = setup(1000, YEAR);
    let result = ctx.vault.try_change_target(&0);
    assert_eq!(result, Err(Ok(Error::InvalidTarget)));
}

#[test]
fn extend_deadline_must_move_forward() {
    let ctx = setup(1000, YEAR);
    let goal = ctx.vault.get_goal();
    let result = ctx.vault.try_extend_deadline(&goal.unlock_date);
    assert_eq!(result, Err(Ok(Error::InvalidDeadline)));

    ctx.vault.extend_deadline(&(goal.unlock_date + DAY));
    assert_eq!(ctx.vault.get_goal().unlock_date, goal.unlock_date + DAY);
}

#[test]
fn get_progress_reports_expired_after_deadline() {
    let ctx = setup(1000, DAY);
    assert!(!ctx.vault.get_progress().expired);

    ctx.env.ledger().with_mut(|li| li.timestamp += DAY * 2);
    assert!(ctx.vault.get_progress().expired);
}

#[test]
fn get_progress_percent_bps_matches_deposit_ratio() {
    let ctx = setup(1000, YEAR);
    ctx.vault.deposit(&250);
    let progress = ctx.vault.get_progress();
    assert_eq!(progress.percent_bps, 2_500); // 25.00%
    assert_eq!(progress.remaining, 750);
}

#[test]
fn close_goal_returns_principal_and_interest() {
    let ctx = setup(1_000_000_000, YEAR * 2);
    ctx.vault.deposit(&100_0000000);
    ctx.env.ledger().with_mut(|li| li.timestamp += YEAR);

    let (principal, interest) = ctx.vault.close_goal();
    assert_eq!(principal, 100_0000000);
    assert_eq!(interest, 5_0000000);
    assert!(ctx.vault.get_goal().closed);

    let result = ctx.vault.try_deposit(&1);
    assert_eq!(result, Err(Ok(Error::GoalClosed)));
}

#[test]
fn double_close_fails() {
    let ctx = setup(1000, YEAR);
    ctx.vault.close_goal();
    let result = ctx.vault.try_close_goal();
    assert_eq!(result, Err(Ok(Error::AlreadyClosed)));
}

#[test]
fn multiple_sequential_deposits_track_running_total() {
    let ctx = setup(10_000, YEAR);
    for amount in [100, 200, 300, 400] {
        ctx.vault.deposit(&amount);
    }
    assert_eq!(ctx.vault.get_goal().deposited_amount, 1000);
}
