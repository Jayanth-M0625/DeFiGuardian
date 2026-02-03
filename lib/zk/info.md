### Groth16
This setup lives inside the guardian node 
- Circom circuits compiled separately
- SnarkJS runs proof generation at runtime inside guardian node
- ZKVoteVerifier.sol -> verifies proofs on chain

Integration points:
- guardian-node calls snarkjs.prove() when guardian clicks APPROVE/REJECT
- Proof is submitted to ZKVoteVerifier.sol during reveal phase
- Dashboard triggers the vote -> guardian node handles all ZK complexity invisibly

## Complete Flow: Attack Detection → Execution
```
┌─────────────────────────────────────────────────────────────────┐
│ 1. DETECTION                                                    │
└─────────────────────────────────────────────────────────────────┘
Guardian Node (running on say Polygon)
  ├── ML model detects flash loan attack
  ├── Broadcasts alert to other 9 guardians (P2P network)
  └── All 10 guardians independently verify evidence

┌─────────────────────────────────────────────────────────────────┐
│ 2. PROPOSAL INITIATION                                          │
└─────────────────────────────────────────────────────────────────┘
Any Guardian Node calls:
  GuardianRegistry.initiateVote(
    proposalId:    hash(attack_details),
    action:        EMERGENCY_PAUSE,
    targetAddress: 0x0,
    description:   "Flash loan attack on Polygon pool X"
  )
  ↓
  
GuardianRegistry:
  ├── Stores proposal details
  └── Calls ZKVoteVerifier.createProposal()
  
  ↓
  
ZKVoteVerifier:
  ├── Creates new proposal with 5-minute commit deadline
  └── Emits ProposalCreated event

┌─────────────────────────────────────────────────────────────────┐
│ 3. COMMIT PHASE (5 minutes)                                     │
└─────────────────────────────────────────────────────────────────┘

Each Guardian (via dashboard click "APPROVE"):
  guardian-node/zkVoteModule.ts:
    ├── generateCommitment()
    │   └── commitment = Poseidon(guardianId, vote, nonce, proposalId)
    │
    └── submitCommitment()
        └── ZKVoteVerifier.submitCommitment(proposalId, commitment, slot)
  
  ZKVoteVerifier checks:
    msg.sender == guardianAddresses[slot]
    block.timestamp <= commitDeadline
    slot hasnt committed yet
  
  Emits: CommitmentSubmitted(proposalId, slot, commitment)

After 5 minutes OR all 10 committed → commit phase ends

┌─────────────────────────────────────────────────────────────────┐
│ 4. REVEAL PHASE                                                 │
└─────────────────────────────────────────────────────────────────┘

Each Guardian (automatic after commit phase):
  guardian-node/zkVoteModule.ts:
    ├── Waits for all commits (polls contract)
    │
    ├── generateProof()  (takes 2-5 seconds)
    │   ├── Builds circuit witness
    │   ├── Calls snarkjs.groth16.prove()
    │   └── Returns: { proof, vote }
    │
    └── submitReveal()
        └── ZKVoteVerifier.revealVote(proposalId, slot, vote, proof)
  
  ZKVoteVerifier checks:
    ✓ block.timestamp > commitDeadline
    ✓ msg.sender == guardianAddresses[slot]
    ✓ slot hasn't revealed yet
    ✓ ZK proof verifies (proves: valid guardian, vote matches commitment)
  
  Tallies vote:
    approvals++  OR  rejections++  OR  abstentions++
  
  If approvals >= threshold (7):
    └── Emits ProposalFinalized(proposalId, 8, 1, 1, true)

┌─────────────────────────────────────────────────────────────────┐
│ 5. FROST SIGNING (Off-Chain)                                    │
└─────────────────────────────────────────────────────────────────┘
Guardian nodes listen for ProposalFinalized event
  ↓
8 guardians who voted APPROVE participate in FROST signing:
  
  Round 1: Generate nonce commitments
  Round 2: Compute signature shares
  Aggregate: Combine into single Schnorr signature
  Output: frostSignature (R, z)

┌─────────────────────────────────────────────────────────────────┐
│ 6. EXECUTION                                                    │
└─────────────────────────────────────────────────────────────────┘

Any guardian submits:
  GuardianRegistry.executeProposal(proposalId, frostSignature)
  ↓
  
GuardianRegistry:
  ├── Checks ZKVoteVerifier: proposal finalized? approvals >= threshold?
  ├── Verifies FROST signature
  └── Executes action:
      
      EMERGENCY_PAUSE:
        ├── Sets isPaused = true
        └── Emits Paused(eventId, reason)
      
      BLACKLIST_ADDRESS:
        ├── Adds address to blacklist
        └── Emits AddressBlacklisted(address, eventId)
      
      THRESHOLD_INCREASE:
        ├── Increments currentThreshold (7 → 8)
        └── Emits ThresholdIncreased(7, 8, eventId)

┌─────────────────────────────────────────────────────────────────┐
│ 7. CROSS-CHAIN PROPAGATION (if multi-chain attack)              │
└─────────────────────────────────────────────────────────────────┘

If attack affects multiple chains:
  
  GuardianRegistry on source chain:
    └── Creates SecurityEvent message with FROST signature
        └── Sends via LayerZero to all chains
  
  GuardianRegistry on destination chains:
    ├── Receives message via LayerZero
    ├── Verifies FROST signature
    └── Executes same action (pause, blacklist, etc.)
  
  All chains secured within 30 seconds
```