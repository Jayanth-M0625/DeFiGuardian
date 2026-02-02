/**
 * sdk/core/contract.ts
 * 
 * Contract interaction layer for SecurityMiddleware and GuardianRegistry.
 * Handles all on-chain reads/writes for the Sack Money protocol.
 */

import { ethers, Contract as EthersContract } from 'ethers';

// ─── Types ───

export interface SecurityConfig {
  middlewareAddress: string;
  registryAddress: string;
  chainId: number;
}

export interface ExecuteParams {
  target: string;           // Target contract (Uniswap, LI.FI Diamond, etc.)
  data: string;             // Calldata for the target
  value: bigint;            // ETH value to send
  vdfProof: VDFProof;       // Time-lock proof
  frostSignature: FrostSignature; // Guardian threshold signature
}

export interface VDFProof {
  output: string;           // VDF output hash
  proof: string;            // VDF proof bytes
  iterations: number;       // Number of sequential iterations
}

export interface FrostSignature {
  signature: string;        // Aggregated FROST signature
  message: string;          // Signed message hash
  publicKey: string;        // Aggregated public key
}

export interface SecurityState {
  isPaused: boolean;
  lastUpdateBlock: number;
  requiredDelay: number;    // VDF iterations required based on amount
  threshold: number;        // Guardian threshold (e.g., 7)
}

// ─── ABIs ───

const SECURITY_MIDDLEWARE_ABI = [
  // Core execution
  "function executeSecurely(address target, bytes calldata data, uint256 value, bytes calldata vdfProof, bytes calldata frostSignature) external payable returns (bytes memory)",
  
  // View functions
  "function getSecurityState() external view returns (bool isPaused, uint256 lastUpdateBlock, uint256 requiredDelay, uint8 threshold)",
  "function isBlacklisted(address account) external view returns (bool)",
  "function calculateRequiredDelay(uint256 amount) external view returns (uint256)",
  
  // Events
  "event SecureExecutionCompleted(address indexed target, bytes32 indexed txHash, uint256 amount)",
  "event SecurityAlert(address indexed flaggedAddress, string reason)",
];

const GUARDIAN_REGISTRY_ABI = [
  // FROST key management
  "function getAggregatedPublicKey() external view returns (bytes)",
  "function getGuardianCount() external view returns (uint8)",
  
  // Pause mechanism
  "function isPaused() external view returns (bool)",
  "function pauseReason() external view returns (string)",
  
  // Guardian info
  "function isGuardian(address account) external view returns (bool)",
  "function getGuardianENS(address guardian) external view returns (string)",
];

// ─── Contract Wrapper ───

export class SecurityContract {
  private provider: ethers.Provider;
  private signer: ethers.Signer | null;
  private middleware: EthersContract;
  private registry: EthersContract;
  private config: SecurityConfig;

  constructor(
    provider: ethers.Provider,
    config: SecurityConfig,
    signer?: ethers.Signer,
  ) {
    this.provider = provider;
    this.signer = signer || null;
    this.config = config;

    const signerOrProvider = signer || provider;
    
    this.middleware = new EthersContract(
      config.middlewareAddress,
      SECURITY_MIDDLEWARE_ABI,
      signerOrProvider,
    );

    this.registry = new EthersContract(
      config.registryAddress,
      GUARDIAN_REGISTRY_ABI,
      signerOrProvider,
    );
  }

  // ─── Core Execution ───

  /**
   * Execute a transaction through the security middleware.
   * This is the main entry point for secured transactions.
   */
  async executeSecurely(params: ExecuteParams): Promise<ethers.TransactionReceipt> {
    if (!this.signer) {
      throw new Error('Signer required for execution');
    }

    const vdfBytes = this.encodeVDFProof(params.vdfProof);
    const frostBytes = this.encodeFrostSignature(params.frostSignature);

    const tx = await this.middleware.executeSecurely(
      params.target,
      params.data,
      params.value,
      vdfBytes,
      frostBytes,
      { value: params.value },
    );

    return tx.wait();
  }

  // ─── View Functions ───

  /**
   * Get current security state from middleware.
   */
  async getSecurityState(): Promise<SecurityState> {
    const [isPaused, lastUpdateBlock, requiredDelay, threshold] = 
      await this.middleware.getSecurityState();

    return {
      isPaused,
      lastUpdateBlock: Number(lastUpdateBlock),
      requiredDelay: Number(requiredDelay),
      threshold: Number(threshold),
    };
  }

  /**
   * Check if an address is blacklisted.
   */
  async isBlacklisted(address: string): Promise<boolean> {
    return this.middleware.isBlacklisted(address);
  }

  /**
   * Calculate required VDF delay for a given amount.
   */
  async calculateRequiredDelay(amount: bigint): Promise<number> {
    const delay = await this.middleware.calculateRequiredDelay(amount);
    return Number(delay);
  }

  /**
   * Check if protocol is paused (from registry).
   */
  async isPaused(): Promise<boolean> {
    return this.registry.isPaused();
  }

  /**
   * Get FROST aggregated public key from registry.
   */
  async getAggregatedPublicKey(): Promise<string> {
    return this.registry.getAggregatedPublicKey();
  }

  /**
   * Check if an address is a guardian.
   */
  async isGuardian(address: string): Promise<boolean> {
    return this.registry.isGuardian(address);
  }

  // ─── Encoding Helpers ───

  private encodeVDFProof(proof: VDFProof): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'bytes', 'uint256'],
      [proof.output, proof.proof, proof.iterations],
    );
  }

  private encodeFrostSignature(sig: FrostSignature): string {
    return ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes', 'bytes32', 'bytes'],
      [sig.signature, sig.message, sig.publicKey],
    );
  }

  // ─── Getters ───

  get middlewareAddress(): string {
    return this.config.middlewareAddress;
  }

  get registryAddress(): string {
    return this.config.registryAddress;
  }

  get chainId(): number {
    return this.config.chainId;
  }
}