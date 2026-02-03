/**
 * Full test flow:
 *   1. All 10 guardians generate commitments
 *   2. All 10 submit commitments
 *   3. All 10 generate ZK proofs
 *   4. All 10 reveal votes
 *   5. Contract tallies and finalizes
 * Using snarkjs prover locally — no onchain deployment needed for proof tests
 */

import { groth16 } from 'snarkjs';
import { buildPoseidon, buildBabyjub } from 'circomlibjs';
import { utils } from 'ffjavascript';
import * as crypto from 'crypto';
import * as fs from 'fs';
import { generateCommitment, VoteDecision, GuardianPublicKey, generateProof } from '../scripts/zkVoteModule';
import path from 'path';

const ARTIFACTS_DIR = path.resolve(__dirname, '../artifacts');
const WASM_PATH = path.join(ARTIFACTS_DIR, 'GuardianVote_js', 'GuardianVote.wasm');
const ZKEY_PATH = path.join(ARTIFACTS_DIR, 'GuardianVote_final.zkey');
const VERIFICATION_KEY_PATH = path.join(ARTIFACTS_DIR, 'GuardianVote_verification_key.json');

// Initialize libs
let poseidon: any;
let babyJub: any;

async function initCrypto() {
  if (!poseidon) poseidon = await buildPoseidon();
  if (!babyJub) babyJub = await buildBabyjub();
  return { poseidon, babyJub };
}

// -- Mock guardian data (for testing with Baby Jubjub keys) ---
function generateValidSecret(): Buffer {
  const secret = crypto.randomBytes(32);
  secret[31] = secret[31] & 0x1F; // Keep only lower 5 bits of last byte
  return secret;
}

const GUARDIAN_SECRETS: Buffer[] = Array.from({ length: 10 }, () => generateValidSecret());
let GUARDIAN_PUB_KEYS: GuardianPublicKey[] = [];

const PROPOSAL_ID = '0x' + '1'.repeat(64); // mock proposal ID

// --- Helper: simulate one guardian voting ---
async function simulateGuardianVote(
  guardianId: number,
  decision: VoteDecision
) {
  const { poseidon: hash } = await initCrypto();
  const voteInput = {
    proposalId: PROPOSAL_ID,
    decision,
    guardianId,
    guardianSecret: GUARDIAN_SECRETS[guardianId],
  };

  // Step 1: generate commitment
  const { commitment, nonce } = await generateCommitment(voteInput);
  // Step 2: generate proof for local verification
  const voteValue = decision === 'APPROVE' ? 1 : decision === 'REJECT' ? 0 : 2;
  const commitmentHash = hash([
    BigInt(voteInput.guardianId),
    BigInt(voteValue),
    BigInt(nonce),
    BigInt(PROPOSAL_ID),
  ]);
  const circuitInput = {
    guardianId:     voteInput.guardianId,
    guardianSecret: utils.leBuff2int(voteInput.guardianSecret),
    vote:           voteValue,
    nonce:          nonce,
    proposalId:     BigInt(PROPOSAL_ID),
    commitment:     hash.F.toObject(commitmentHash),
    guardianPubKeys: GUARDIAN_PUB_KEYS,
  };
  const { proof, publicSignals } = await groth16.fullProve(circuitInput, WASM_PATH, ZKEY_PATH);

  // Step 3: verify locally
  const vk = JSON.parse(fs.readFileSync(VERIFICATION_KEY_PATH, "utf-8"));
  const isValid = await groth16.verify(vk, publicSignals, proof);
  return {
    guardianId,
    decision,
    commitment,
    isValid,
    proof,
  };
}

// --- Tests ===

async function testSingleVote() {
  console.log('\n[TEST] Single guardian vote proof');

  const result = await simulateGuardianVote(0, 'APPROVE');

  console.log(`  Guardian: ${result.guardianId}`);
  console.log(`  Decision: ${result.decision}`);
  console.log(`  Proof valid: ${result.isValid}`);

  if (!result.isValid) throw new Error('Proof verification failed');
  console.log('  ✓ PASSED');
}

async function testAllGuardianVote() {
  console.log('\n[TEST] All 10 guardians vote');

  const decisions: VoteDecision[] = [
    'APPROVE', 'APPROVE', 'APPROVE', 'APPROVE', 'APPROVE',
    'APPROVE', 'APPROVE', 'APPROVE', 'REJECT', 'ABSTAIN'
  ]; // 8 approve, 1 reject, 1 abstain

  const results = await Promise.all(
    decisions.map((d, i) => simulateGuardianVote(i, d))
  );
  const allValid = results.every(r => r.isValid);
  const approvals = results.filter(r => r.decision === 'APPROVE').length;
  const rejections = results.filter(r => r.decision === 'REJECT').length;
  const abstentions = results.filter(r => r.decision === 'ABSTAIN').length;
  console.log(`  All proofs valid: ${allValid}`);
  console.log(`  Approvals: ${approvals}, Rejections: ${rejections}, Abstentions: ${abstentions}`);
  console.log(`  Threshold (7) reached: ${approvals >= 7}`);
  if (!allValid) throw new Error('Some proofs failed');
  if (approvals < 7) throw new Error('Threshold not reached');
  console.log('  ✓ PASSED');
}

async function testInvalidGuardianId() {
    console.log('\n[TEST] Invalid guardian ID (should fail)');
    try {
      const { poseidon: hash } = await initCrypto();
      const commitmentHash = hash([BigInt(10), BigInt(1), BigInt('12345'), BigInt(PROPOSAL_ID)]);
      const circuitInput = {
        guardianId: 10, // Invalid ID
        guardianSecret: utils.leBuff2int(GUARDIAN_SECRETS[0]),
        vote: 1,
        nonce: '12345',
        proposalId: BigInt(PROPOSAL_ID),
        commitment: hash.F.toObject(commitmentHash),
        guardianPubKeys: GUARDIAN_PUB_KEYS,
      };
      await groth16.fullProve(circuitInput, WASM_PATH, ZKEY_PATH);
      throw new Error('Should have failed');
    } catch (e: any) {
      if (e.message.includes("Assert Failed") || e.message.includes("Constraint doesn't match")) {
        console.log('  ✓ PASSED — correctly rejected invalid guardian ID');
      } else {
        throw e;
      }
    }
  }

  async function testWrongSecret() {
    console.log('\n[TEST] Wrong guardian secret (should fail)');
    try {
      const { poseidon: hash } = await initCrypto();
      const commitmentHash = hash([BigInt(0), BigInt(1), BigInt('12345'), BigInt(PROPOSAL_ID)]);
      const wrongSecret = generateValidSecret(); // Generate a valid but wrong secret
      const circuitInput = {
        guardianId: 0,
        guardianSecret: utils.leBuff2int(wrongSecret),
        vote: 1,
        nonce: '12345',
        proposalId: BigInt(PROPOSAL_ID),
        commitment: hash.F.toObject(commitmentHash),
        guardianPubKeys: GUARDIAN_PUB_KEYS,
      };
      await groth16.fullProve(circuitInput, WASM_PATH, ZKEY_PATH);
      throw new Error('Should have failed');
    } catch (e: any) {
      if (e.message.includes("Assert Failed") || e.message.includes("Constraint doesn't match")) {
        console.log('  ✓ PASSED — correctly rejected wrong secret');
      } else {
        throw e;
      }
    }
  }

async function testTamperedCommitment() {
  console.log('\n[TEST] Tampered commitment (should fail)');
  try {
    const circuitInput = {
      guardianId: 0,
      guardianSecret: utils.leBuff2int(GUARDIAN_SECRETS[0]),
      vote: 1,
      nonce: '12345',
      proposalId: BigInt(PROPOSAL_ID),
      // commitment doesn't match hash(guardianId, vote, nonce, proposalId)
      commitment: '99999999',
      guardianPubKeys: GUARDIAN_PUB_KEYS,
    };
    await groth16.fullProve(circuitInput, WASM_PATH, ZKEY_PATH);
    throw new Error('Should have failed');
  } catch (e: any) {
    if (e.message.includes("Assert Failed") || e.message.includes("Constraint doesn't match")) {
        console.log('  ✓ PASSED — correctly rejected tampered commitment');
    } else {
        throw e;
    }
  }
}

// --- Run all tests ---
async function main() {
  console.log('-------------------------------------');
  console.log(' Guardian Protocol — ZK Vote Tests');
  console.log('-------------------------------------');

  // Init libs and generate guardian keys
  const { babyJub } = await initCrypto();
  const basePoint = [
    babyJub.F.e('995203441582195749578291179787384436505546430278305826713579947235728471134'),
    babyJub.F.e('5472060717959818805561601436314318772137091100104008585924551046643952123905')
  ];

  GUARDIAN_PUB_KEYS = GUARDIAN_SECRETS.map(secret => {
    const secretBigInt = utils.leBuff2int(secret);
    const pubKey = babyJub.mulPointEscalar(basePoint, secretBigInt);
    return [babyJub.F.toObject(pubKey[0]), babyJub.F.toObject(pubKey[1])];
  });

  console.log('\n✓ Generated 10 guardian key pairs');

  await testSingleVote();
  await testAllGuardianVote();
  await testInvalidGuardianId();
  await testWrongSecret();
  await testTamperedCommitment();

  console.log('\-------------------------------------');
  console.log(' All tests passed');
  console.log('-------------------------------------');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
