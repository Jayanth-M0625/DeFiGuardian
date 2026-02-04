/**x
 * Comprehensive test suite for FROST implementation
 */

//testing log:
/*
(base) adityamane@Adityas-MacBook-Air-2 frost % npm test

> @guardian-protocol/frost@0.1.0 test
> ts-node test/frost.test.ts

[TEST] Starting FROST test suite...

[TEST] Test 1: DKG generates valid key shares for 7-of-10 threshold
[DKG] Generating 7-of-10 threshold scheme
[DKG] Master polynomial generated
[DKG] Group public key derived: c39a749a375ae8f5...
[DKG] Generated share for guardian 0
[DKG] Generated share for guardian 1
[DKG] Generated share for guardian 2
[DKG] Generated share for guardian 3
[DKG] Generated share for guardian 4
[DKG] Generated share for guardian 5
[DKG] Generated share for guardian 6
[DKG] Generated share for guardian 7
[DKG] Generated share for guardian 8
[DKG] Generated share for guardian 9
[DKG] All shares generated successfully
[TEST] ✓ Test 1 PASSED

[TEST] Test 2: 7 guardians can create a valid FROST signature
[DKG] Generating 7-of-10 threshold scheme
[DKG] Master polynomial generated
[DKG] Group public key derived: 976f299f25cf9881...
[DKG] Generated share for guardian 0
[DKG] Generated share for guardian 1
[DKG] Generated share for guardian 2
[DKG] Generated share for guardian 3
[DKG] Generated share for guardian 4
[DKG] Generated share for guardian 5
[DKG] Generated share for guardian 6
[DKG] Generated share for guardian 7
[DKG] Generated share for guardian 8
[DKG] Generated share for guardian 9
[DKG] All shares generated successfully
[Coordinator] Starting session 371884f92eb0e313539b487979caeb9b for proposal test-proposal-123
[TEST]   Round 1: Collecting commitments from 7 guardians...
[Participant 0] Generating commitment for session 371884f92eb0e313539b487979caeb9b
[Participant 0] Commitment generated
[Coordinator] Commitment received from guardian 0 (1/7 needed)
[Participant 1] Generating commitment for session 371884f92eb0e313539b487979caeb9b
[Participant 1] Commitment generated
[Coordinator] Commitment received from guardian 1 (2/7 needed)
[Participant 2] Generating commitment for session 371884f92eb0e313539b487979caeb9b
[Participant 2] Commitment generated
[Coordinator] Commitment received from guardian 2 (3/7 needed)
[Participant 3] Generating commitment for session 371884f92eb0e313539b487979caeb9b
[Participant 3] Commitment generated
[Coordinator] Commitment received from guardian 3 (4/7 needed)
[Participant 4] Generating commitment for session 371884f92eb0e313539b487979caeb9b
[Participant 4] Commitment generated
[Coordinator] Commitment received from guardian 4 (5/7 needed)
[Participant 5] Generating commitment for session 371884f92eb0e313539b487979caeb9b
[Participant 5] Commitment generated
[Coordinator] Commitment received from guardian 5 (6/7 needed)
[Participant 6] Generating commitment for session 371884f92eb0e313539b487979caeb9b
[Participant 6] Commitment generated
[Coordinator] Commitment received from guardian 6 (7/7 needed)
[Coordinator] Session 371884f92eb0e313539b487979caeb9b ready for signature phase
[TEST]   Round 2: Collecting signature shares from 7 guardians...
[Participant 0] Generating signature share for session 371884f92eb0e313539b487979caeb9b
[Participant 0] Signature share generated
[Coordinator] Signature share received from guardian 0 (1/7 needed)
[Participant 1] Generating signature share for session 371884f92eb0e313539b487979caeb9b
[Participant 1] Signature share generated
[Coordinator] Signature share received from guardian 1 (2/7 needed)
[Participant 2] Generating signature share for session 371884f92eb0e313539b487979caeb9b
[Participant 2] Signature share generated
[Coordinator] Signature share received from guardian 2 (3/7 needed)
[Participant 3] Generating signature share for session 371884f92eb0e313539b487979caeb9b
[Participant 3] Signature share generated
[Coordinator] Signature share received from guardian 3 (4/7 needed)
[Participant 4] Generating signature share for session 371884f92eb0e313539b487979caeb9b
[Participant 4] Signature share generated
[Coordinator] Signature share received from guardian 4 (5/7 needed)
[Participant 5] Generating signature share for session 371884f92eb0e313539b487979caeb9b
[Participant 5] Signature share generated
[Coordinator] Signature share received from guardian 5 (6/7 needed)
[Participant 6] Generating signature share for session 371884f92eb0e313539b487979caeb9b
[Participant 6] Signature share generated
[Coordinator] Signature share received from guardian 6 (7/7 needed)
[Coordinator] Session 371884f92eb0e313539b487979caeb9b ready for aggregation
[TEST]   Aggregating signature...
[Coordinator] Aggregating signature for session 371884f92eb0e313539b487979caeb9b
[Aggregator] Starting signature aggregation
[Aggregator] Group commitment R computed
[Aggregator] Signature scalar z computed
[Verifier] Signature verification: VALID ✓
[Aggregator] Signature aggregation complete and verified
[Coordinator] Session 371884f92eb0e313539b487979caeb9b complete
[Verifier] Signature verification: VALID ✓
[TEST] ✓ Test 2 PASSED

[TEST] Test 3: 8 guardians (more than threshold) can create valid signature
[DKG] Generating 7-of-10 threshold scheme
[DKG] Master polynomial generated
[DKG] Group public key derived: 8975c14c6432f6eb...
[DKG] Generated share for guardian 0
[DKG] Generated share for guardian 1
[DKG] Generated share for guardian 2
[DKG] Generated share for guardian 3
[DKG] Generated share for guardian 4
[DKG] Generated share for guardian 5
[DKG] Generated share for guardian 6
[DKG] Generated share for guardian 7
[DKG] Generated share for guardian 8
[DKG] Generated share for guardian 9
[DKG] All shares generated successfully
[Coordinator] Starting session 6abb347bfbe86a50cbdb358ab18567c0 for proposal test-proposal-456
[Participant 0] Generating commitment for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 0] Commitment generated
[Coordinator] Commitment received from guardian 0 (1/7 needed)
[Participant 1] Generating commitment for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 1] Commitment generated
[Coordinator] Commitment received from guardian 1 (2/7 needed)
[Participant 2] Generating commitment for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 2] Commitment generated
[Coordinator] Commitment received from guardian 2 (3/7 needed)
[Participant 3] Generating commitment for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 3] Commitment generated
[Coordinator] Commitment received from guardian 3 (4/7 needed)
[Participant 4] Generating commitment for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 4] Commitment generated
[Coordinator] Commitment received from guardian 4 (5/7 needed)
[Participant 5] Generating commitment for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 5] Commitment generated
[Coordinator] Commitment received from guardian 5 (6/7 needed)
[Participant 6] Generating commitment for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 6] Commitment generated
[Coordinator] Commitment received from guardian 6 (7/7 needed)
[Coordinator] Session 6abb347bfbe86a50cbdb358ab18567c0 ready for signature phase
[Participant 0] Generating signature share for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 0] Signature share generated
[Coordinator] Signature share received from guardian 0 (1/7 needed)
[Participant 1] Generating signature share for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 1] Signature share generated
[Coordinator] Signature share received from guardian 1 (2/7 needed)
[Participant 2] Generating signature share for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 2] Signature share generated
[Coordinator] Signature share received from guardian 2 (3/7 needed)
[Participant 3] Generating signature share for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 3] Signature share generated
[Coordinator] Signature share received from guardian 3 (4/7 needed)
[Participant 4] Generating signature share for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 4] Signature share generated
[Coordinator] Signature share received from guardian 4 (5/7 needed)
[Participant 5] Generating signature share for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 5] Signature share generated
[Coordinator] Signature share received from guardian 5 (6/7 needed)
[Participant 6] Generating signature share for session 6abb347bfbe86a50cbdb358ab18567c0
[Participant 6] Signature share generated
[Coordinator] Signature share received from guardian 6 (7/7 needed)
[Coordinator] Session 6abb347bfbe86a50cbdb358ab18567c0 ready for aggregation
[Coordinator] Aggregating signature for session 6abb347bfbe86a50cbdb358ab18567c0
[Aggregator] Starting signature aggregation
[Aggregator] Group commitment R computed
[Aggregator] Signature scalar z computed
[Verifier] Signature verification: VALID ✓
[Aggregator] Signature aggregation complete and verified
[Coordinator] Session 6abb347bfbe86a50cbdb358ab18567c0 complete
[Verifier] Signature verification: VALID ✓
[TEST] ✓ Test 3 PASSED

[TEST] Test 4: Different guardian subsets produce different valid signatures for same message
[DKG] Generating 7-of-10 threshold scheme
[DKG] Master polynomial generated
[DKG] Group public key derived: 503bea22d6e38e0c...
[DKG] Generated share for guardian 0
[DKG] Generated share for guardian 1
[DKG] Generated share for guardian 2
[DKG] Generated share for guardian 3
[DKG] Generated share for guardian 4
[DKG] Generated share for guardian 5
[DKG] Generated share for guardian 6
[DKG] Generated share for guardian 7
[DKG] Generated share for guardian 8
[DKG] Generated share for guardian 9
[DKG] All shares generated successfully
[Coordinator] Starting session 7ca29461f1e1adb0843f3842c681f36b for proposal proposal-1
[Participant 0] Generating commitment for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 0] Commitment generated
[Coordinator] Commitment received from guardian 0 (1/7 needed)
[Participant 1] Generating commitment for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 1] Commitment generated
[Coordinator] Commitment received from guardian 1 (2/7 needed)
[Participant 2] Generating commitment for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 2] Commitment generated
[Coordinator] Commitment received from guardian 2 (3/7 needed)
[Participant 3] Generating commitment for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 3] Commitment generated
[Coordinator] Commitment received from guardian 3 (4/7 needed)
[Participant 4] Generating commitment for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 4] Commitment generated
[Coordinator] Commitment received from guardian 4 (5/7 needed)
[Participant 5] Generating commitment for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 5] Commitment generated
[Coordinator] Commitment received from guardian 5 (6/7 needed)
[Participant 6] Generating commitment for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 6] Commitment generated
[Coordinator] Commitment received from guardian 6 (7/7 needed)
[Coordinator] Session 7ca29461f1e1adb0843f3842c681f36b ready for signature phase
[Participant 0] Generating signature share for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 0] Signature share generated
[Coordinator] Signature share received from guardian 0 (1/7 needed)
[Participant 1] Generating signature share for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 1] Signature share generated
[Coordinator] Signature share received from guardian 1 (2/7 needed)
[Participant 2] Generating signature share for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 2] Signature share generated
[Coordinator] Signature share received from guardian 2 (3/7 needed)
[Participant 3] Generating signature share for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 3] Signature share generated
[Coordinator] Signature share received from guardian 3 (4/7 needed)
[Participant 4] Generating signature share for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 4] Signature share generated
[Coordinator] Signature share received from guardian 4 (5/7 needed)
[Participant 5] Generating signature share for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 5] Signature share generated
[Coordinator] Signature share received from guardian 5 (6/7 needed)
[Participant 6] Generating signature share for session 7ca29461f1e1adb0843f3842c681f36b
[Participant 6] Signature share generated
[Coordinator] Signature share received from guardian 6 (7/7 needed)
[Coordinator] Session 7ca29461f1e1adb0843f3842c681f36b ready for aggregation
[Coordinator] Aggregating signature for session 7ca29461f1e1adb0843f3842c681f36b
[Aggregator] Starting signature aggregation
[Aggregator] Group commitment R computed
[Aggregator] Signature scalar z computed
[Verifier] Signature verification: VALID ✓
[Aggregator] Signature aggregation complete and verified
[Coordinator] Session 7ca29461f1e1adb0843f3842c681f36b complete
[Coordinator] Starting session 9a6e9efdc679d90c641c0e87ee4084db for proposal proposal-2
[Participant 3] Generating commitment for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 3] Commitment generated
[Coordinator] Commitment received from guardian 3 (1/7 needed)
[Participant 4] Generating commitment for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 4] Commitment generated
[Coordinator] Commitment received from guardian 4 (2/7 needed)
[Participant 5] Generating commitment for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 5] Commitment generated
[Coordinator] Commitment received from guardian 5 (3/7 needed)
[Participant 6] Generating commitment for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 6] Commitment generated
[Coordinator] Commitment received from guardian 6 (4/7 needed)
[Participant 7] Generating commitment for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 7] Commitment generated
[Coordinator] Commitment received from guardian 7 (5/7 needed)
[Participant 8] Generating commitment for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 8] Commitment generated
[Coordinator] Commitment received from guardian 8 (6/7 needed)
[Participant 9] Generating commitment for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 9] Commitment generated
[Coordinator] Commitment received from guardian 9 (7/7 needed)
[Coordinator] Session 9a6e9efdc679d90c641c0e87ee4084db ready for signature phase
[Participant 3] Generating signature share for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 3] Signature share generated
[Coordinator] Signature share received from guardian 3 (1/7 needed)
[Participant 4] Generating signature share for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 4] Signature share generated
[Coordinator] Signature share received from guardian 4 (2/7 needed)
[Participant 5] Generating signature share for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 5] Signature share generated
[Coordinator] Signature share received from guardian 5 (3/7 needed)
[Participant 6] Generating signature share for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 6] Signature share generated
[Coordinator] Signature share received from guardian 6 (4/7 needed)
[Participant 7] Generating signature share for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 7] Signature share generated
[Coordinator] Signature share received from guardian 7 (5/7 needed)
[Participant 8] Generating signature share for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 8] Signature share generated
[Coordinator] Signature share received from guardian 8 (6/7 needed)
[Participant 9] Generating signature share for session 9a6e9efdc679d90c641c0e87ee4084db
[Participant 9] Signature share generated
[Coordinator] Signature share received from guardian 9 (7/7 needed)
[Coordinator] Session 9a6e9efdc679d90c641c0e87ee4084db ready for aggregation
[Coordinator] Aggregating signature for session 9a6e9efdc679d90c641c0e87ee4084db
[Aggregator] Starting signature aggregation
[Aggregator] Group commitment R computed
[Aggregator] Signature scalar z computed
[Verifier] Signature verification: VALID ✓
[Aggregator] Signature aggregation complete and verified
[Coordinator] Session 9a6e9efdc679d90c641c0e87ee4084db complete
[Verifier] Signature verification: VALID ✓
[Verifier] Signature verification: VALID ✓
[TEST] ✓ Test 4 PASSED

[TEST] Test 5: Invalid signature is properly rejected
[DKG] Generating 7-of-10 threshold scheme
[DKG] Master polynomial generated
[DKG] Group public key derived: cc8b4a8593fd8a9e...
[DKG] Generated share for guardian 0
[DKG] Generated share for guardian 1
[DKG] Generated share for guardian 2
[DKG] Generated share for guardian 3
[DKG] Generated share for guardian 4
[DKG] Generated share for guardian 5
[DKG] Generated share for guardian 6
[DKG] Generated share for guardian 7
[DKG] Generated share for guardian 8
[DKG] Generated share for guardian 9
[DKG] All shares generated successfully
[Coordinator] Starting session 75d216282609e7504b39e2d3203d7391 for proposal test-proposal
[Participant 0] Generating commitment for session 75d216282609e7504b39e2d3203d7391
[Participant 0] Commitment generated
[Coordinator] Commitment received from guardian 0 (1/7 needed)
[Participant 1] Generating commitment for session 75d216282609e7504b39e2d3203d7391
[Participant 1] Commitment generated
[Coordinator] Commitment received from guardian 1 (2/7 needed)
[Participant 2] Generating commitment for session 75d216282609e7504b39e2d3203d7391
[Participant 2] Commitment generated
[Coordinator] Commitment received from guardian 2 (3/7 needed)
[Participant 3] Generating commitment for session 75d216282609e7504b39e2d3203d7391
[Participant 3] Commitment generated
[Coordinator] Commitment received from guardian 3 (4/7 needed)
[Participant 4] Generating commitment for session 75d216282609e7504b39e2d3203d7391
[Participant 4] Commitment generated
[Coordinator] Commitment received from guardian 4 (5/7 needed)
[Participant 5] Generating commitment for session 75d216282609e7504b39e2d3203d7391
[Participant 5] Commitment generated
[Coordinator] Commitment received from guardian 5 (6/7 needed)
[Participant 6] Generating commitment for session 75d216282609e7504b39e2d3203d7391
[Participant 6] Commitment generated
[Coordinator] Commitment received from guardian 6 (7/7 needed)
[Coordinator] Session 75d216282609e7504b39e2d3203d7391 ready for signature phase
[Participant 0] Generating signature share for session 75d216282609e7504b39e2d3203d7391
[Participant 0] Signature share generated
[Coordinator] Signature share received from guardian 0 (1/7 needed)
[Participant 1] Generating signature share for session 75d216282609e7504b39e2d3203d7391
[Participant 1] Signature share generated
[Coordinator] Signature share received from guardian 1 (2/7 needed)
[Participant 2] Generating signature share for session 75d216282609e7504b39e2d3203d7391
[Participant 2] Signature share generated
[Coordinator] Signature share received from guardian 2 (3/7 needed)
[Participant 3] Generating signature share for session 75d216282609e7504b39e2d3203d7391
[Participant 3] Signature share generated
[Coordinator] Signature share received from guardian 3 (4/7 needed)
[Participant 4] Generating signature share for session 75d216282609e7504b39e2d3203d7391
[Participant 4] Signature share generated
[Coordinator] Signature share received from guardian 4 (5/7 needed)
[Participant 5] Generating signature share for session 75d216282609e7504b39e2d3203d7391
[Participant 5] Signature share generated
[Coordinator] Signature share received from guardian 5 (6/7 needed)
[Participant 6] Generating signature share for session 75d216282609e7504b39e2d3203d7391
[Participant 6] Signature share generated
[Coordinator] Signature share received from guardian 6 (7/7 needed)
[Coordinator] Session 75d216282609e7504b39e2d3203d7391 ready for aggregation
[Coordinator] Aggregating signature for session 75d216282609e7504b39e2d3203d7391
[Aggregator] Starting signature aggregation
[Aggregator] Group commitment R computed
[Aggregator] Signature scalar z computed
[Verifier] Signature verification: VALID ✓
[Aggregator] Signature aggregation complete and verified
[Coordinator] Session 75d216282609e7504b39e2d3203d7391 complete
[Verifier] Signature verification: INVALID ✗
[TEST] ✓ Test 5 PASSED

[TEST] 
========================================
[TEST] Tests Passed: 5
[TEST] Tests Failed: 0
[TEST] ========================================
*/

/// <reference types="node" />
import {
  performDKG,
  verifyShare,
  FROSTCoordinator,
  FROSTParticipant,
  verifyFROSTSignature,
  DKGConfig,
} from '../src/index';

// --- Test Utils ---
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function log(message: string): void {
  console.log(`[TEST] ${message}`);
}

// --- Test Suite ---
async function runTests() {
  log('Starting FROST test suite...\n');
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  // Test 1: DKG generates valid key shares
  try {
    log('Test 1: DKG generates valid key shares for 7-of-10 threshold');
    
    const config: DKGConfig = {
      threshold: 7,
      totalParticipants: 10,
    };
    
    const dkgOutput = await performDKG(config);
    
    assert(dkgOutput.guardianShares.length === 10, 'Should generate 10 shares');
    assert(dkgOutput.groupPublicKey.length === 32, 'Group public key should be 32 bytes');
    assert(dkgOutput.vssCommitments.length === 7, 'Should have 7 VSS commitments (degree 6)');
    
    // Verify each share
    for (const share of dkgOutput.guardianShares) {
      const isValid = verifyShare(share, dkgOutput.vssCommitments);
      assert(isValid, `Share ${share.participantId} should be valid`);
    }
    
    log('✓ Test 1 PASSED\n');
    testsPassed++;
  } catch (error) {
    log(`✗ Test 1 FAILED: ${error}\n`);
    testsFailed++;
  }
  
  // Test 2: 7 guardians can create valid signature
  try {
    log('Test 2: 7 guardians can create a valid FROST signature');
    
    // Setup DKG
    const config: DKGConfig = { threshold: 7, totalParticipants: 10 };
    const dkgOutput = await performDKG(config);
    
    // Create coordinator
    const coordinator = new FROSTCoordinator(dkgOutput.groupPublicKey, 7);
    
    // Create participants (use first 7 guardians)
    const participants: FROSTParticipant[] = [];
    for (let i = 0; i < 7; i++) {
      const share = dkgOutput.guardianShares[i];
      const participant = new FROSTParticipant(
        share.participantId,
        share.secretShare,
        share.publicKey,
        dkgOutput.groupPublicKey
      );
      participants.push(participant);
    }
    
    // Message to sign (proposal ID)
    const message = Buffer.from('test-proposal-123', 'utf-8');
    const sessionId = await coordinator.startSession('test-proposal-123', message);
    
    // Round 1: Collect commitments
    log('  Round 1: Collecting commitments from 7 guardians...');
    for (const participant of participants) {
      const commitment = await participant.generateCommitment(sessionId);
      await coordinator.submitCommitment(sessionId, commitment.guardianId, commitment);
    }
    
    // Get commitment list for Round 2
    const commitments = await coordinator.getCommitmentList(sessionId);
    assert(commitments.length === 7, 'Should have 7 commitments');
    
    // Round 2: Collect signature shares
    log('  Round 2: Collecting signature shares from 7 guardians...');
    for (const participant of participants) {
      const share = await participant.generateSignatureShare(sessionId, message, commitments);
      await coordinator.submitSignatureShare(sessionId, share.guardianId, share);
    }
    
    // Aggregate signature
    log('  Aggregating signature...');
    const signature = await coordinator.aggregateSignature(sessionId);
    
    assert(signature.R.length === 32, 'R should be 32 bytes');
    assert(signature.z.length === 32, 'z should be 32 bytes');
    
    // Verify signature
    const isValid = await verifyFROSTSignature(signature, message);
    assert(isValid, 'Signature should verify');
    
    log('✓ Test 2 PASSED\n');
    testsPassed++;
  } catch (error) {
    log(`✗ Test 2 FAILED: ${error}\n`);
    testsFailed++;
  }
  
  // Test 3: 8 guardians can also create valid signature
  try {
    log('Test 3: 8 guardians (more than threshold) can create valid signature');
    
    const config: DKGConfig = { threshold: 7, totalParticipants: 10 };
    const dkgOutput = await performDKG(config);
    const coordinator = new FROSTCoordinator(dkgOutput.groupPublicKey, 7);
    
    // Use 8 guardians
    const participants: FROSTParticipant[] = [];
    for (let i = 0; i < 8; i++) {
      const share = dkgOutput.guardianShares[i];
      participants.push(new FROSTParticipant(
        share.participantId,
        share.secretShare,
        share.publicKey,
        dkgOutput.groupPublicKey
      ));
    }
    
    const message = Buffer.from('test-proposal-456', 'utf-8');
    const sessionId = await coordinator.startSession('test-proposal-456', message);
    
    // Round 1
    // Only collect commitments from the required threshold number of participants
    for (let i = 0; i < coordinator.threshold; i++) {
      const participant = participants[i];
      const commitment = await participant.generateCommitment(sessionId);
      await coordinator.submitCommitment(sessionId, commitment.guardianId, commitment);
    }
    
    const commitments = await coordinator.getCommitmentList(sessionId);
    
    // Round 2
    // Only collect signature shares from the required threshold number of participants
    for (let i = 0; i < coordinator.threshold; i++) {
      const participant = participants[i];
      const share = await participant.generateSignatureShare(sessionId, message, commitments);
      await coordinator.submitSignatureShare(sessionId, share.guardianId, share);
    }
    
    const signature = await coordinator.aggregateSignature(sessionId);
    const isValid = await verifyFROSTSignature(signature, message);
    assert(isValid, 'Signature with 8 guardians should verify');
    
    log('✓ Test 3 PASSED\n');
    testsPassed++;
  } catch (error) {
    log(`✗ Test 3 FAILED: ${error}\n`);
    testsFailed++;
  }
  
  // Test 4: Different guardian subsets produce different but valid signatures
  try {
    log('Test 4: Different guardian subsets produce different valid signatures for same message');
    
    const config: DKGConfig = { threshold: 7, totalParticipants: 10 };
    const dkgOutput = await performDKG(config);
    const message = Buffer.from('same-message', 'utf-8');
    
    // Subset 1: Guardians 0-6
    const coordinator1 = new FROSTCoordinator(dkgOutput.groupPublicKey, 7);
    const participants1: FROSTParticipant[] = [];
    for (let i = 0; i < 7; i++) {
      const share = dkgOutput.guardianShares[i];
      participants1.push(new FROSTParticipant(
        share.participantId,
        share.secretShare,
        share.publicKey,
        dkgOutput.groupPublicKey
      ));
    }
    
    const sessionId1 = await coordinator1.startSession('proposal-1', message);
    
    for (const participant of participants1) {
      const commitment = await participant.generateCommitment(sessionId1);
      await coordinator1.submitCommitment(sessionId1, commitment.guardianId, commitment);
    }
    
    const commitments1 = await coordinator1.getCommitmentList(sessionId1);
    
    for (const participant of participants1) {
      const share = await participant.generateSignatureShare(sessionId1, message, commitments1);
      await coordinator1.submitSignatureShare(sessionId1, share.guardianId, share);
    }
    
    const signature1 = await coordinator1.aggregateSignature(sessionId1);
    
    // Subset 2: Guardians 3-9
    const coordinator2 = new FROSTCoordinator(dkgOutput.groupPublicKey, 7);
    const participants2: FROSTParticipant[] = [];
    for (let i = 3; i < 10; i++) {
      const share = dkgOutput.guardianShares[i];
      participants2.push(new FROSTParticipant(
        share.participantId,
        share.secretShare,
        share.publicKey,
        dkgOutput.groupPublicKey
      ));
    }
    
    const sessionId2 = await coordinator2.startSession('proposal-2', message);
    
    for (const participant of participants2) {
      const commitment = await participant.generateCommitment(sessionId2);
      await coordinator2.submitCommitment(sessionId2, commitment.guardianId, commitment);
    }
    
    const commitments2 = await coordinator2.getCommitmentList(sessionId2);
    
    for (const participant of participants2) {
      const share = await participant.generateSignatureShare(sessionId2, message, commitments2);
      await coordinator2.submitSignatureShare(sessionId2, share.guardianId, share);
    }
    
    const signature2 = await coordinator2.aggregateSignature(sessionId2);
    
    // Signatures should be different (different R due to different nonces)
    assert(!signature1.R.equals(signature2.R), 'R values should differ');
    
    // But both should verify
    const valid1 = await verifyFROSTSignature(signature1, message);
    const valid2 = await verifyFROSTSignature(signature2, message);
    assert(valid1, 'First signature should verify');
    assert(valid2, 'Second signature should verify');
    
    log('✓ Test 4 PASSED\n');
    testsPassed++;
  } catch (error) {
    log(`✗ Test 4 FAILED: ${error}\n`);
    testsFailed++;
  }
  
  // Test 5: Invalid signature is rejected
  try {
    log('Test 5: Invalid signature is properly rejected');
    
    const config: DKGConfig = { threshold: 7, totalParticipants: 10 };
    const dkgOutput = await performDKG(config);
    const coordinator = new FROSTCoordinator(dkgOutput.groupPublicKey, 7);
    
    const participants: FROSTParticipant[] = [];
    for (let i = 0; i < 7; i++) {
      const share = dkgOutput.guardianShares[i];
      participants.push(new FROSTParticipant(
        share.participantId,
        share.secretShare,
        share.publicKey,
        dkgOutput.groupPublicKey
      ));
    }
    
    const message = Buffer.from('test-message', 'utf-8');
    const sessionId = await coordinator.startSession('test-proposal', message);
    
    // Round 1 & 2
    for (const participant of participants) {
      const commitment = await participant.generateCommitment(sessionId);
      await coordinator.submitCommitment(sessionId, commitment.guardianId, commitment);
    }
    
    const commitments = await coordinator.getCommitmentList(sessionId);
    
    for (const participant of participants) {
      const share = await participant.generateSignatureShare(sessionId, message, commitments);
      await coordinator.submitSignatureShare(sessionId, share.guardianId, share);
    }
    
    const signature = await coordinator.aggregateSignature(sessionId);
    
    // Try verifying with wrong message
    const wrongMessage = Buffer.from('wrong-message', 'utf-8');
    const isValid = await verifyFROSTSignature(signature, wrongMessage);
    assert(!isValid, 'Signature should NOT verify with wrong message');
    
    log('✓ Test 5 PASSED\n');
    testsPassed++;
  } catch (error) {
    log(`✗ Test 5 FAILED: ${error}\n`);
    testsFailed++;
  }
  
  // Summary
  log('\n========================================');
  log(`Tests Passed: ${testsPassed}`);
  log(`Tests Failed: ${testsFailed}`);
  log('========================================\n');
  
  if (testsFailed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
