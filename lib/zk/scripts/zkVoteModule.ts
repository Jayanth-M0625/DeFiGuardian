// runs inside guardian-node

import { groth16 } from 'snarkjs';
import { ethers } from 'ethers';
import { buildPoseidon } from 'circomlibjs';
import { utils } from 'ffjavascript';
import path from 'path';

let poseidon: any;
async function initPoseidon() {
  if (!poseidon) {
    poseidon = await buildPoseidon();
  }
  return poseidon;
}

// ---Types ---
export type VoteDecision = 'APPROVE' | 'REJECT' | 'ABSTAIN';

const VOTE_VALUES: Record<VoteDecision, number> = {
  REJECT:   0,
  APPROVE:  1,
  ABSTAIN:  2,
};

// Represents a baby Jubjub public key [x, y]
export type GuardianPublicKey = [bigint, bigint];

export interface VoteInput {
  proposalId: string;       // bytes32 hex string
  decision:   VoteDecision;
  guardianId: number;       // 0–9
  guardianSecret: Buffer;   // guardian's secret key (32-byte buffer)
}

export interface CommitmentResult {
  commitment: string;       // bytes32 hex — submit this on-chain
  nonce: string;            // store locally, needed for reveal
}

export interface ProofResult {
  proof: {
    pA: [string, string];
    pB: [[string, string], [string, string]];
    pC: [string, string];
  };
  vote: number;             // revealed vote value
}

// ---config ---
const ARTIFACTS_DIR = path.resolve(__dirname, '../../artifacts');
const WASM_PATH     = path.join(ARTIFACTS_DIR, 'circuits', 'GuardianVote.wasm');
const ZKEY_PATH     = path.join(ARTIFACTS_DIR, 'circuits', 'GuardianVote_final.zkey');


//commitment = Poseidon(guardianId, vote, nonce, proposalId)
export async function generateCommitment(input: VoteInput): Promise<CommitmentResult> {
  const poseidonHash = await initPoseidon();
  const vote  = VOTE_VALUES[input.decision];
  const nonce = generateRandomNonce();
  const proposalIdBigInt = BigInt(input.proposalId);

  const commitment = poseidonHash([
    BigInt(input.guardianId),
    BigInt(vote),
    nonce,
    proposalIdBigInt,
  ]);
  return {
    commitment: '0x' + poseidonHash.F.toString(commitment, 16).padStart(64, '0'),
    nonce: nonce.toString(),
  };
}

// Generates the Groth16 ZK proof for the reveal phase

export async function generateProof(
  input: VoteInput,
  nonce: string,
  guardianPubKeys: GuardianPublicKey[], // Array of [x, y] pairs
): Promise<ProofResult> {
  const vote = VOTE_VALUES[input.decision];
  const poseidonHash = await initPoseidon();
  const commitmentHash = poseidonHash([
    BigInt(input.guardianId),
    BigInt(vote),
    BigInt(nonce),
    BigInt(input.proposalId),
  ]);

  const circuitInput = {
    // Private inputs
    guardianId:     input.guardianId,
    guardianSecret: utils.leBuff2int(input.guardianSecret), // Convert buffer to bigint for circuit
    vote:           vote,
    nonce:          nonce,
    // Public inputs
    proposalId:     BigInt(input.proposalId),
    commitment:     commitmentHash,
    guardianPubKeys: guardianPubKeys, // Passing the 2D array directly
  };

  // ---Generate proof using snarkjs ---
  const { proof, publicSignals } = await groth16.fullProve(
    circuitInput,
    WASM_PATH,
    ZKEY_PATH,
  );

  // Format proof for Solidity verifier
  const solProof = {
      pA: [proof.pi_a[0], proof.pi_a[1]] as [string, string],
      pB: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]] as [[string, string], [string, string]],
      pC: [proof.pi_c[0], proof.pi_c[1]] as [string, string],
  }
  return {
    proof: solProof,
    vote,
  };
}

// --- on-chain submission ---

//Submits the commitment to ZKVoteVerifier during commit phase.

export async function submitCommitment(
  provider: ethers.Provider,
  signer: ethers.Signer,
  verifierAddress: string,
  proposalId: string,
  commitment: string,
  guardianSlot: number,
): Promise<ethers.TransactionReceipt> {
  const verifier = new ethers.Contract(
    verifierAddress,
    ZK_VOTE_VERIFIER_ABI,
    signer,
  );
  const tx = await verifier.submitCommitment(
    proposalId,
    commitment,
    guardianSlot,
  );
  return tx.wait();
}

// Submits the ZK proof + revealed vote to ZKVoteVerifier during reveal phase.

export async function submitReveal(
  provider: ethers.Provider,
  signer: ethers.Signer,
  verifierAddress: string,
  proposalId: string,
  guardianSlot: number,
  proof: ProofResult,
): Promise<ethers.TransactionReceipt> {
  const verifier = new ethers.Contract(
    verifierAddress,
    ZK_VOTE_VERIFIER_ABI,
    signer,
  );

  const tx = await verifier.revealVote(
    proposalId,
    guardianSlot,
    proof.vote,
    proof.proof.pA,
    proof.proof.pB,
    proof.proof.pC,
  );

  return tx.wait();
}

// --- full vote flow (called by dashboard handler) --

export class ZKVoteModule {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private verifierAddress: string;
  private guardianPubKeys: GuardianPublicKey[];

  constructor(
    provider: ethers.Provider,
    signer: ethers.Signer,
    verifierAddress: string,
    guardianPubKeys: GuardianPublicKey[],
  ) {
    this.provider = provider;
    this.signer = signer;
    this.verifierAddress = verifierAddress;
    this.guardianPubKeys = guardianPubKeys;
  }

  async vote(input: VoteInput): Promise<void> {
    // Step 1: Generate commitment
    const { commitment, nonce } = await generateCommitment(input);
    console.log('[ZK] Commitment generated');

    // Step 2: Submit commitment on-chain
    await submitCommitment(
      this.provider,
      this.signer,
      this.verifierAddress,
      input.proposalId,
      commitment,
      input.guardianId,
    );
    console.log('[ZK] Commitment submitted on-chain');

    // Step 3: Wait for all guardians to commit
    await this.waitForAllCommits(input.proposalId);
    console.log('[ZK] All commitments in — generating proof');

    // Step 4: Generate ZK proof
    const proof = await generateProof(
      input,
      nonce,
      this.guardianPubKeys,
    );
    console.log('[ZK] Proof generated');

    // Step 5: Submit reveal
    await submitReveal(
      this.provider,
      this.signer,
      this.verifierAddress,
      input.proposalId,
      input.guardianId,
      proof,
    );
    console.log('[ZK] Vote revealed on-chain');
  }

  //Polls contract until all 10 guardians have committed.
  private async waitForAllCommits(proposalId: string): Promise<void> {
    const verifier = new ethers.Contract(
      this.verifierAddress,
      ZK_VOTE_VERIFIER_ABI,
      this.provider,
    );

    while (true) {
      const [commitCount] = await verifier.getProposalState(proposalId);
      if (commitCount >= 10) break;
      await new Promise(r => setTimeout(r, 2000)); // poll every 2s
    }
  }
}

// --- Helpers ---

function generateRandomNonce(): bigint {
    return BigInt('0x' + Buffer.alloc(31).fill(0).toString('hex').replace(
        /./g, () => Math.floor(Math.random() * 16).toString(16)
    ))
}


// Minimal ABI — only the functions we call- now aligned with ZKVoteVerifier.sol
const ZK_VOTE_VERIFIER_ABI = [
  "function submitCommitment(bytes32 proposalId, bytes32 commitment, uint8 guardianSlot)",
  "function revealVote(bytes32 proposalId, uint8 guardianSlot, uint8 vote, uint[2] pA, uint[2][2] pB, uint[2] pC)",
  "function getProposalState(bytes32 proposalId) view returns (uint8 commitCount, uint8 revealCount, uint8 approveCount, uint8 rejectCount, uint8 abstainCount, bool isFinalized)",
  "function proposalExists(bytes32 proposalId) view returns (bool)",
  "function getCommitDeadline(bytes32 proposalId) view returns (uint256)",
];
