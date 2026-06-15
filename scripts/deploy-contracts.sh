#!/usr/bin/env bash
# Deploys the full Nest contract suite to Stellar Testnet and wires the
# pieces together (token, strategy, treasury, factory). Idempotent per
# resource is NOT guaranteed — re-running deploys fresh contract instances
# each time. See docs/deployment.md for the manual walkthrough this script
# automates and for how to point an existing backend at newly deployed ids.
set -euo pipefail
cd "$(dirname "$0")/../contracts"

NETWORK="${NETWORK:-testnet}"
DEPLOYER="${DEPLOYER:-nest-deployer}"
ASSET_CODE="${ASSET_CODE:-NUSD}"

if ! stellar keys address "$DEPLOYER" >/dev/null 2>&1; then
  echo "==> Generating and funding deployer identity '$DEPLOYER'"
  stellar keys generate "$DEPLOYER" --network "$NETWORK" --fund
fi
ADMIN=$(stellar keys address "$DEPLOYER")
echo "==> Deployer: $ADMIN"

echo "==> Building contracts"
bash ../scripts/build-contracts.sh >/dev/null

echo "==> Deploying $ASSET_CODE token (Stellar Asset Contract)"
TOKEN=$(stellar contract asset deploy --asset "$ASSET_CODE:$ADMIN" --source "$DEPLOYER" --network "$NETWORK" 2>&1 | tail -1)
echo "    TOKEN=$TOKEN"

echo "==> Uploading goal-vault Wasm"
VAULT_HASH=$(stellar contract upload --wasm target/wasm32v1-none/release/goal_vault.wasm --source "$DEPLOYER" --network "$NETWORK" 2>&1 | tail -1)
echo "    VAULT_HASH=$VAULT_HASH"

echo "==> Deploying mock-strategy"
MOCK_STRATEGY=$(stellar contract deploy --wasm target/wasm32v1-none/release/mock_strategy.wasm --source "$DEPLOYER" --network "$NETWORK" 2>&1 | tail -1)
echo "    MOCK_STRATEGY=$MOCK_STRATEGY"

echo "==> Deploying treasury"
TREASURY=$(stellar contract deploy --wasm target/wasm32v1-none/release/treasury.wasm --source "$DEPLOYER" --network "$NETWORK" 2>&1 | tail -1)
echo "    TREASURY=$TREASURY"

echo "==> Deploying goal-factory"
FACTORY=$(stellar contract deploy --wasm target/wasm32v1-none/release/goal_factory.wasm --source "$DEPLOYER" --network "$NETWORK" 2>&1 | tail -1)
echo "    FACTORY=$FACTORY"

echo "==> Initializing mock-strategy (500 bps / 5% APY)"
stellar contract invoke --id "$MOCK_STRATEGY" --source "$DEPLOYER" --network "$NETWORK" -- initialize --admin "$ADMIN" --apy_bps 500 >/dev/null

echo "==> Initializing treasury"
stellar contract invoke --id "$TREASURY" --source "$DEPLOYER" --network "$NETWORK" -- initialize --admin "$ADMIN" --token "$TOKEN" --factory "$FACTORY" >/dev/null

echo "==> Initializing goal-factory"
stellar contract invoke --id "$FACTORY" --source "$DEPLOYER" --network "$NETWORK" -- initialize \
  --admin "$ADMIN" --vault_wasm_hash "$VAULT_HASH" --token "$TOKEN" --treasury "$TREASURY" --default_strategy "$MOCK_STRATEGY" >/dev/null

echo "==> Funding treasury with 100,000 $ASSET_CODE (issuer -> treasury acts as mint for a classic-asset-backed SAC)"
stellar contract invoke --id "$TOKEN" --source "$DEPLOYER" --network "$NETWORK" -- transfer --from "$ADMIN" --to "$TREASURY" --amount 1000000000000 >/dev/null

cat <<EOF

==================================================================
Deployment complete on $NETWORK. Add these to backend/.env:

USDC_TOKEN_CONTRACT_ID="$TOKEN"
MOCK_STRATEGY_CONTRACT_ID="$MOCK_STRATEGY"
TREASURY_CONTRACT_ID="$TREASURY"
GOAL_FACTORY_CONTRACT_ID="$FACTORY"

Vault Wasm hash (informational, stored on-chain in the factory):
$VAULT_HASH

Deployer / admin account: $ADMIN
==================================================================
EOF
