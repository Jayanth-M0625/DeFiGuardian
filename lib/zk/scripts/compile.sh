#!/bin/bash
# Compiles Circom circuit → WASM + R1CS → generates proving key
# Run this once before deploying the guardian node, or whenever you change the circuit
# Output goes to /artifacts/
# artifacts must ship with guardian node package
#
# Requirements:
#   - circom 2.x
#   - snarkjs
#   - download powersOfTau28_hez_final_12.ptau from https://github.com/advaita-saha/zk-hashVerifier/blob/master/powersOfTau28_hez_final_12.ptau and place it in artifacts/

set -e

CIRCUIT_NAME="GuardianVote"
CIRCUITS_DIR="../circuits"
ARTIFACTS_DIR="../artifacts"
CEREMONY_FILE="powersOfTau28_hez_final_12.ptau"

echo "-------------------------"
echo " ZK circuit compilation"
echo "-------------------------"

mkdir -p $ARTIFACTS_DIR

# Compile Circom → WASM + R1CS
echo ""
echo "[1/5] Compiling circuit..."
circom $CIRCUITS_DIR/$CIRCUIT_NAME.circom \
  --wasm \
  --r1cs \
  --output $ARTIFACTS_DIR

echo "  ✓ $CIRCUIT_NAME.wasm"
echo "  ✓ $CIRCUIT_NAME.r1cs"

# ─── Check for .ptau ───
echo ""
echo "[2/5] Checking Powers of Tau ceremony file..."
if [ ! -f "$ARTIFACTS_DIR/$CEREMONY_FILE" ]; then
  echo "  ✗ ERROR: $CEREMONY_FILE not found!"
  echo "  Please download powersOfTau28_hez_final_12.ptau and place it in artifacts/"
  echo "  wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau -O artifacts/powersOfTau28_hez_final_12.ptau"
  exit 1
else
  echo "  ✓ Found ptau file"
fi

# --- Prepare ceremony for our circuit ---
echo ""
echo "[3/5] Preparing ceremony for circuit..."
snarkjs pt2 \
  $ARTIFACTS_DIR/$CEREMONY_FILE \
  $ARTIFACTS_DIR/${CIRCUIT_NAME}_prepared.ptau

echo "  ✓ Prepared phase 2"

# ─── Generate .zkey ───
echo ""
echo "[4/5] Generating proving key..."
snarkjs g16s \
  $ARTIFACTS_DIR/$CIRCUIT_NAME.r1cs \
  $ARTIFACTS_DIR/${CIRCUIT_NAME}_prepared.ptau \
  $ARTIFACTS_DIR/${CIRCUIT_NAME}_0000.zkey

echo "  ✓ Initial zkey generated"

echo "  Contributing to ceremony..."
echo "guardian protocol random entropy $(date +%s)" | snarkjs zkc \
  $ARTIFACTS_DIR/${CIRCUIT_NAME}_0000.zkey \
  $ARTIFACTS_DIR/${CIRCUIT_NAME}_final.zkey \
  --name="guardian-protocol-hackathon"

echo "  ✓ Final zkey ready"

# ───Export Solidity verifier ───
echo ""
echo "[5/5] Exporting Solidity verifier contract..."
snarkjs zkev \
  $ARTIFACTS_DIR/${CIRCUIT_NAME}_final.zkey \
  $ARTIFACTS_DIR/${CIRCUIT_NAME}_verification_key.json

snarkjs zkesv \
  $ARTIFACTS_DIR/${CIRCUIT_NAME}_final.zkey \
  ../contracts/${CIRCUIT_NAME}Verifier.sol

echo "  ✓ Solidity verifier exported to contracts/"

# ─── Cleanup intermediate files───
rm -f $ARTIFACTS_DIR/${CIRCUIT_NAME}_0000.zkey
rm -f $ARTIFACTS_DIR/${CIRCUIT_NAME}_prepared.ptau

echo ""
echo "---------------------------------------------"
echo " Done"
echo "   $ARTIFACTS_DIR/$CIRCUIT_NAME.wasm"
echo "   $ARTIFACTS_DIR/${CIRCUIT_NAME}_final.zkey"
echo "   ../contracts/${CIRCUIT_NAME}Verifier.sol"
echo ""---------------------------------------------""
