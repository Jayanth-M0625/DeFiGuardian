#!/bin/bash
# Setup contracts for deployment
# Copies all contracts from different libs to a single folder

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$DEPLOY_DIR")"
OUT_DIR="$DEPLOY_DIR/all-contracts"

echo "Setting up contracts for deployment..."

# Clean and create output directory
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

# Copy main contracts
echo "Copying main contracts..."
cp "$ROOT_DIR/contracts/SecurityMiddleware.sol" "$OUT_DIR/"
cp "$ROOT_DIR/contracts/GuardianRegistry.sol" "$OUT_DIR/"
cp "$ROOT_DIR/contracts/CrossChainMessenger.sol" "$OUT_DIR/"

# Copy interfaces
echo "Copying interfaces..."
mkdir -p "$OUT_DIR/interfaces"
cp "$ROOT_DIR/contracts/interfaces/"*.sol "$OUT_DIR/interfaces/" 2>/dev/null || true

# Copy VDF contracts
echo "Copying VDF contracts..."
cp "$ROOT_DIR/lib/vdf/contracts/VDFVerifier.sol" "$OUT_DIR/"

# Copy FROST contracts
echo "Copying FROST contracts..."
cp "$ROOT_DIR/lib/frost/contracts/FROSTVerifier.sol" "$OUT_DIR/"

# Copy ZK contracts
echo "Copying ZK contracts..."
cp "$ROOT_DIR/lib/zk/contracts/GuardianVoteVerifier.sol" "$OUT_DIR/"
cp "$ROOT_DIR/lib/zk/contracts/ZKVoteVerifier.sol" "$OUT_DIR/"

echo "Contracts copied to: $OUT_DIR"
ls -la "$OUT_DIR"
