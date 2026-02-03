# ZK Voting Module

## Folder Structure

```
zk/
├──artifacts/                         → Build files
|
├──circuits/
|   └── GuardianVote.circom           → Circom circuit
|
├──contracts/
|   ├── GuardianRegistry.sol          → Main state manager, creates proposals, executes actions
|   ├── ZKVoteVerifier.sol            → Manages ZK voting: commit reveal, on chain groth16 proof verification
|   ├── GuardianVoteVerifier.sol      → Groth16 verifier
|   └── FROSTVerifier.sol             → Schnorr signature verifier - TBD
|
├──scripts/
|   ├── zkVoteModule.ts               → Guardian node runtime module (proof generation + submission)
|   └── compile.sh                    → Compiles circuit → WASM + zkey + Solidity verifier
|
└──test/
    └── zkVote.test.ts                → Coplete voting flow test
```
## How to Run

```bash
# 1. Compile circuit (one time setup)
cd zk/scripts
chmod +x compile.sh
./compile.sh

# 2. Run tests
cd zk
npx ts-node test/zkVote.test.ts
```

## Integration Points

```
Dashboard (click APPROVE)
    ↓
guardian-node receives vote decision
    ↓
zkVoteModule.ts
    ├── generateCommitment()        → submit hash on-chain
    ├── waitForAllCommits()         → poll until all 10 committed
    ├── generateProof()             → snarkjs proves the ZK circuit
    └── submitReveal()              → sends proof + vote to ZKVoteVerifier.sol
                                        ↓
                                   ZKVoteVerifier.sol
                                        ├── verifies Groth16 proof
                                        ├── tallies vote
                                        └── emits ProposalFinalized if threshold reached
                                                    ↓
                                             GuardianRegistry picks up event
                                                    ↓
                                             FROST signing triggered
```
