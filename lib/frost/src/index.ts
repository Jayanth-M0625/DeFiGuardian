/**
 * Main entry point for FROST threshold signatures
 */

// ─── Core Modules ───
export { performDKG, verifyShare, reconstructPublicKey } from './dkg';
export { FROSTCoordinator } from './coordinator';
export { FROSTParticipant } from './participant';
export { 
  aggregateSignatureShares, 
  verifyFROSTSignature,
  formatSignatureForSolidity 
} from './aggregator';

// ─── Types ───
export {
  DKGConfig,
  GuardianKeyShare,
  DKGOutput,
  SigningSession,
  FROSTCommitment,
  SignatureShare,
  FROSTSignature,
  NonceStore,
  FROSTError,
  DKGError,
  SigningError,
  VerificationError,
} from './types';

// ─── Constants ───
export const FROST_CONSTANTS = {
  THRESHOLD: 7,
  TOTAL_GUARDIANS: 10,
  SCALAR_SIZE: 32,
  POINT_SIZE: 32,
};
