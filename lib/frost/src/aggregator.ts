// FROST Signature Aggregator - Combines signature shares and verifies

import { ed25519 } from '@noble/curves/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { 
  SignatureShare, 
  FROSTCommitment, 
  FROSTSignature, 
  VerificationError 
} from './types';

// --- Helpers ---

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
 * Hash function for computing challenge and binding factors
 */
function hashToScalar(...inputs: Buffer[]): bigint {
  const combined = Buffer.concat(inputs);
  const hash = sha512(combined);
  const hashValue = bytesToBigInt(hash.slice(0, 32));
  return mod(hashValue, ed25519.CURVE.n);
}

// --- Signature Aggregation ---

/**
 * Aggregate signature shares into a final FROST signature
 * 
 * Algorithm:
 * 1. Compute group commitment R = Σ(D_i + ρ_i * E_i)
 * 2. Sum all signature shares: z = Σ(z_i)
 * 3. Return signature (R, z)
 */
export async function aggregateSignatureShares(
  shares: SignatureShare[],
  commitments: FROSTCommitment[],
  message: Buffer,
  groupPublicKey: Buffer,
  threshold: number
): Promise<FROSTSignature> {
  console.log('[Aggregator] Starting signature aggregation');
  
  if (shares.length < threshold) {
    throw new VerificationError(
      `Not enough shares: ${shares.length} < ${threshold}`
    );
  }
  
  if (commitments.length < threshold) {
    throw new VerificationError(
      `Not enough commitments: ${commitments.length} < ${threshold}`
    );
  }
  
  const order = ed25519.CURVE.n;
  
  // Step 1: Compute group commitment R = Σ(D_i + ρ_i * E_i)
  let R = ed25519.ExtendedPoint.ZERO;
  
  for (const commitment of commitments) {
    const D_point = ed25519.ExtendedPoint.fromHex(commitment.hidingNonce);
    const E_point = ed25519.ExtendedPoint.fromHex(commitment.bindingNonce);
    
    // Compute binding factor ρ_i = H(i, msg, {D_j, E_j})
    const bindingFactorInputs = [
      Buffer.from([commitment.guardianId]),
      message,
    ];
    
    for (const c of commitments.sort((a, b) => a.guardianId - b.guardianId)) {
      bindingFactorInputs.push(c.hidingNonce);
      bindingFactorInputs.push(c.bindingNonce);
    }
    
    const rho_i = hashToScalar(...bindingFactorInputs);
    
    // Add D_i + ρ_i * E_i to running sum
    const E_scaled = E_point.multiply(rho_i);
    R = R.add(D_point).add(E_scaled);
  }
  
  const R_bytes = Buffer.from(R.toRawBytes());
  console.log('[Aggregator] Group commitment R computed');
  
  // Step 2: Sum all signature shares: z = Σ(z_i)
  let z = 0n;
  
  for (const share of shares) {
    const z_i = bytesToBigInt(share.zShare);
    z = mod(z + z_i, order);
  }
  
  const z_bytes = bigIntToBytes(z, 32);
  console.log('[Aggregator] Signature scalar z computed');
  
  const signature: FROSTSignature = {
    R: R_bytes,
    z: z_bytes,
    groupPublicKey,
  };
  
  // Step 3: Verify the aggregated signature before returning
  const isValid = await verifyFROSTSignature(signature, message);
  if (!isValid) {
    throw new VerificationError('Aggregated signature verification failed');
  }
  
  console.log('[Aggregator] Signature aggregation complete and verified');
  
  return signature;
}

// --- Signature Verification ---

/**
 * Verify a FROST signature
 * 
 * Verification equation: z*G == R + c*Y
 * where:
 * - z is the aggregated signature scalar
 * - G is the base point
 * - R is the group commitment
 * - c is the challenge H(R, Y, m)
 * - Y is the group public key
 */
export async function verifyFROSTSignature(
  signature: FROSTSignature,
  message: Buffer
): Promise<boolean> {
  try {
    const { R, z, groupPublicKey } = signature;
    
    // Parse signature components
    const R_point = ed25519.ExtendedPoint.fromHex(R);
    const z_scalar = bytesToBigInt(z);
    const Y_point = ed25519.ExtendedPoint.fromHex(groupPublicKey);
    
    // Compute challenge c = H(R, Y, m)
    const c = hashToScalar(R, groupPublicKey, message);
    
    // Compute left side: z*G
    const left = ed25519.ExtendedPoint.BASE.multiply(z_scalar);
    
    // Compute right side: R + c*Y
    const cY = Y_point.multiply(c);
    const right = R_point.add(cY);
    
    // Verify equality
    const isValid = left.equals(right);
    
    if (isValid) {
      console.log('[Verifier] Signature verification: VALID ✓');
    } else {
      console.log('[Verifier] Signature verification: INVALID ✗');
    }
    
    return isValid;
  } catch (error) {
    console.error('[Verifier] Signature verification error:', error);
    return false;
  }
}

/**
 * Convert FROST signature to format for Solidity verification
 */
export function formatSignatureForSolidity(signature: FROSTSignature): {
  R_x: string;
  R_y: string;
  s: string;
} {
  // For Ed25519, we need to extract x,y coordinates from R point
  const R_point = ed25519.ExtendedPoint.fromHex(signature.R);
  
  // Ed25519 point encoding: first 32 bytes is y-coordinate with sign bit
  const R_encoded = signature.R;
  
  // For Solidity, we'll pass the full R point and z scalar
  // Solidity contract will handle the point decompression
  return {
    R_x: '0x' + signature.R.toString('hex').slice(0, 64),
    R_y: '0x' + signature.R.toString('hex').slice(64),
    s: '0x' + signature.z.toString('hex'),
  };
}
