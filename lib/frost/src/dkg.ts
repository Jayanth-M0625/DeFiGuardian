/*
 * Distributed Key Generation for FROST
 * Production would use full DKG ceremony with VSS
 */

import { ed25519 } from '@noble/curves/ed25519';
import { randomBytes } from '@noble/hashes/utils';
import { sha512 } from '@noble/hashes/sha512';
import { DKGConfig, DKGOutput, GuardianKeyShare, DKGError } from './types';

// ─── Constants ───

const SCALAR_SIZE = 32; // Ed25519 scalar size in bytes
const POINT_SIZE = 32;  // Ed25519 point size in bytes

// ─── Polynomial Operations ───

/**
 * Generate a random polynomial of degree t-1
 * coefficients[0] is the secret, coefficients[1..t-1] are random
 */
function generatePolynomial(degree: number): bigint[] {
  const coefficients: bigint[] = [];
  const order = ed25519.CURVE.n; // Ed25519 curve order
  
  for (let i = 0; i <= degree; i++) {
    const randomScalar = randomBytes(SCALAR_SIZE);
    const coefficient = mod(bytesToBigInt(randomScalar), order);
    coefficients.push(coefficient);
  }
  
  return coefficients;
}

/**
 * Evaluate polynomial at point x
 * f(x) = a0 + a1*x + a2*x^2 + ... + an*x^n
 */
function evaluatePolynomial(coefficients: bigint[], x: bigint, order: bigint): bigint {
  let result = 0n;
  let xPower = 1n;
  
  for (const coeff of coefficients) {
    result = mod(result + mod(coeff * xPower, order), order);
    xPower = mod(xPower * x, order);
  }
  
  return result;
}

// ─── Modular Arithmetic ───

function mod(a: bigint, m: bigint): bigint {
  const result = a % m;
  return result >= 0n ? result : result + m;
}

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

// ─── Trusted Dealer DKG (Hackathon Simplification) ───

/**
 * Perform DKG using a trusted dealer
 * 
 * SECURITY NOTE: This is NOT suitable for production!
 * In production, use full DKG with VSS where no single party knows the master secret.
 * 
 * For hackathon demo purposes, this simulates the DKG output.
 */
export async function performDKG(config: DKGConfig): Promise<DKGOutput> {
  const { threshold, totalParticipants } = config;
  
  // Validate configuration
  if (threshold > totalParticipants) {
    throw new DKGError(`Threshold (${threshold}) cannot exceed total participants (${totalParticipants})`);
  }
  
  if (threshold < 1 || totalParticipants < 1) {
    throw new DKGError('Threshold and total participants must be positive');
  }
  
  console.log(`[DKG] Generating ${threshold}-of-${totalParticipants} threshold scheme`);
  
  const order = ed25519.CURVE.n;
  const degree = threshold - 1; // t-1 degree polynomial for t threshold
  
  // Step 1: Generate master polynomial
  const polynomial = generatePolynomial(degree);
  const masterSecret = polynomial[0]; // First coefficient is the master secret
  
  console.log('[DKG] Master polynomial generated');
  
  // Step 2: Derive group public key from master secret
  const groupPublicKeyPoint = ed25519.ExtendedPoint.BASE.multiply(masterSecret);
  const groupPublicKey = Buffer.from(groupPublicKeyPoint.toRawBytes());
  
  console.log('[DKG] Group public key derived:', groupPublicKey.toString('hex').slice(0, 16) + '...');
  
  // Step 3: Generate secret shares for each participant
  const guardianShares: GuardianKeyShare[] = [];
  const vssCommitments: Buffer[] = [];
  
  // Generate VSS commitments (public commitments to polynomial coefficients)
  for (let j = 0; j <= degree; j++) {
    const commitment = ed25519.ExtendedPoint.BASE.multiply(polynomial[j]);
    vssCommitments.push(Buffer.from(commitment.toRawBytes()));
  }
  
  // Generate shares for each participant
  for (let i = 0; i < totalParticipants; i++) {
    const participantId = i;
    const x = BigInt(participantId + 1); // x values are 1, 2, 3, ..., n (not 0)
    
    // Evaluate polynomial at x to get secret share
    const secretShareValue = evaluatePolynomial(polynomial, x, order);
    const secretShare = bigIntToBytes(secretShareValue, SCALAR_SIZE);
    
    // Derive individual public key from secret share
    const publicKeyPoint = ed25519.ExtendedPoint.BASE.multiply(secretShareValue);
    const publicKey = Buffer.from(publicKeyPoint.toRawBytes());
    
    guardianShares.push({
      participantId,
      secretShare,
      publicKey,
    });
    
    console.log(`[DKG] Generated share for guardian ${participantId}`);
  }
  
  console.log('[DKG] All shares generated successfully');
  
  return {
    groupPublicKey,
    guardianShares,
    vssCommitments,
  };
}

/**
 * Verify a secret share against VSS commitments
 * This allows participants to verify their shares are valid
 */
export function verifyShare(
  share: GuardianKeyShare,
  vssCommitments: Buffer[],
): boolean {
  try {
    const { participantId, secretShare } = share;
    const x = BigInt(participantId + 1);
    const order = ed25519.CURVE.n;
    
    // Compute expected commitment: C = ∏ (commitment_j)^(x^j)
    let expectedCommitment = ed25519.ExtendedPoint.ZERO;
    let xPower = 1n;
    
    for (const commitmentBytes of vssCommitments) {
      const commitment = ed25519.ExtendedPoint.fromHex(commitmentBytes);
      const term = commitment.multiply(xPower);
      expectedCommitment = expectedCommitment.add(term);
      xPower = mod(xPower * x, order);
    }
    
    // Compute actual commitment from secret share: s_i * G
    const secretValue = bytesToBigInt(secretShare);
    const actualCommitment = ed25519.ExtendedPoint.BASE.multiply(secretValue);
    
    // Verify they match
    return expectedCommitment.equals(actualCommitment);
  } catch (error) {
    console.error('[DKG] Share verification failed:', error);
    return false;
  }
}

/**
 * Reconstruct public key from VSS commitments
 * Useful for verification
 */
export function reconstructPublicKey(vssCommitments: Buffer[]): Buffer {
  if (vssCommitments.length === 0) {
    throw new DKGError('No VSS commitments provided');
  }
  
  // The first commitment is the group public key (commitment to a0)
  return vssCommitments[0];
}
