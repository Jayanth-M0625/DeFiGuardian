/**
 * sdk/core/middleware.ts
 * 
 * Main orchestration layer for Sack Money SDK.
 * 
 * This module implements the "Cryptographic Airlock" — the core innovation
 * that separates Intent from Execution.
 * 
 * Flow:
 *   1. Capture: SDK intercepts user's intent (swap, bridge, etc.)
 *   2. Route Detection: Determine if same-chain (Uniswap) or cross-chain (LI.FI)
 *   3. Parallel Trigger:
 *      - VDF Worker: Starts time-lock computation (if high-value)
 *      - Guardian Network: Receives alert, starts ZK voting
 *   4. Polling: SDK polls both until ready
 *   5. Aggregation: Combine VDF proof + FROST signature
 *   6. Execution: Submit to SecurityMiddleware contract
 */

import { ethers } from 'ethers';
import { SecurityContract, SecurityConfig, ExecuteParams, VDFProof, FrostSignature } from './contract';
import { VDFClient, VDFRequest, VDFStatus } from './VDF';
import { ZKVoteClient, VoteStatus, TransactionProposal } from './ZK';

// ─── Types ───

export interface MiddlewareConfig {
  security: SecurityConfig;
  vdfWorkerUrl: string;
  guardianApiUrl: string;
  provider: ethers.Provider;
  signer?: ethers.Signer;
}

export interface TransactionIntent {
  type: 'swap' | 'bridge' | 'generic';
  target: string;                   // Target contract address
  data: string;                     // Encoded calldata
  value: bigint;                    // ETH value
  amount: bigint;                   // Token amount (for threshold calc)
  sourceChain: number;              // Source chain ID
  destChain?: number;               // Destination chain (for bridges)
  metadata?: {
    protocol: 'uniswap' | 'lifi' | 'custom';
    tokenIn?: string;
    tokenOut?: string;
    slippage?: number;
  };
}

export interface ExecutionResult {
  success: boolean;
  txHash: string;
  receipt: ethers.TransactionReceipt;
  vdfProof: VDFProof;
  frostSignature: FrostSignature;
  executionTime: number;            // Total time in ms
}

export interface ExecutionProgress {
  stage: 'submitted' | 'vdf-pending' | 'voting-pending' | 'ready' | 'executing' | 'complete' | 'failed';
  vdfStatus?: VDFStatus;
  voteStatus?: VoteStatus;
  message: string;
}

// ─── Amount Thresholds ───

const THRESHOLDS = {
  LOW: BigInt('1000000000000000000'),        // 1 ETH - no VDF, fast voting
  MEDIUM: BigInt('10000000000000000000'),    // 10 ETH - short VDF
  HIGH: BigInt('100000000000000000000'),     // 100 ETH - medium VDF
  CRITICAL: BigInt('1000000000000000000000'), // 1000 ETH - long VDF + extra scrutiny
};

// ─── Security Middleware ───

export class SecurityMiddleware {
  private config: MiddlewareConfig;
  private contract: SecurityContract;
  private vdfClient: VDFClient;
  private zkClient: ZKVoteClient;

  constructor(config: MiddlewareConfig) {
    this.config = config;

    this.contract = new SecurityContract(
      config.provider,
      config.security,
      config.signer,
    );

    this.vdfClient = new VDFClient({
      workerUrl: config.vdfWorkerUrl,
    });

    this.zkClient = new ZKVoteClient({
      guardianApiUrl: config.guardianApiUrl,
    });
  }

  /**
   * Execute a transaction through the security middleware.
   * This is the main entry point for dApps.
   * 
   * @param intent - The transaction intent
   * @param onProgress - Optional callback for progress updates
   * @returns Execution result with proofs
   */
  async executeSecurely(
    intent: TransactionIntent,
    onProgress?: (progress: ExecutionProgress) => void,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();

    // Step 0: Pre-flight checks
    await this.preflight(intent);

    const txHash = this.generateTxHash(intent);

    this.emitProgress(onProgress, {
      stage: 'submitted',
      message: 'Transaction submitted for security review',
    });

    // Step 1: Determine what's required
    const requiresVDF = this.vdfClient.isVDFRequired(intent.amount);
    const requiresVoting = true; // Always require guardian oversight

    // Step 2: Start parallel processes
    const [vdfProof, frostSignature] = await Promise.all([
      this.handleVDF(intent, txHash, requiresVDF, onProgress),
      this.handleVoting(intent, txHash, onProgress),
    ]);

    this.emitProgress(onProgress, {
      stage: 'ready',
      message: 'All proofs ready, executing transaction',
    });

    // Step 3: Execute on-chain
    this.emitProgress(onProgress, {
      stage: 'executing',
      message: 'Submitting to SecurityMiddleware contract',
    });

    const receipt = await this.contract.executeSecurely({
      target: intent.target,
      data: intent.data,
      value: intent.value,
      vdfProof,
      frostSignature,
    });

    this.emitProgress(onProgress, {
      stage: 'complete',
      message: 'Transaction executed successfully',
    });

    return {
      success: true,
      txHash: receipt.hash,
      receipt,
      vdfProof,
      frostSignature,
      executionTime: Date.now() - startTime,
    };
  }

  /**
   * Handle VDF proof generation/retrieval.
   */
  private async handleVDF(
    intent: TransactionIntent,
    txHash: string,
    required: boolean,
    onProgress?: (progress: ExecutionProgress) => void,
  ): Promise<VDFProof> {
    if (!required) {
      return this.vdfClient.createZeroProof();
    }

    const request: VDFRequest = {
      txHash,
      amount: intent.amount,
      chainId: intent.sourceChain,
      sender: await this.getSenderAddress(),
    };

    return this.vdfClient.getProof(request, (status) => {
      this.emitProgress(onProgress, {
        stage: 'vdf-pending',
        vdfStatus: status,
        message: `VDF computation: ${status.progress}% (${status.estimatedTimeLeft}s remaining)`,
      });
    });
  }

  /**
   * Handle Guardian voting and FROST signature retrieval.
   */
  private async handleVoting(
    intent: TransactionIntent,
    txHash: string,
    onProgress?: (progress: ExecutionProgress) => void,
  ): Promise<FrostSignature> {
    // Submit for Guardian review
    const proposalId = await this.zkClient.submitForReview({
      txHash,
      target: intent.target,
      value: intent.value,
      data: intent.data,
      chainId: intent.sourceChain,
      sender: await this.getSenderAddress(),
      amount: intent.amount,
    });

    // Wait for voting to complete
    const voteResult = await this.zkClient.waitForVoteResult(proposalId, (status) => {
      this.emitProgress(onProgress, {
        stage: 'voting-pending',
        voteStatus: status,
        message: `Guardian voting: ${status.votes.approve}/${status.threshold} approvals`,
      });
    });

    if (voteResult.isRejected) {
      throw new Error(`Transaction rejected by Guardians (${voteResult.votes.reject} rejections)`);
    }

    if (!voteResult.isApproved || !voteResult.frostSignature) {
      throw new Error('Voting expired without reaching threshold');
    }

    return voteResult.frostSignature;
  }

  /**
   * Pre-flight checks before starting the security flow.
   */
  private async preflight(intent: TransactionIntent): Promise<void> {
    // Check if protocol is paused
    const isPaused = await this.contract.isPaused();
    if (isPaused) {
      throw new Error('Protocol is currently paused due to security alert');
    }

    // Check if sender is blacklisted
    const sender = await this.getSenderAddress();
    const isBlacklisted = await this.contract.isBlacklisted(sender);
    if (isBlacklisted) {
      throw new Error('Sender address is blacklisted');
    }

    // Validate intent
    if (!intent.target || intent.target === ethers.ZeroAddress) {
      throw new Error('Invalid target address');
    }
  }

  /**
   * Generate a unique hash for this transaction intent.
   */
  private generateTxHash(intent: TransactionIntent): string {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'bytes', 'uint256', 'uint256', 'uint256'],
        [intent.target, intent.data, intent.value, intent.sourceChain, Date.now()],
      ),
    );
  }

  /**
   * Get the signer's address.
   */
  private async getSenderAddress(): Promise<string> {
    if (!this.config.signer) {
      throw new Error('Signer required');
    }
    return this.config.signer.getAddress();
  }

  /**
   * Emit progress update if callback provided.
   */
  private emitProgress(
    callback: ((progress: ExecutionProgress) => void) | undefined,
    progress: ExecutionProgress,
  ): void {
    if (callback) {
      callback(progress);
    }
  }

  // ─── Query Methods ───

  /**
   * Get current security state.
   */
  async getSecurityState() {
    return this.contract.getSecurityState();
  }

  /**
   * Check if an address is blacklisted.
   */
  async isBlacklisted(address: string) {
    return this.contract.isBlacklisted(address);
  }

  /**
   * Calculate required delay for an amount.
   */
  async calculateDelay(amount: bigint) {
    return this.contract.calculateRequiredDelay(amount);
  }

  /**
   * Get risk level for an amount.
   */
  getRiskLevel(amount: bigint): 'low' | 'medium' | 'high' | 'critical' {
    if (amount >= THRESHOLDS.CRITICAL) return 'critical';
    if (amount >= THRESHOLDS.HIGH) return 'high';
    if (amount >= THRESHOLDS.MEDIUM) return 'medium';
    return 'low';
  }
}

// ─── Factory Function ───

export function createSecurityMiddleware(config: MiddlewareConfig): SecurityMiddleware {
  return new SecurityMiddleware(config);
}