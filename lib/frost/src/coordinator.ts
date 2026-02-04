/**
 * FROST Coordinator - Orchestrates two-round signing protocol
 */

import { randomBytes } from '@noble/hashes/utils';
import { 
  SigningSession, 
  FROSTCommitment, 
  SignatureShare, 
  FROSTSignature,
  SigningError 
} from './types';

// ─── FROST Coordinator Class ───

export class FROSTCoordinator {
  private groupPublicKey: Buffer;
  public threshold: number;
  private sessions: Map<string, SigningSession>;
  
  constructor(groupPublicKey: Buffer, threshold: number) {
    this.groupPublicKey = groupPublicKey;
    this.threshold = threshold;
    this.sessions = new Map();
  }
  
  /**
   * Start a new signing session
   */
  async startSession(proposalId: string, message: Buffer): Promise<string> {
    const sessionId = Buffer.from(randomBytes(16)).toString('hex');
    
    console.log(`[Coordinator] Starting session ${sessionId} for proposal ${proposalId}`);
    
    const session: SigningSession = {
      sessionId,
      proposalId,
      message,
      participants: [],
      groupPublicKey: this.groupPublicKey,
      status: 'commitment',
      commitments: new Map(),
      signatureShares: new Map(),
      createdAt: Date.now(),
    };
    
    this.sessions.set(sessionId, session);
    
    return sessionId;
  }
  
  /**
   * Submit a commitment (Round 1)
   */
  async submitCommitment(
    sessionId: string,
    guardianId: number,
    commitment: FROSTCommitment
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SigningError(`Session ${sessionId} not found`);
    }
    
    if (session.status !== 'commitment') {
      throw new SigningError(`Session ${sessionId} is not in commitment phase`);
    }
    
    // Verify commitment is from the claimed guardian
    if (commitment.guardianId !== guardianId) {
      throw new SigningError('Guardian ID mismatch in commitment');
    }
    
    // Store commitment
    session.commitments.set(guardianId, commitment);
    
    // Track participant
    if (!session.participants.includes(guardianId)) {
      session.participants.push(guardianId);
    }
    
    console.log(
      `[Coordinator] Commitment received from guardian ${guardianId} ` +
      `(${session.commitments.size}/${this.threshold} needed)`
    );
    
    // Check if we have enough commitments to proceed
    if (session.commitments.size >= this.threshold) {
      session.status = 'signature';
      console.log(`[Coordinator] Session ${sessionId} ready for signature phase`);
    }
  }
  
  /**
   * Get list of commitments (for Round 2)
   */
  async getCommitmentList(sessionId: string): Promise<FROSTCommitment[]> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SigningError(`Session ${sessionId} not found`);
    }
    
    if (session.commitments.size < this.threshold) {
      throw new SigningError(
        `Not enough commitments yet (${session.commitments.size}/${this.threshold})`
      );
    }
    
    return Array.from(session.commitments.values());
  }
  
  /**
   * Submit a signature share (Round 2)
   */
  async submitSignatureShare(
    sessionId: string,
    guardianId: number,
    share: SignatureShare
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SigningError(`Session ${sessionId} not found`);
    }
    
    if (session.status !== 'signature') {
      throw new SigningError(`Session ${sessionId} is not in signature phase`);
    }
    
    // Verify share is from the claimed guardian
    if (share.guardianId !== guardianId) {
      throw new SigningError('Guardian ID mismatch in signature share');
    }
    
    // Verify guardian submitted a commitment
    if (!session.commitments.has(guardianId)) {
      throw new SigningError('Guardian did not submit commitment');
    }
    
    // Store signature share
    session.signatureShares.set(guardianId, share);
    
    console.log(
      `[Coordinator] Signature share received from guardian ${guardianId} ` +
      `(${session.signatureShares.size}/${this.threshold} needed)`
    );
    
    // Check if we can complete
    if (session.signatureShares.size >= this.threshold) {
      console.log(`[Coordinator] Session ${sessionId} ready for aggregation`);
    }
  }
  
  /**
   * Aggregate signature shares into final FROST signature
   */
  async aggregateSignature(sessionId: string): Promise<FROSTSignature> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SigningError(`Session ${sessionId} not found`);
    }
    
    if (session.signatureShares.size < this.threshold) {
      throw new SigningError(
        `Not enough signature shares (${session.signatureShares.size}/${this.threshold})`
      );
    }
    
    console.log(`[Coordinator] Aggregating signature for session ${sessionId}`);
    
    // Import aggregation function
    const { aggregateSignatureShares } = await import('./aggregator');
    
    const shares = Array.from(session.signatureShares.values());
    const commitments = Array.from(session.commitments.values());
    
    const signature = await aggregateSignatureShares(
      shares,
      commitments,
      session.message,
      this.groupPublicKey,
      this.threshold
    );
    
    session.status = 'complete';
    console.log(`[Coordinator] Session ${sessionId} complete`);
    
    return signature;
  }
  
  /**
   * Get session status
   */
  getSession(sessionId: string): SigningSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  /**
   * Get session status summary
   */
  getSessionStatus(sessionId: string): {
    status: string;
    commitmentsReceived: number;
    signaturesReceived: number;
    thresholdRequired: number;
  } | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    return {
      status: session.status,
      commitmentsReceived: session.commitments.size,
      signaturesReceived: session.signatureShares.size,
      thresholdRequired: this.threshold,
    };
  }
  
  /**
   * Clean up completed sessions
   */
  cleanupSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
