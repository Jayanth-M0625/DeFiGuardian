# FROST Threshold Signatures for Guardian Protocol
Flexible Round-Optimized Schnorr Threshold
Complete implementation of FROST signatures for 7-of-10 threshold security system.

## 📁 Directory Structure

```
lib/frost/
├── src/
│   ├── dkg.ts              # Distributed Key Generation
│   ├── coordinator.ts      # Signing session coordinator
│   ├── participant.ts      # Individual guardian operations
│   ├── aggregator.ts       # Signature aggregation & verification
│   ├── types.ts            # Ts interfaces
│   └── index.ts            # Main exports
├── contracts/
│   ├── FROSTVerifier.sol                    # On-chain signature verification
│   └── GuardianRegistryIntegration.sol      # GuardianRegistry contract
├── test/
│   └── frost.test.ts       # tests
├── package.json
├── tsconfig.json
└── README.md
```

## Quick Start

### 1. Installation

```bash
cd lib/frost
npm install
```

### 2. Run Tests

```bash
npm test
```

## Integration with ZK Voting

Complete flow from attack detection to execution:

```typescript
// STEP 1: ML Bot detects attack → Create proposal
const proposalId = keccak256(attackDetails);

await guardianRegistry.initiateVote(
  proposalId,
  SecurityAction.EMERGENCY_PAUSE,
  attackerAddress,
  "Flash loan attack detected on Polygon"
);

// STEP 2: ZK Voting happens (see zkVoteModule.ts)
// Guardians vote privately using ZK proofs...
// Vote passes with 7/10 approval

// STEP 3: Create FROST signature (this module)
const signature = await createFROSTSignature(
  proposalId, 
  participatingGuardians  // 7 of them
);

// STEP 4: Execute on-chain
await guardianRegistry.executeProposal(
  proposalId,
  signature.R,
  signature.z
);

// ✓ Contract paused, attack prevented!
```

## Contract Deployment

### 1. Deploy FROSTVerifier

```solidity
// Deploy with group public key from DKG
FROSTVerifier verifier = new FROSTVerifier(
  groupPublicKey,        // bytes32 from DKG output
  guardianRegistryAddr   // address
);
```

### 2. Deploy GuardianRegistry

```solidity
GuardianRegistry registry = new GuardianRegistry(
  zkVoteVerifierAddr,    // address
  frostVerifierAddr,     // address
  7                      // initial threshold
);
```

### 3. Link Contracts

```solidity
// Set FROSTVerifier in GuardianRegistry
registry.setFROSTVerifier(frostVerifierAddr);
```

## 🔐 Security Considerations

### Key Management

**DO:**
Store secret shares in HSM or encrypted storage
Use different physical/cloud locations for guardians
Rotate keys monthly
Test disaster recovery procedures

**DON'T:**
Store shares in plaintext
Keep multiple shares in same location
Share private keys over insecure channels
Skip share verification

### Production vs. Hackathon

This implementation uses a **trusted dealer** for DKG (hackathon simplification).

**For production:**
- Implement full DKG with VSS (Verifiable Secret Sharing)
- No single party should know the master secret
- Use MPC ceremony for key generation
- Implement Proactive Secret Sharing for monthly rotation

### Signature Security

- Each nonce pair (d_i, e_i) MUST be unique per session
- Nonces MUST be deleted after use
- Binding factors prevent rogue-key attacks
- Lagrange coefficients ensure correct threshold

## 📊 Performance Benchmarks

### Off-Chain (TypeScript)

| Operation | Time | Notes |
|-----------|------|-------|
| DKG (10 shares) | ~50ms | One-time setup |
| Generate Commitment | ~5ms | Per guardian |
| Generate Signature Share | ~10ms | Per guardian |
| Aggregate Signature | ~15ms | Coordinator |
| Verify Signature | ~10ms | Can be done in SDK |

### On-Chain (Solidity)

| Operation | Gas | Notes |
|-----------|-----|-------|
| FROSTVerifier.verify() | ~80k | Simplified (hackathon) |
| GuardianRegistry.executeProposal() | ~150k | Including verification |
| Emergency pause | ~120k | FROST sig + pause |

**Production Note:** Full Ed25519 verification on-chain would cost ~250k-500k gas. Consider:
- Optimistic verification with fraud proofs
- EIP-665 precompile (if available)
- L2 deployment for cheaper verification

## Testing

### Run All Tests

```bash
npm test
```

### Test Coverage

1. DKG generates 10 valid shares
2. 7 guardians create valid signature
3. 8 guardians also create valid signature
4. Different subsets produce different valid signatures
5. Invalid signatures are rejected

### Manual Testing

```bash
# Test DKG only
ts-node src/dkg.ts

# Test full signing flow
ts-node test/frost.test.ts

# Test on-chain verification (requires Hardhat/Foundry)
forge test --match-contract FROSTVerifier
```

## Integration Points

### With ZK Voting - zkVoteModule.ts

```typescript
import { ZKVoteModule } from '../zk/scripts/zkVoteModule';
import { createFROSTSignature } from './frost-integration';

// After ZK vote passes...
zkVoteModule.on('ProposalFinalized', async (proposalId, approved) => {
  if (approved) {
    // Trigger FROST signing
    const signature = await createFROSTSignature(proposalId);
    
    // Submit to chain
    await executeProposal(proposalId, signature);
  }
});
```

### With SDK (sdk/core/contract.ts)

```typescript
import { FROSTSignature } from '@guardian-protocol/frost';

export class GuardianContract {
  async executeWithFROST(
    proposalId: string,
    signature: FROSTSignature
  ): Promise<TransactionReceipt> {
    return this.registry.executeProposal(
      proposalId,
      signature.R,
      signature.z
    );
  }
}
```

## Potential issues:

### Issue: "Signature verification failed"

**Cause:** Nonces not properly stored/retrieved between rounds
**Fix:** Ensure `participant.generateCommitment()` is called before `generateSignatureShare()`

### Issue: "Not enough commitments"

**Cause:** Less than threshold guardians participated
**Fix:** Need exactly threshold (7) or more guardians for both rounds

### Issue: "Modular inverse does not exist"

**Cause:** Duplicate guardian IDs in participant list
**Fix:** Ensure each guardian ID appears only once

### Issue: "Share verification failed"

**Cause:** Corrupted share or wrong VSS commitments
**Fix:** Re-run DKG or verify commitment bytes are correct