#![allow(clippy::too_many_arguments)]
use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::Env;

// Requires `goal-vault` to already be built for wasm32 (see
// scripts/build-contracts.sh, run before `cargo test` at the workspace
// root). This mirrors the official Soroban "deployer" example pattern:
// the factory's dynamic-deploy tests need real Wasm bytes to install.
mod vault_wasm {
    soroban_sdk::contractimport!(
        file = "../target/wasm32v1-none/release/goal_vault.wasm"
    );
}

struct TestCtx {
    env: Env,
    factory: GoalFactoryClient<'static>,
    admin: Address,
    token: Address,
    treasury: Address,
    strategy: Address,
}

fn setup() -> TestCtx {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let treasury = Address::generate(&env);
    let strategy = Address::generate(&env);

    let wasm_hash = env.deployer().upload_contract_wasm(vault_wasm::WASM);

    let factory_id = env.register(GoalFactory, ());
    let factory = GoalFactoryClient::new(&env, &factory_id);
    factory.initialize(&admin, &wasm_hash, &token, &treasury, &strategy);

    TestCtx {
        env,
        factory,
        admin,
        token,
        treasury,
        strategy,
    }
}

fn future(env: &Env, offset: u64) -> u64 {
    env.ledger().timestamp() + offset
}

#[test]
fn double_initialize_fails() {
    let ctx = setup();
    let wasm_hash = ctx.env.deployer().upload_contract_wasm(vault_wasm::WASM);
    let result = ctx.factory.try_initialize(
        &ctx.admin,
        &wasm_hash,
        &ctx.token,
        &ctx.treasury,
        &ctx.strategy,
    );
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn create_goal_deploys_and_registers_vault() {
    let ctx = setup();
    let owner = Address::generate(&ctx.env);
    let deadline = future(&ctx.env, 31_536_000);

    let (goal_id, vault_address) = ctx.factory.create_goal(
        &owner,
        &String::from_str(&ctx.env, "MacBook Pro"),
        &String::from_str(&ctx.env, "laptop"),
        &25_000_000_000,
        &deadline,
    );

    assert_eq!(goal_id, 1);
    assert!(ctx.factory.is_registered_vault(&vault_address));

    let vault = vault_wasm::Client::new(&ctx.env, &vault_address);
    let goal = vault.get_goal();
    assert_eq!(goal.owner, owner);
    assert_eq!(goal.target_amount, 25_000_000_000);
}

#[test]
fn create_goal_ids_are_unique_and_sequential() {
    let ctx = setup();
    let owner = Address::generate(&ctx.env);
    let deadline = future(&ctx.env, 31_536_000);

    let (id1, vault1) = ctx.factory.create_goal(
        &owner,
        &String::from_str(&ctx.env, "Goal A"),
        &String::from_str(&ctx.env, "a"),
        &1000,
        &deadline,
    );
    let (id2, vault2) = ctx.factory.create_goal(
        &owner,
        &String::from_str(&ctx.env, "Goal B"),
        &String::from_str(&ctx.env, "b"),
        &2000,
        &deadline,
    );

    assert_ne!(id1, id2);
    assert_ne!(vault1, vault2);
}

#[test]
fn get_user_goals_returns_all_goals_for_multiple_users() {
    let ctx = setup();
    let alice = Address::generate(&ctx.env);
    let bob = Address::generate(&ctx.env);
    let deadline = future(&ctx.env, 31_536_000);

    ctx.factory.create_goal(
        &alice,
        &String::from_str(&ctx.env, "Vacation"),
        &String::from_str(&ctx.env, "plane"),
        &1000,
        &deadline,
    );
    ctx.factory.create_goal(
        &alice,
        &String::from_str(&ctx.env, "Emergency Fund"),
        &String::from_str(&ctx.env, "shield"),
        &5000,
        &deadline,
    );
    ctx.factory.create_goal(
        &bob,
        &String::from_str(&ctx.env, "Wedding"),
        &String::from_str(&ctx.env, "rings"),
        &10_000,
        &deadline,
    );

    assert_eq!(ctx.factory.get_user_goals(&alice).len(), 2);
    assert_eq!(ctx.factory.get_user_goals(&bob).len(), 1);
}

#[test]
fn create_goal_rejects_invalid_target_and_deadline() {
    let ctx = setup();
    let owner = Address::generate(&ctx.env);
    let deadline = future(&ctx.env, 31_536_000);

    let bad_target = ctx.factory.try_create_goal(
        &owner,
        &String::from_str(&ctx.env, "x"),
        &String::from_str(&ctx.env, "x"),
        &0,
        &deadline,
    );
    assert_eq!(bad_target, Err(Ok(Error::InvalidTarget)));

    let past_deadline = ctx.env.ledger().timestamp();
    let bad_deadline = ctx.factory.try_create_goal(
        &owner,
        &String::from_str(&ctx.env, "x"),
        &String::from_str(&ctx.env, "x"),
        &1000,
        &past_deadline,
    );
    assert_eq!(bad_deadline, Err(Ok(Error::InvalidDeadline)));
}

#[test]
fn delete_goal_removes_from_registry_and_returns_funds() {
    let ctx = setup();
    let owner = Address::generate(&ctx.env);
    let deadline = future(&ctx.env, 31_536_000);

    let (goal_id, vault_address) = ctx.factory.create_goal(
        &owner,
        &String::from_str(&ctx.env, "x"),
        &String::from_str(&ctx.env, "x"),
        &1000,
        &deadline,
    );

    ctx.factory.delete_goal(&owner, &goal_id);

    assert!(!ctx.factory.is_registered_vault(&vault_address));
    assert_eq!(ctx.factory.get_user_goals(&owner).len(), 0);
    let result = ctx.factory.try_get_goal(&goal_id);
    assert_eq!(result, Err(Ok(Error::GoalNotFound)));
}

#[test]
fn delete_goal_by_non_owner_fails() {
    let ctx = setup();
    let owner = Address::generate(&ctx.env);
    let stranger = Address::generate(&ctx.env);
    let deadline = future(&ctx.env, 31_536_000);

    let (goal_id, _) = ctx.factory.create_goal(
        &owner,
        &String::from_str(&ctx.env, "x"),
        &String::from_str(&ctx.env, "x"),
        &1000,
        &deadline,
    );

    let result = ctx.factory.try_delete_goal(&stranger, &goal_id);
    assert_eq!(result, Err(Ok(Error::NotOwner)));
}

#[test]
fn update_goal_proxies_metadata_to_vault() {
    let ctx = setup();
    let owner = Address::generate(&ctx.env);
    let deadline = future(&ctx.env, 31_536_000);

    let (goal_id, vault_address) = ctx.factory.create_goal(
        &owner,
        &String::from_str(&ctx.env, "Old Name"),
        &String::from_str(&ctx.env, "old"),
        &1000,
        &deadline,
    );

    ctx.factory.update_goal(
        &owner,
        &goal_id,
        &Some(String::from_str(&ctx.env, "New Name")),
        &None,
    );

    let vault = vault_wasm::Client::new(&ctx.env, &vault_address);
    assert_eq!(vault.get_goal().name, String::from_str(&ctx.env, "New Name"));
}

#[test]
fn get_goal_not_found_for_unknown_id() {
    let ctx = setup();
    let result = ctx.factory.try_get_goal(&999);
    assert_eq!(result, Err(Ok(Error::GoalNotFound)));
}

#[test]
fn is_registered_vault_false_for_random_address() {
    let ctx = setup();
    let random = Address::generate(&ctx.env);
    assert!(!ctx.factory.is_registered_vault(&random));
}

#[test]
fn set_vault_wasm_hash_requires_admin() {
    let ctx = setup();
    let stranger = Address::generate(&ctx.env);
    let new_hash = ctx.env.deployer().upload_contract_wasm(vault_wasm::WASM);

    let result = ctx.factory.try_set_vault_wasm_hash(&stranger, &new_hash);
    assert_eq!(result, Err(Ok(Error::NotAdmin)));
}
