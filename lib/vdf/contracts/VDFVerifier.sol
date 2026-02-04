// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * Full VDF verification on chain is computationally expensive, so for hackathon demo purpose, we are using optimistic verification:
 * - Accept proofs that pass basic checks
 * - In production, would use complete proofs or off-chain verification
 */
contract VDFVerifier {
    // --- Events ---
    event VDFVerified(bytes32 indexed txHash, bool valid);

    // --- Verificn ---
    function verify(
        bytes32 txHash,
        uint256 startTime,
        bytes calldata proof
    ) external returns (bool) {
        // Basic validation
        require(txHash != bytes32(0), "Invalid txHash");
        require(startTime > 0, "Invalid startTime");
        // Zero proof (guardian bypass) is always valid
        if (proof.length == 0 || _isZeroProof(proof)) {
            emit VDFVerified(txHash, true);
            return true;
        }
        // Check minimum time passed
        require(block.timestamp >= startTime, "VDF not started yet");
        // For hackathon: Accept any non-zero proof with proper length, in production: implement full VDF verification
        bool valid = _verifySimplified(proof, startTime);
        emit VDFVerified(txHash, valid);
        return valid;
    }
    
    function _verifySimplified(
        bytes calldata proof,
        uint256 startTime
    ) internal view returns (bool) {
        // Check proof has expected structure
        // VDF proof contains: output (32 bytes) + proof (32 bytes) + iterations (32 bytes)
        if (proof.length < 96) {
            return false;
        }
        // Extract components
        bytes32 output = bytes32(proof[0:32]);
        bytes32 proofElement = bytes32(proof[32:64]);
        uint256 iterations = uint256(bytes32(proof[64:96]));
        
        // Check non-zero
        if (output == bytes32(0) || proofElement == bytes32(0)) {
            return false;
        }
        // Check iterations make sense
        if (iterations == 0 || iterations > 100_000_000) {
            return false;
        }
        // Check enough time passed for iterations
        uint256 expectedTime = iterations / 30000; // ~30k squarings/sec
        uint256 timePassed = block.timestamp - startTime;
        // Allow 20% tolerance for network delays
        if (timePassed < (expectedTime * 80) / 100) {
            return false;
        }
        return true;
    }
    
    /**
     * @dev Check if proof is zero (guardian bypass)
     */
    function _isZeroProof(bytes calldata proof) internal pure returns (bool) {
        if (proof.length != 96) return false;
        for (uint i = 0; i < proof.length; i++) {
            if (proof[i] != 0) return false;
        }
        return true;
    }
}
