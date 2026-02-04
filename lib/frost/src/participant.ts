/**
 * FROST Participant - Individual guardian signing operations
 */

import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes } from '@noble/hashes/utils';
import { sha512 } from '@noble/hashes/sha512';
import { 
  FROSTCommitment, 
  SignatureShare, 
  NonceStore, 
  SigningError 
} from './types';

// ─── Helper Functions ───

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

function bigIntToBytes(value: bigint, size: number): Buffer {
  const bytes = new Uint8Array(size);
  let v = value;
  for (let i = size - 1; i >= 0; i--) {
    bytes[i] = Number(v & 0xFFn);
    v >>= 8n;
  }
  return Buffer.from(bytes);
}

function mod(a: bigint, m: bigint): bigint {
  const result = a % m;
  return result >= 0n ? result : result + m;
}

/**
 * Hash function for computing binding factor
 */
function hashToScalar(...inputs: Buffer[]): bigint {
  const combined = Buffer.concat(inputs);
  const hash = sha512(combined);
  const hashValue = bytesToBigInt(hash.slice(0, 32));
  return mod(hashValue, ed25519.CURVE.n);
}

/**
 * Compute Lagrange coefficient for participant i in the set of participants
 */
function computeLagrangeCoefficient(
  participantId: number,
  participants: number[]
): bigint {
  const order = ed25519.CURVE.n;
  const x_i = BigInt(participantId + 1); // Convert to 1-indexed
  
  let numerator = 1n;
  let denominator = 1n;
  
  for (const j of participants) {
    if (j === participantId) continue;
    
    const x_j = BigInt(j + 1); // Convert to 1-indexed
    numerator = mod(numerator * x_j, order);
    denominator = mod(denominator * (x_j - x_i), order);
  }
  
  // Compute modular inverse of denominator
  const denominatorInv = modInverse(denominator, order);
  return mod(numerator * denominatorInv, order);
}

/**
 * Compute modular inverse using Extended Euclidean Algorithm
 */
function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  
  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }
  
  if (old_r !== 1n) {
    throw new Error('Modular inverse does not exist');
  }
  
  return mod(old_s, m);
}

// ─── FROST Participant Class ───

export class FROSTParticipant {
  private guardianId: number;
  private secretShare: Buffer;
  private publicKey: Buffer;
  private groupPublicKey: Buffer;
  private nonceStore: Map<string, NonceStore>;
  
  constructor(
    guardianId: number,
    secretShare: Buffer,
    publicKey: Buffer,
    groupPublicKey: Buffer
  ) {
    this.guardianId = guardianId;
    this.secretShare = secretShare;
    this.publicKey = publicKey;
    this.groupPublicKey = groupPublicKey;
    this.nonceStore = new Map();
  }
  
  /**
   * Round 1: Generate commitment
   * 
   * Each participant generates two random nonces (d_i, e_i) and computes
   * commitments D_i = d_i*G and E_i = e_i*G
   */
  async generateCommitment(sessionId: string): Promise<FROSTCommitment> {
    console.log(`[Participant ${this.guardianId}] Generating commitment for session ${sessionId}`);
    
    // Generate two random nonces
    const d = randomBytes(32);
    const e = randomBytes(32);
    
    const d_scalar = mod(bytesToBigInt(d), ed25519.CURVE.n);
    const e_scalar = mod(bytesToBigInt(e), ed25519.CURVE.n);
    
    // Compute commitments D = d*G and E = e*G
    const D = ed25519.ExtendedPoint.BASE.multiply(d_scalar);
    const E = ed25519.ExtendedPoint.BASE.multiply(e_scalar);
    
    const D_bytes = Buffer.from(D.toRawBytes());
    const E_bytes = Buffer.from(E.toRawBytes());
    
    // Store nonces for Round 2
    this.nonceStore.set(sessionId, {
      sessionId,
      guardianId: this.guardianId,
      d: bigIntToBytes(d_scalar, 32),
      e: bigIntToBytes(e_scalar, 32),
      D: D_bytes,
      E: E_bytes,
    });
    
    console.log(`[Participant ${this.guardianId}] Commitment generated`);
    
    return {
      guardianId: this.guardianId,
      hidingNonce: D_bytes,
      bindingNonce: E_bytes,
    };
  }
  
  /**
   * Round 2: Generate signature share
   * 
   * After seeing all commitments, compute signature share:
   * z_i = d_i + (e_i * ρ_i) + λ_i * a_i * c
   * 
   * where:
   * - ρ_i is the binding factor
   * - λ_i is the Lagrange coefficient
   * - a_i is the secret share
   * - c is the challenge
   */
  async generateSignatureShare(
    sessionId: string,
    message: Buffer,
    commitments: FROSTCommitment[]
  ): Promise<SignatureShare> {
    console.log(`[Participant ${this.guardianId}] Generating signature share for session ${sessionId}`);
    
    // Retrieve stored nonces
    const nonces = this.nonceStore.get(sessionId);
    if (!nonces) {
      throw new SigningError(`No nonces found for session ${sessionId}`);
    }
    
    const order = ed25519.CURVE.n;
    
    // Extract participant IDs
    const participants = commitments.map(c => c.guardianId);
    if (!participants.includes(this.guardianId)) {
      throw new SigningError('This participant is not in the commitment list');
    }
    
    // Step 1: Compute binding factor ρ_i = H(i, msg, {D_j, E_j})
    const bindingFactorInputs = [
      Buffer.from([this.guardianId]),
      message,
    ];
    
    for (const commitment of commitments.sort((a, b) => a.guardianId - b.guardianId)) {
      bindingFactorInputs.push(commitment.hidingNonce);
      bindingFactorInputs.push(commitment.bindingNonce);
    }
    
    const rho_i = hashToScalar(...bindingFactorInputs);
    
    // Step 2: Compute group commitment R = Σ(D_i + ρ_i * E_i)
    let R = ed25519.ExtendedPoint.ZERO;
    
    for (const commitment of commitments) {
      const D_point = ed25519.ExtendedPoint.fromHex(commitment.hidingNonce);
      const E_point = ed25519.ExtendedPoint.fromHex(commitment.bindingNonce);
      
      // For this commitment's ρ (recompute for each participant)
      const rho_j_inputs = [
        Buffer.from([commitment.guardianId]),
        message,
      ];
      for (const c of commitments.sort((a, b) => a.guardianId - b.guardianId)) {
        rho_j_inputs.push(c.hidingNonce);
        rho_j_inputs.push(c.bindingNonce);
      }
      const rho_j = hashToScalar(...rho_j_inputs);
      
      const E_scaled = E_point.multiply(rho_j);
      R = R.add(D_point).add(E_scaled);
    }
    
    const R_bytes = Buffer.from(R.toRawBytes());
    
    // Step 3: Compute challenge c = H(R, Y, msg)
    const groupPubKeyPoint = ed25519.ExtendedPoint.fromHex(this.groupPublicKey);
    const Y_bytes = Buffer.from(groupPubKeyPoint.toRawBytes());
    
    const c = hashToScalar(R_bytes, Y_bytes, message);
    
    // Step 4: Compute Lagrange coefficient λ_i
    const lambda_i = computeLagrangeCoefficient(this.guardianId, participants);
    
    // Step 5: Compute signature share z_i = d_i + (e_i * ρ_i) + λ_i * a_i * c
    const d_i = bytesToBigInt(nonces.d);
    const e_i = bytesToBigInt(nonces.e);
    const a_i = bytesToBigInt(this.secretShare);
    
    const term1 = d_i;
    const term2 = mod(e_i * rho_i, order);
    const term3 = mod(mod(lambda_i * a_i, order) * c, order);
    
    const z_i = mod(term1 + term2 + term3, order);
    
    console.log(`[Participant ${this.guardianId}] Signature share generated`);
    
    return {
      guardianId: this.guardianId,
      zShare: bigIntToBytes(z_i, 32),
    };
  }
  
  /**
   * Clean up nonces for a session (security best practice)
   */
  clearNonces(sessionId: string): void {
    this.nonceStore.delete(sessionId);
  }
}
