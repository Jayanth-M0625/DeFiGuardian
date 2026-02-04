/**
 * Complete integration example: ZK Voting → FROST Signing → On-chain Execution
 * This demonstrates the full Guardian Protocol security flow from attack detection to coordinated response.
 */
/// <reference types="node" />

import { ethers } from 'ethers';
import {
  performDKG,
  FROSTCoordinator,
  FROSTParticipant,
  verifyFROSTSignature,
  DKGConfig,
  FROSTSignature,
} from '../src/index';

// --------------------------------------------------------
// PHASE 1: ONE-TIME SETUP (DKG)
// --------------------------------------------------------

async function setupGuardians() {
  console.log('\n🔧 PHASE 1: Setting up 10 guardians with DKG\n');
  const config: DKGConfig = {
    threshold: 7,
    totalParticipants: 10,
  };
  
  console.log('Performing Distributed Key Generation...');
  const dkgOutput = await performDKG(config);
  console.log('DKG Complete');
  console.log(`  Group Public Key: ${dkgOutput.groupPublicKey.toString('hex').slice(0, 32)}...`);
  console.log(`  Generated ${dkgOutput.guardianShares.length} shares`);
  
  // In production, each guardian would receive their share securely
  // For demo, we keep them all in memory
  
  return dkgOutput;
}

// --------------------------------------------------------
// PHASE 2: ATTACK DETECTION & ZK VOTING
// --------------------------------------------------------
async function detectAndVote(proposalId: string) {
  console.log('\nPHASE 2: Attack detected, initiating ZK voting\n');
  // Simulating ML bot detection
  console.log('ML Bot: Suspicious tx detected');
  console.log('  - Pattern: Flash loan attack preparation');
  console.log('  - Confidence: 93%');
  console.log('  - Target: Uniswap V4 pool on Polygon');
  
  // In real system, this would trigger:
  // 1. GuardianRegistry.initiateVote()
  // 2. ZKVoteVerifier.createProposal()
  // 3. Guardians notified off-chain
  
  console.log('\nGuardians voting...');
  
  // Simulate ZK voting
  const votes = {
    approve: 8,
    reject: 1,
    abstain: 1,
  };
  
  console.log('  ZK Voting Complete');
  console.log(`  Approve: ${votes.approve}`);
  console.log(`  Reject: ${votes.reject}`);
  console.log(`  Abstain: ${votes.abstain}`);
  console.log(`  Status: APPROVED (${votes.approve}/7 threshold)`);
  
  // Return which guardians approved (for FROST signing)
  return [0, 1, 2, 3, 4, 5, 7, 8]; // 8 guardians approved
}

// --------------------------------------------------------
// PHASE 3: FROST THRESHOLD SIGNATURE
// --------------------------------------------------------

async function createFROSTSignature(
  proposalId: string,
  dkgOutput: any,
  approvedGuardians: number[]
): Promise<FROSTSignature> {
  console.log('\n🔐 PHASE 3: Creating FROST threshold signature\n');
  
  // Setup coordinator
  const coordinator = new FROSTCoordinator(dkgOutput.groupPublicKey, 7);
  // Create participants from approved guardians
  const participants: FROSTParticipant[] = [];
  
  for (const guardianId of approvedGuardians) {
    const share = dkgOutput.guardianShares[guardianId];
    const participant = new FROSTParticipant(
      share.participantId,
      share.secretShare,
      share.publicKey,
      dkgOutput.groupPublicKey
    );
    participants.push(participant);
  }
  
  console.log(`Using ${participants.length} guardians for signing`);
  // Message to sign (proposal ID)
  const message = Buffer.from(proposalId.slice(2), 'hex');
  const sessionId = await coordinator.startSession(proposalId, message);
  
  // --- Round 1: Commitments ---
  console.log('\nRound 1: Collecting commitments...');
  
  for (const participant of participants) {
    const commitment = await participant.generateCommitment(sessionId);
    await coordinator.submitCommitment(sessionId, commitment.guardianId, commitment);
  }
  const status1 = coordinator.getSessionStatus(sessionId);
  console.log(`  Received ${status1?.commitmentsReceived}/${status1?.thresholdRequired} commitments`);
  // Get commitments for Round 2
  const commitments = await coordinator.getCommitmentList(sessionId);
  
  // --- Round 2: Signature Shares ---
  console.log('\nRound 2: Collecting signature shares...');
  for (const participant of participants) {
    const share = await participant.generateSignatureShare(sessionId, message, commitments);
    await coordinator.submitSignatureShare(sessionId, share.guardianId, share);
  }
  
  const status2 = coordinator.getSessionStatus(sessionId);
  console.log(`  Received ${status2?.signaturesReceived}/${status2?.thresholdRequired} signatures`);
  // --- Aggregate ---
  console.log('\nAggregating signature...');
  const signature = await coordinator.aggregateSignature(sessionId);
  
  // Verify locally
  const isValid = await verifyFROSTSignature(signature, message);
  console.log(`✓ FROST Signature created and verified: ${isValid ? 'VALID' : 'INVALID'}`);
  
  return signature;
}

// --------------------------------------------------------
// PHASE 4: ON-CHAIN EXECUTION
// --------------------------------------------------------

async function executeOnChain(
  proposalId: string,
  signature: FROSTSignature
) {
  console.log('\nPHASE 4: Executing on-chain\n');
  
  // In real system, this would submit to GuardianRegistry.executeProposal()
  console.log('Formatting signature for Solidity...');
  // Convert to Solidity-compatible format
  const R_hex = '0x' + signature.R.toString('hex');
  const z_hex = '0x' + signature.z.toString('hex');
  
  console.log(`  R: ${R_hex.slice(0, 18)}...${R_hex.slice(-8)}`);
  console.log(`  z: ${z_hex.slice(0, 18)}...${z_hex.slice(-8)}`);
  
  console.log('\nSimulating on-chain execution...');
  console.log('  1. Verify ZK vote passed (7/10 threshold) ✓');
  console.log('  2. Verify FROST signature ✓');
  console.log('  3. Execute security action: EMERGENCY_PAUSE ✓');
  
  console.log('\nProtocol paused successfully!');
  console.log('   Attack prevented, funds secure');
}

// --------------------------------------------------------
// MAIN FLOW
// --------------------------------------------------------

async function runCompleteFlow() {
  console.log('------------------------------------------------------');
  console.log('   GUARDIAN PROTOCOL - COMPLETE SECURITY FLOW DEMO');
  console.log('------------------------------------------------------');
  
  const startTime = Date.now();
  
  try {
    const proposalId = '0x' + Buffer.from('flash-loan-attack-polygon-001').toString('hex').padEnd(64, '0');
    const dkgOutput = await setupGuardians();     // Phase 1: Setup (one-time)
    const approvedGuardians = await detectAndVote(proposalId);  // Phase 2: Detection & Voting
    const signature = await createFROSTSignature(proposalId, dkgOutput, approvedGuardians); // Phase 3: FROST Signing
    await executeOnChain(proposalId, signature);  // Phase 4: On-chain Execution
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n-------------------------------------');
    console.log(`Complete flow executed in ${duration}s`);
    console.log('-------------------------------------\n');
    
  } catch (error) {
    console.error('\nError in flow:', error);
    throw error;
  }
}

// --------------------------------------------------------
// REAL-WORLD INTEGRATION EXAMPLE
// --------------------------------------------------------

/**
 * Example: How a Guardian Node would handle this flow
 */
async function guardianNodeIntegration() {
  console.log('\n📡 GUARDIAN NODE INTEGRATION EXAMPLE\n');
  // Guardian node receives alert from ML bot
  const alert = {
    type: 'FLASH_LOAN_ATTACK',
    confidence: 0.95,
    chain: 'polygon',
    target: '0xUniswapV4Pool...',
    timestamp: Date.now(),
  };
  
  console.log('Guardian Node received alert:', alert.type);
  // Step 1: Guardian reviews and decides to vote APPROVE
  console.log('Guardian reviewing evidence...');
  console.log('Decision: APPROVE emergency pause');

  // Step 2: Submit ZK vote (from zkVoteModule.ts)
  console.log('Submitting ZK vote...');
  // const zkModule = new ZKVoteModule(...);
  // await zkModule.vote({ proposalId, decision: 'APPROVE', ... });
  
  // Step 3: Wait for vote to finalize
  console.log('Waiting for other guardians to vote...');
  
  // Step 4: Vote passed, participate in FROST signing
  console.log('Vote passed! Participating in FROST signing...');
  // const participant = new FROSTParticipant(...);
  // const commitment = await participant.generateCommitment(sessionId);
  // ...(submit to coordinator)
  
  // Step 5: Submit aggregated signature on-chain
  console.log('FROST signature created, executing on-chain...');
  // const tx = await guardianRegistry.executeProposal(proposalId, R, z);
  
  console.log('✓ Security action executed!\n');
}

// --------------------------------------------------------
// RUN DEMO
// --------------------------------------------------------

if (require.main === module) {
  runCompleteFlow()
    .then(() => {
      console.log('\n💡 TIP: See guardianNodeIntegration() for real-world usage\n');
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export {
  setupGuardians,
  detectAndVote,
  createFROSTSignature,
  executeOnChain,
  guardianNodeIntegration,
};
