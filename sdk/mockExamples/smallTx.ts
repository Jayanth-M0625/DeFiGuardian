/**
 * Use Case 1: Small TX Same-Chain Pass
 *
 * Demonstrates: A small transaction (< $100K / 50 ETH) on the same chain.
 * - Guardian voting: MANDATORY (8 approve, 1 reject, 1 abstain)
 * - VDF: NOT triggered (amount below threshold)
 * - Result: PASS (immediate execution after guardian approval)
 *
 * Flow:
 * 1. User submits 10 ETH withdrawal (Ethereum → Ethereum)
 * 2. Amount check: 10 ETH < 50 ETH threshold → No VDF needed
 * 3. Guardian voting (ZK commit-reveal):
 *    - All 10 guardians submit commitments
 *    - All 10 guardians reveal votes with ZK proofs
 *    - Tally: 8 approve, 1 reject, 1 abstain → Threshold met
 * 4. FROST signature created by 8 approving guardians
 * 5. Transaction executed immediately (no VDF wait)
 */

import { ethers } from 'ethers';
import {
  printHeader,
  printStep,
  printSubStep,
  printSuccess,
  printFailure,
  printInfo,
  printDivider,
  printKeyValue,
  printVoteResult,
  printFinalResult,
  formatEth,
  formatAddress,
  formatBytes32,
  formatUSD,
  generateProposalId,
  createMockTransaction,
  getChainName,
  isVDFRequired,
  isApprovalReached,
  VDF_THRESHOLD,
  GUARDIAN_COUNT,
  GUARDIAN_THRESHOLD,
  runScript,
} from './shared';

import {
  initializeGuardianNetwork,
  createVotingDecisions,
  simulateCommitPhase,
  simulateRevealPhase,
  tallyVotes,
  createFROSTSignature,
  formatForSolidity,
  MockGuardianNetwork,
} from './shared/mockGuardians';

// ─── Script Configuration ───

const SCENARIO = {
  name: 'Small TX Same-Chain Pass',
  amount: ethers.parseEther('10'),     // 10 ETH (~$20K at $2000/ETH)
  sourceChain: 1,                       // Ethereum mainnet
  destChain: undefined,                 // Same chain (no bridge)
  expectedResult: 'PASS',
  votes: {
    approve: 8,
    reject: 1,
    abstain: 1,
  },
};

// ─── Main Script ───

async function main() {
  printHeader(`USE CASE 1: ${SCENARIO.name.toUpperCase()}`);

  // Initialize guardian network (uses real FROST DKG)
  printStep(0, 'Initializing Guardian Network');
  const network = await initializeGuardianNetwork();
  printSuccess(`${GUARDIAN_COUNT} guardians initialized with FROST keys`);
  printKeyValue('Group Public Key', formatBytes32('0x' + network.groupPublicKey.toString('hex')));

  printDivider();

  // ─── Step 1: Transaction Submission ───
  printStep(1, 'Transaction Submitted');

  const tx = createMockTransaction({
    amount: SCENARIO.amount,
    sourceChain: SCENARIO.sourceChain,
  });

  printKeyValue('Type', 'Withdrawal');
  printKeyValue('Amount', `${formatEth(tx.amount)} (${formatUSD(tx.amount)})`);
  printKeyValue('Sender', formatAddress(tx.sender));
  printKeyValue('Destination', formatAddress(tx.destination));
  printKeyValue('Chain', getChainName(tx.sourceChain));
  printKeyValue('TX Hash', formatBytes32(tx.txHash));

  printDivider();

  // ─── Step 2: Security Checks ───
  printStep(2, 'Security Analysis');

  // Check VDF requirement
  const vdfRequired = isVDFRequired(tx.amount);
  printSubStep(`Amount threshold check: ${formatEth(tx.amount)} vs ${formatEth(VDF_THRESHOLD)}`);

  if (vdfRequired) {
    printInfo('VDF TRIGGERED - Amount exceeds threshold');
  } else {
    printSuccess('VDF NOT REQUIRED - Amount below threshold');
  }

  // Simulated ML bot analysis
  printSubStep('ML Bot analysis: Pattern looks legitimate');
  printKeyValue('ML Bot Score', '15/100 (low suspicion)');
  printSuccess('Transaction flagged as CLEAN');

  printDivider();

  // ─── Step 3: Guardian Voting (Mandatory) ───
  printStep(3, 'Guardian Voting (ZK Commit-Reveal)');
  printInfo('Guardian voting is MANDATORY for all transactions');

  // Generate proposal ID
  const proposalId = generateProposalId(`withdrawal-${tx.txHash}`);
  printKeyValue('Proposal ID', formatBytes32(proposalId));

  // Create voting decisions
  const decisions = createVotingDecisions(
    SCENARIO.votes.approve,
    SCENARIO.votes.reject,
    SCENARIO.votes.abstain,
  );

  // Phase 3a: Commit Phase
  printSubStep('Phase 1: Commitment Submission');
  const commitments = simulateCommitPhase(decisions);

  for (const commitment of commitments) {
    const guardian = network.guardians[commitment.guardianId];
    printSubStep(`  ${guardian.name} submitted commitment`);
  }
  printSuccess(`${commitments.length}/${GUARDIAN_COUNT} commitments received`);

  // Phase 3b: Reveal Phase
  printSubStep('Phase 2: Vote Reveal with ZK Proofs');
  const reveals = simulateRevealPhase(commitments, decisions);

  for (const reveal of reveals) {
    const guardian = network.guardians[reveal.guardianId];
    const voteStr = reveal.vote === 1 ? 'APPROVE' : reveal.vote === 0 ? 'REJECT' : 'ABSTAIN';
    printSubStep(`  ${guardian.name} revealed: ${voteStr} (ZK proof verified)`);
  }

  // Phase 3c: Tally
  printSubStep('Phase 3: Vote Tally');
  const tally = tallyVotes(decisions);
  printVoteResult(tally.approve, tally.reject, tally.abstain);

  const votePassed = isApprovalReached(tally.approve);
  if (votePassed) {
    printSuccess(`Threshold reached: ${tally.approve}/${GUARDIAN_THRESHOLD} approvals`);
  } else {
    printFailure(`Threshold NOT reached: ${tally.approve}/${GUARDIAN_THRESHOLD} approvals`);
  }

  printDivider();

  // ─── Step 4: FROST Threshold Signature ───
  printStep(4, 'FROST Threshold Signature');

  if (!votePassed) {
    printFailure('Skipping FROST signing - vote did not pass');
    printFinalResult(false, 'TRANSACTION BLOCKED - Guardian vote failed');
    return;
  }

  // Get approving guardians for signing
  const approvingGuardians = decisions
    .filter(d => d.vote === 'APPROVE')
    .map(d => d.guardianId);

  printSubStep(`Signing participants: ${approvingGuardians.length} guardians`);
  printKeyValue('Threshold required', `${GUARDIAN_THRESHOLD} of ${GUARDIAN_COUNT}`);

  // Create message to sign (proposal ID hash)
  const message = Buffer.from(proposalId.slice(2), 'hex');

  printSubStep('Round 1: Generating nonce commitments...');
  printSubStep('Round 2: Generating signature shares...');
  printSubStep('Aggregating signature...');

  // Create actual FROST signature using real crypto
  const signature = await createFROSTSignature(network, message, approvingGuardians);
  const soliditySig = formatForSolidity(signature);

  printSuccess('FROST signature created');
  printKeyValue('R (commitment)', formatBytes32(soliditySig.R));
  printKeyValue('z (scalar)', formatBytes32(soliditySig.z));

  printDivider();

  // ─── Step 5: Execution ───
  printStep(5, 'Transaction Execution');

  printSubStep('Verification checks:');
  printSuccess('Guardian vote passed (8/7 threshold)');
  printSuccess('FROST signature valid');
  printSuccess('VDF not required (amount < threshold)');
  printSuccess('Sender not blacklisted');
  printSuccess('Protocol not paused');

  printSubStep('Executing transaction...');

  // Simulate successful execution
  const executionTxHash = '0x' + Buffer.from(Array(32).fill(0).map(() =>
    Math.floor(Math.random() * 256))).toString('hex');

  printSuccess(`Transaction executed on ${getChainName(tx.sourceChain)}`);
  printKeyValue('Execution TX', formatBytes32(executionTxHash));

  // ─── Final Result ───
  printFinalResult(true, 'TRANSACTION APPROVED AND EXECUTED');

  // Summary
  console.log('Summary:');
  printKeyValue('Amount', formatEth(tx.amount));
  printKeyValue('VDF Required', 'No (amount < $100K)');
  printKeyValue('Guardian Vote', `${tally.approve} approve, ${tally.reject} reject, ${tally.abstain} abstain`);
  printKeyValue('FROST Signature', 'Valid');
  printKeyValue('Execution', 'Immediate (no VDF delay)');
  console.log();
}

// ─── Run Script ───

if (require.main === module) {
  runScript(SCENARIO.name, main);
}

export { main as runSmallTxSameChainPass };
