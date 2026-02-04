/**
 * Core types for FROST threshold signatures
 */

// ─── Configx ───

export interface DKGConfig {
  threshold: number;           // 7 for Guardian Protocol
  totalParticipants: number;   // 10 for Guardian Protocol
}

export interface GuardianKeyShare {
  participantId: number;       // 0-9
  secretShare: Buffer;         // Secret polynomial evaluation
  publicKey: Buffer;           // Individual public key (32 bytes Ed25519)
}

export interface DKGOutput {
  groupPublicKey: Buffer;            // Shared public key for verification (32 bytes)
  guardianShares: GuardianKeyShare[]; // One per guardian
  vssCommitments: Buffer[];          // Verifiable Secret Sharing commitments
}

// ─── Signing Session ───

export interface SigningSession {
  sessionId: string;
  proposalId: string;          // Links to ZK vote
  message: Buffer;             // Message to sign (proposal hash)
  participants: number[];      // Guardian IDs participating (>=7)
  groupPublicKey: Buffer;
  status: 'commitment' | 'signature' | 'complete' | 'failed';
  commitments: Map<number, FROSTCommitment>;
  signatureShares: Map<number, SignatureShare>;
  createdAt: number;
}

export interface FROSTCommitment {
  guardianId: number;
  hidingNonce: Buffer;         // D_i commitment (32 bytes)
  bindingNonce: Buffer;        // E_i commitment (32 bytes)
}

export interface SignatureShare {
  guardianId: number;
  zShare: Buffer;              // z_i = d_i + (e_i * ρ_i) + λ_i * a_i * c (32 bytes)
}

export interface FROSTSignature {
  R: Buffer;                   // Group commitment point (32 bytes)
  z: Buffer;                   // Aggregated signature scalar (32 bytes)
  groupPublicKey: Buffer;      // For verification (32 bytes)
}

// ─── Nonce Storage ───

export interface NonceStore {
  sessionId: string;
  guardianId: number;
  d: Buffer;                   // Hiding nonce secret
  e: Buffer;                   // Binding nonce secret
  D: Buffer;                   // Hiding commitment
  E: Buffer;                   // Binding commitment
}

// ─── Errors ───

export class FROSTError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FROSTError';
  }
}

export class DKGError extends FROSTError {
  constructor(message: string) {
    super(`DKG Error: ${message}`);
    this.name = 'DKGError';
  }
}

export class SigningError extends FROSTError {
  constructor(message: string) {
    super(`Signing Error: ${message}`);
    this.name = 'SigningError';
  }
}

export class VerificationError extends FROSTError {
  constructor(message: string) {
    super(`Verification Error: ${message}`);
    this.name = 'VerificationError';
  }
}
