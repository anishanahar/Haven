use super::*;
use soroban_sdk::testutils::Address as _;

fn setup(env: &Env) -> (MockStrategyClient<'_>, Address) {
    let contract_id = env.register(MockStrategy, ());
    let client = MockStrategyClient::new(env, &contract_id);
    let admin = Address::generate(env);
    (client, admin)
}

#[test]
fn initialize_sets_default_apy() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    client.initialize(&admin, &DEFAULT_APY_BPS);
    assert_eq!(client.get_apy(), DEFAULT_APY_BPS);
    assert_eq!(client.get_admin(), admin);
}

#[test]
fn double_initialize_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    client.initialize(&admin, &DEFAULT_APY_BPS);
    let result = client.try_initialize(&admin, &DEFAULT_APY_BPS);
    assert_eq!(result, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn admin_can_update_apy() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    client.initialize(&admin, &DEFAULT_APY_BPS);
    client.set_apy(&admin, &750);
    assert_eq!(client.get_apy(), 750);
}

#[test]
fn non_admin_cannot_update_apy() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);
    let stranger = Address::generate(&env);

    client.initialize(&admin, &DEFAULT_APY_BPS);
    let result = client.try_set_apy(&stranger, &750);
    assert!(result.is_err());
}

#[test]
fn rejects_apy_above_max() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    let result = client.try_initialize(&admin, &(MAX_APY_BPS + 1));
    assert_eq!(result, Err(Ok(Error::InvalidApy)));
}

#[test]
fn rejects_zero_apy() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, admin) = setup(&env);

    let result = client.try_initialize(&admin, &0);
    assert_eq!(result, Err(Ok(Error::InvalidApy)));
}

#[test]
fn get_apy_before_initialize_returns_default() {
    let env = Env::default();
    let (client, _admin) = setup(&env);
    assert_eq!(client.get_apy(), DEFAULT_APY_BPS);
}
