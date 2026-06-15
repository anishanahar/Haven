#!/usr/bin/env bash
# Builds every Nest contract to wasm32v1-none (the target the Soroban
# Environment requires on Rust 1.84+) in release mode.
#
# Order matters: goal-vault must be built *before* goal-factory's test
# suite runs, because goal-factory's tests dynamically deploy a real
# goal-vault Wasm binary (contractimport! embeds it at compile time) to
# exercise the factory's deployer logic end-to-end.
set -euo pipefail
cd "$(dirname "$0")/../contracts"

TARGET=wasm32v1-none

echo "==> Building goal-vault ($TARGET, release)"
cargo build --target "$TARGET" --release -p goal-vault

echo "==> Building remaining contracts ($TARGET, release)"
cargo build --target "$TARGET" --release \
  -p nest-common -p mock-strategy -p treasury -p goal-factory

echo "==> Wasm artifacts:"
find "target/$TARGET/release" -maxdepth 1 -name "*.wasm" -exec ls -lh {} \;
