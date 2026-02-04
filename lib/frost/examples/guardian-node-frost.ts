/**
 * Integration module for Guardian Node to use FROST signatures
 * This connects the ZK voting system with FROST signing
 */
/// <reference types="node" />

import { ethers } from 'ethers';
import {
  FROSTCoordinator,
  FROSTParticipant,
  FROSTSignature,
  DKGOutput,
} from '../src/index';

// ------------------------------------
// FROST Integration for Guardian Node
// ------------------------------------

export class GuardianFROSTModule {
  private participant: FROSTParticipant;
  private coordinatorUrl: string;
  private guardianId: number;
  
  constructor(
    guardianId: number,
    secretShare: Buffer,
    publicKey: Buffer,
    groupPublicKey: Buffer,
    coordinatorUrl: string = 'http://localhost:3001'
  ) {
    this.guardianId = guardianId;
    this.coordinatorUrl = coordinatorUrl;
    this.participant = new FROSTParticipant(
      guardianId,
      secretShare,
      publicKey,
      groupPublicKey
    );
  }
  
  /**
   * Called after ZK vote finalizes
   * Guardian participates in FROST signing
   */
  async signProposal(proposalId: string): Promise<void> {
    console.log(`[Guardian ${this.guardianId}] Participating in FROST signing for ${proposalId}`);
    
    try {
      // Step 1: Get session ID from coordinator
      const sessionInfo = await this.fetchCoordinatorSession(proposalId);
      const { sessionId, message } = sessionInfo;
      // Step 2: Round 1 - Generate and submit commitment
      console.log(`[Guardian ${this.guardianId}] Round 1: Generating commitment`);
      const commitment = await this.participant.generateCommitment(sessionId);
      await this.submitCommitment(sessionId, commitment);
      console.log(`[Guardian ${this.guardianId}] Commitment submitted`);
      
      // Step 3: Wait for all commitments
      await this.waitForPhase(sessionId, 'signature');
      
      // Step 4: Round 2 - Get commitments and generate signature share
      console.log(`[Guardian ${this.guardianId}] Round 2: Generating signature share`);
      const commitments = await this.fetchCommitments(sessionId);      
      const messageBuffer = Buffer.from(message, 'hex');
      const signatureShare = await this.participant.generateSignatureShare(
        sessionId,
        messageBuffer,
        commitments
      );
      
      await this.submitSignatureShare(sessionId, signatureShare);
      console.log(`[Guardian ${this.guardianId}] Signature share submitted`);      
      // Clean up nonces
      this.participant.clearNonces(sessionId);     
      console.log(`[Guardian ${this.guardianId}] FROST signing complete`);      
    } catch (error) {
      console.error(`[Guardian ${this.guardianId}] FROST signing failed:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch session info from coordinator
   */
  private async fetchCoordinatorSession(proposalId: string): Promise<{
    sessionId: string;
    message: string;
  }> {
    const response = await fetch(`${this.coordinatorUrl}/sessions/${proposalId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch session: ${response.statusText}`);
    }
    return response.json();
  }
  
  /**
   * Submit commitment to coordinator
   */
  private async submitCommitment(sessionId: string, commitment: any): Promise<void> {
    const response = await fetch(`${this.coordinatorUrl}/commitments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        guardianId: this.guardianId,
        hidingNonce: commitment.hidingNonce.toString('hex'),
        bindingNonce: commitment.bindingNonce.toString('hex'),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to submit commitment: ${response.statusText}`);
    }
  }
  
  /**
   * Submit signature share to coordinator
   */
  private async submitSignatureShare(sessionId: string, share: any): Promise<void> {
    const response = await fetch(`${this.coordinatorUrl}/signature-shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        guardianId: this.guardianId,
        zShare: share.zShare.toString('hex'),
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to submit signature share: ${response.statusText}`);
    }
  }
  
  /**
   * Fetch all commitments from coordinator
   */
  private async fetchCommitments(sessionId: string): Promise<any[]> {
    const response = await fetch(`${this.coordinatorUrl}/sessions/${sessionId}/commitments`);
    if (!response.ok) {
      throw new Error(`Failed to fetch commitments: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Convert hex strings back to Buffers
    return data.commitments.map((c: any) => ({
      guardianId: c.guardianId,
      hidingNonce: Buffer.from(c.hidingNonce, 'hex'),
      bindingNonce: Buffer.from(c.bindingNonce, 'hex'),
    }));
  }
  
  /**
   * Wait for session to reach a specific phase
   */
  private async waitForPhase(sessionId: string, phase: string): Promise<void> {
    const maxAttempts = 60; // 60 seconds
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const response = await fetch(`${this.coordinatorUrl}/sessions/${sessionId}/status`);
      const status = await response.json();
      
      if (status.status === phase || status.status === 'complete') {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    throw new Error(`Timeout waiting for phase: ${phase}`);
  }
}

// ------------------------------------
// Integration with ZK Voting Module
// ------------------------------------

/**
 * Example: How to connect ZK voting with FROST signing
 */
export class GuardianNodeWithFROST {
  private zkModule: any;  // ZKVoteModule from zkVoteModule.ts
  private frostModule: GuardianFROSTModule;
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  
  constructor(
    guardianId: number,
    guardianSecret: Buffer,
    dkgOutput: DKGOutput,
    provider: ethers.Provider,
    signer: ethers.Signer,
    zkVerifierAddress: string,
    coordinatorUrl: string
  ) {
    this.provider = provider;
    this.signer = signer;
    
    // Initialize ZK module (for voting)
    const guardianPubKeys = dkgOutput.guardianShares.map(s => {
      // Convert Ed25519 public key to BabyJubJub format
      // This is a placeholder - actual conversion needed
      return [BigInt(0), BigInt(0)] as [bigint, bigint];
    });
    
    // Placeholder for ZKVoteModule initialization
    // this.zkModule = new ZKVoteModule(provider, signer, zkVerifierAddress, guardianPubKeys);
    
    // Initialize FROST module (for signing)
    const share = dkgOutput.guardianShares[guardianId];
    this.frostModule = new GuardianFROSTModule(
      guardianId,
      share.secretShare,
      share.publicKey,
      dkgOutput.groupPublicKey,
      coordinatorUrl
    );
  }
  
  /**
   * Handle a security proposal
   * 1. Vote using ZK proofs
   * 2. If vote passes, create FROST signature
   */
  async handleProposal(proposalId: string, decision: 'APPROVE' | 'REJECT' | 'ABSTAIN'): Promise<void> {
    console.log(`\n[Guardian Node] Handling proposal ${proposalId}`);
    console.log(`Decision: ${decision}`);
    
    // Step 1: Vote using ZK proofs (private)
    console.log('Step 1: Submitting ZK vote...');
    // await this.zkModule.vote({
    //   proposalId,
    //   decision,
    //   guardianId: this.frostModule.guardianId,
    //   guardianSecret: ...,
    // });
    
    console.log('✓ ZK vote submitted');
    
    // Step 2: Wait for vote to finalize
    console.log('Step 2: Waiting for vote to finalize...');
    // const voteResult = await this.waitForVoteResult(proposalId);
    
    // Simulate vote passing
    const voteResult = { approved: true, approvals: 8 };
    
    if (!voteResult.approved) {
      console.log('Vote did not pass, no action taken');
      return;
    }
    
    console.log(`✓ Vote passed (${voteResult.approvals}/7)`);
    
    // Step 3: Participate in FROST signing
    console.log('Step 3: Participating in FROST signing...');
    await this.frostModule.signProposal(proposalId);
    
    console.log('✓ FROST signature created');
    console.log('\n[Guardian Node] Proposal handling complete');
  }
  
  /**
   * Monitor for new proposals (event listener)
   */
  async startMonitoring(registryAddress: string): Promise<void> {
    console.log('[Guardian Node] Starting monitoring...');
    
    const registry = new ethers.Contract(
      registryAddress,
      [
        'event ProposalInitiated(bytes32 indexed proposalId, uint8 action, string description)',
      ],
      this.provider
    );
    
    registry.on('ProposalInitiated', async (proposalId, action, description) => {
      console.log(`\n[Guardian Node] New proposal detected: ${proposalId}`);
      console.log(`Action: ${action}`);
      console.log(`Description: ${description}`);
      
      // Guardian reviews and makes decision
      // In production, this would involve:
      // - Analyzing blockchain data
      // - Checking ML bot confidence
      // - Manual review if needed
      
      // For demo, auto-approve high-confidence alerts
      const decision = 'APPROVE';
      
      await this.handleProposal(proposalId, decision);
    });
    
    console.log('✓ Monitoring active');
  }
}

// ------------------------------------
// Standalone Coordinator Service
// ------------------------------------

/**
 * Simple HTTP server that runs the FROST coordinator
 * This can be run by any guardian or as a separate service
 */
export class FROSTCoordinatorService {
  private coordinator: FROSTCoordinator;
  private sessions: Map<string, string>; // proposalId -> sessionId
  
  constructor(groupPublicKey: Buffer, threshold: number = 7) {
    this.coordinator = new FROSTCoordinator(groupPublicKey, threshold);
    this.sessions = new Map();
  }
  
  /**
   * Create a new signing session
   */
  async createSession(proposalId: string, message: Buffer): Promise<string> {
    const sessionId = await this.coordinator.startSession(proposalId, message);
    this.sessions.set(proposalId, sessionId);
    return sessionId;
  }
  
  /**
   * HTTP API routes (Express.js style)
   */
  setupRoutes(app: any): void {
    // GET /sessions/:proposalId
    app.get('/sessions/:proposalId', (req: any, res: any) => {
      const proposalId = req.params.proposalId;
      const sessionId = this.sessions.get(proposalId);
      
      if (!sessionId) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      res.json({ sessionId, message: proposalId });
    });
    
    // POST /commitments
    app.post('/commitments', async (req: any, res: any) => {
      const { sessionId, guardianId, hidingNonce, bindingNonce } = req.body;
      
      const commitment = {
        guardianId,
        hidingNonce: Buffer.from(hidingNonce, 'hex'),
        bindingNonce: Buffer.from(bindingNonce, 'hex'),
      };
      
      await this.coordinator.submitCommitment(sessionId, guardianId, commitment);
      res.json({ success: true });
    });
    
    // GET /sessions/:sessionId/commitments
    app.get('/sessions/:sessionId/commitments', async (req: any, res: any) => {
      const sessionId = req.params.sessionId;
      const commitments = await this.coordinator.getCommitmentList(sessionId);
      
      const serialized = commitments.map(c => ({
        guardianId: c.guardianId,
        hidingNonce: c.hidingNonce.toString('hex'),
        bindingNonce: c.bindingNonce.toString('hex'),
      }));
      
      res.json({ commitments: serialized });
    });
    
    // POST /signature-shares
    app.post('/signature-shares', async (req: any, res: any) => {
      const { sessionId, guardianId, zShare } = req.body;
      
      const share = {
        guardianId,
        zShare: Buffer.from(zShare, 'hex'),
      };
      
      await this.coordinator.submitSignatureShare(sessionId, guardianId, share);
      res.json({ success: true });
    });
    
    // GET /sessions/:sessionId/signature
    app.get('/sessions/:sessionId/signature', async (req: any, res: any) => {
      const sessionId = req.params.sessionId;
      
      try {
        const signature = await this.coordinator.aggregateSignature(sessionId);
        
        res.json({
          R: signature.R.toString('hex'),
          z: signature.z.toString('hex'),
          groupPublicKey: signature.groupPublicKey.toString('hex'),
        });
      } catch (error: any) {
        res.status(400).json({ error: error.message });
      }
    });
    
    // GET /sessions/:sessionId/status
    app.get('/sessions/:sessionId/status', (req: any, res: any) => {
      const sessionId = req.params.sessionId;
      const status = this.coordinator.getSessionStatus(sessionId);
      
      if (!status) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      res.json(status);
    });
  }
}

export default {
  GuardianFROSTModule,
  GuardianNodeWithFROST,
  FROSTCoordinatorService,
};
