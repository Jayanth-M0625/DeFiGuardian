// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/ILayerZeroEndpoint.sol";

/**
 * @title CrossChainMessenger
 * @notice Handles cross-chain security event propagation via LayerZero
 *
 * This contract:
 *   1. Broadcasts security events to all target chains
 *   2. Receives security events from other chains
 *   3. Verifies FROST signatures before executing actions
 *   4. Maintains event processing state to prevent replays
 *
 * Security Flow:
 *   Detection (Chain A) → Guardians vote → FROST signature
 *   → CrossChainMessenger.broadcast() → LayerZero → All chains
 *   → lzReceive() → Verify FROST → Execute action
 */
contract CrossChainMessenger is ILayerZeroReceiver {

    // ─── Events ───
    event SecurityEventBroadcast(
        bytes32 indexed eventId,
        uint8 eventType,
        uint8 severity,
        uint16[] targetChains
    );

    event SecurityEventReceived(
        bytes32 indexed eventId,
        uint16 sourceChainId,
        uint8 eventType,
        uint8 severity
    );

    event SecurityEventExecuted(
        bytes32 indexed eventId,
        bool success,
        string reason
    );

    event TrustedRemoteSet(uint16 chainId, bytes path);

    // ─── Enums ───
    enum EventType {
        EMERGENCY_PAUSE,    // 0
        BLACKLIST,          // 1
        THRESHOLD_UP,       // 2
        MONITOR,            // 3
        UNPAUSE,            // 4
        UNBLACKLIST         // 5
    }

    enum Severity {
        LOW,        // 0
        MEDIUM,     // 1
        HIGH,       // 2
        CRITICAL    // 3
    }

    // ─── Structs ───
    struct SecurityEvent {
        bytes32 eventId;
        uint256 sourceChainId;
        EventType eventType;
        Severity severity;
        uint256 timestamp;
        uint256 expiryTime;
        bytes actionParams;      // Encoded action parameters
        bytes frostSignature;    // FROST signature (R || z)
        bytes32 evidenceHash;    // Merkle root of evidence
    }

    struct ActionParams {
        uint256 pauseDuration;
        address targetAddress;
        uint8 newThreshold;
        address[] affectedProtocols;
    }

    // ─── State ───
    ILayerZeroEndpoint public immutable lzEndpoint;
    address public guardianRegistry;
    address public frostVerifier;

    // Trusted remote addresses per chain (for LayerZero security)
    mapping(uint16 => bytes) public trustedRemotes;

    // Processed events (prevents replay)
    mapping(bytes32 => bool) public processedEvents;

    // Chain ID mappings (EVM chain ID → LayerZero chain ID)
    mapping(uint256 => uint16) public evmToLzChainId;
    mapping(uint16 => uint256) public lzToEvmChainId;

    // Default gas for cross-chain messages
    uint256 public defaultGasLimit = 200000;

    // ─── Modifiers ───
    modifier onlyGuardianRegistry() {
        require(msg.sender == guardianRegistry, "Only GuardianRegistry");
        _;
    }

    modifier onlyLzEndpoint() {
        require(msg.sender == address(lzEndpoint), "Only LayerZero endpoint");
        _;
    }

    // ─── Constructor ───
    constructor(
        address _lzEndpoint,
        address _guardianRegistry,
        address _frostVerifier
    ) {
        lzEndpoint = ILayerZeroEndpoint(_lzEndpoint);
        guardianRegistry = _guardianRegistry;
        frostVerifier = _frostVerifier;

        // Initialize chain ID mappings
        _initChainMappings();
    }

    // ─── Broadcasting ───

    /**
     * @notice Broadcast a security event to multiple chains
     * @dev Only callable by GuardianRegistry after FROST signature is created
     * @param eventId Unique event identifier
     * @param eventType Type of security event
     * @param severity Event severity level
     * @param targetLzChainIds LayerZero chain IDs to broadcast to
     * @param actionParams Encoded action parameters
     * @param frostSignature FROST signature (R || z, 64 bytes)
     * @param evidenceHash Merkle root of evidence data
     */
    function broadcast(
        bytes32 eventId,
        EventType eventType,
        Severity severity,
        uint16[] calldata targetLzChainIds,
        bytes calldata actionParams,
        bytes calldata frostSignature,
        bytes32 evidenceHash
    ) external payable onlyGuardianRegistry {
        require(!processedEvents[eventId], "Event already processed");
        require(frostSignature.length == 64, "Invalid signature length");

        // Mark as processed locally
        processedEvents[eventId] = true;

        // Build payload
        bytes memory payload = abi.encode(
            eventId,
            block.chainid,
            uint8(eventType),
            uint8(severity),
            block.timestamp,
            block.timestamp + 1 hours, // 1 hour expiry
            actionParams,
            frostSignature,
            evidenceHash
        );

        // Calculate fee per chain
        uint256 feePerChain = msg.value / targetLzChainIds.length;

        // Send to each target chain
        for (uint256 i = 0; i < targetLzChainIds.length; i++) {
            uint16 dstChainId = targetLzChainIds[i];

            // Skip if no trusted remote set
            if (trustedRemotes[dstChainId].length == 0) continue;

            // Adapter params: version 1, gas limit
            bytes memory adapterParams = abi.encodePacked(
                uint16(1),
                defaultGasLimit
            );

            lzEndpoint.send{value: feePerChain}(
                dstChainId,
                trustedRemotes[dstChainId],
                payload,
                payable(msg.sender),
                address(0),
                adapterParams
            );
        }

        emit SecurityEventBroadcast(eventId, uint8(eventType), uint8(severity), targetLzChainIds);
    }

    // ─── Receiving ───

    /**
     * @notice Receive a security event from another chain
     * @dev Called by LayerZero endpoint
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external override onlyLzEndpoint {
        // Verify source is trusted
        require(
            keccak256(_srcAddress) == keccak256(trustedRemotes[_srcChainId]),
            "Invalid source"
        );

        // Decode payload
        (
            bytes32 eventId,
            uint256 sourceChainId,
            uint8 eventType,
            uint8 severity,
            uint256 timestamp,
            uint256 expiryTime,
            bytes memory actionParams,
            bytes memory frostSignature,
            bytes32 evidenceHash
        ) = abi.decode(_payload, (bytes32, uint256, uint8, uint8, uint256, uint256, bytes, bytes, bytes32));

        emit SecurityEventReceived(eventId, _srcChainId, eventType, severity);

        // Process the event
        _processSecurityEvent(
            eventId,
            sourceChainId,
            EventType(eventType),
            Severity(severity),
            timestamp,
            expiryTime,
            actionParams,
            frostSignature,
            evidenceHash
        );
    }

    // ─── Event Processing ───

    function _processSecurityEvent(
        bytes32 eventId,
        uint256 sourceChainId,
        EventType eventType,
        Severity severity,
        uint256 timestamp,
        uint256 expiryTime,
        bytes memory actionParams,
        bytes memory frostSignature,
        bytes32 evidenceHash
    ) internal {
        // Check 1: Not already processed
        if (processedEvents[eventId]) {
            emit SecurityEventExecuted(eventId, false, "Already processed");
            return;
        }

        // Check 2: Not expired
        if (block.timestamp > expiryTime) {
            emit SecurityEventExecuted(eventId, false, "Event expired");
            return;
        }

        // Check 3: Verify FROST signature
        if (!_verifyFrostSignature(eventId, frostSignature)) {
            emit SecurityEventExecuted(eventId, false, "Invalid FROST signature");
            return;
        }

        // Mark as processed
        processedEvents[eventId] = true;

        // Get LayerZero chain ID from source chain ID
        uint16 srcLzChainId = evmToLzChainId[sourceChainId];
        if (srcLzChainId == 0) {
            srcLzChainId = uint16(sourceChainId); // Fallback to direct casting
        }

        // Execute action based on event type
        bool success = _executeAction(eventId, srcLzChainId, eventType, actionParams);

        emit SecurityEventExecuted(
            eventId,
            success,
            success ? "Executed successfully" : "Execution failed"
        );
    }

    function _verifyFrostSignature(
        bytes32 eventId,
        bytes memory signature
    ) internal view returns (bool) {
        if (frostVerifier == address(0)) {
            // No verifier set - for testing, accept all
            return true;
        }

        // Extract R and z from signature
        require(signature.length == 64, "Invalid signature length");
        bytes32 R;
        bytes32 z;
        assembly {
            R := mload(add(signature, 32))
            z := mload(add(signature, 64))
        }

        // Call FROST verifier
        (bool success, bytes memory result) = frostVerifier.staticcall(
            abi.encodeWithSignature("verify(bytes32,bytes32,bytes32)", eventId, R, z)
        );

        if (!success) return false;
        return abi.decode(result, (bool));
    }

    function _executeAction(
        bytes32 eventId,
        uint16 sourceChainId,
        EventType eventType,
        bytes memory actionParams
    ) internal returns (bool) {
        if (guardianRegistry == address(0)) {
            return false;
        }

        // Decode action params
        ActionParams memory params = abi.decode(actionParams, (ActionParams));

        if (eventType == EventType.EMERGENCY_PAUSE) {
            // Call GuardianRegistry to pause
            // Build reason string from pause duration
            string memory reason = "Cross-chain emergency pause";
            (bool success,) = guardianRegistry.call(
                abi.encodeWithSignature(
                    "receiveRemotePause(bytes32,uint16,string)",
                    eventId,
                    sourceChainId,
                    reason
                )
            );
            return success;

        } else if (eventType == EventType.BLACKLIST) {
            // Call GuardianRegistry to blacklist
            (bool success,) = guardianRegistry.call(
                abi.encodeWithSignature(
                    "receiveRemoteBlacklist(bytes32,uint16,address)",
                    eventId,
                    sourceChainId,
                    params.targetAddress
                )
            );
            return success;

        } else if (eventType == EventType.THRESHOLD_UP) {
            // Call GuardianRegistry to increase threshold
            (bool success,) = guardianRegistry.call(
                abi.encodeWithSignature(
                    "receiveRemoteThresholdIncrease(bytes32,uint16)",
                    eventId,
                    sourceChainId
                )
            );
            return success;

        } else if (eventType == EventType.UNPAUSE) {
            // Call GuardianRegistry to unpause
            (bool success,) = guardianRegistry.call(
                abi.encodeWithSignature(
                    "receiveRemoteUnpause(bytes32,uint16)",
                    eventId,
                    sourceChainId
                )
            );
            return success;

        } else if (eventType == EventType.UNBLACKLIST) {
            // Call GuardianRegistry to unblacklist
            (bool success,) = guardianRegistry.call(
                abi.encodeWithSignature(
                    "receiveRemoteUnblacklist(bytes32,uint16,address)",
                    eventId,
                    sourceChainId,
                    params.targetAddress
                )
            );
            return success;

        } else if (eventType == EventType.MONITOR) {
            // Call GuardianRegistry to log monitor event
            (bool success,) = guardianRegistry.call(
                abi.encodeWithSignature(
                    "receiveRemoteMonitor(bytes32,uint16)",
                    eventId,
                    sourceChainId
                )
            );
            return success;
        }

        return false;
    }

    // ─── Admin Functions ───

    /**
     * @notice Set trusted remote address for a chain
     * @dev This is the CrossChainMessenger address on the remote chain
     */
    function setTrustedRemote(uint16 _lzChainId, bytes calldata _path) external onlyGuardianRegistry {
        trustedRemotes[_lzChainId] = _path;
        emit TrustedRemoteSet(_lzChainId, _path);
    }

    /**
     * @notice Update guardian registry address
     */
    function setGuardianRegistry(address _guardianRegistry) external onlyGuardianRegistry {
        guardianRegistry = _guardianRegistry;
    }

    /**
     * @notice Update FROST verifier address
     */
    function setFrostVerifier(address _frostVerifier) external onlyGuardianRegistry {
        frostVerifier = _frostVerifier;
    }

    /**
     * @notice Update default gas limit for cross-chain messages
     */
    function setDefaultGasLimit(uint256 _gasLimit) external onlyGuardianRegistry {
        defaultGasLimit = _gasLimit;
    }

    // ─── Views ───

    /**
     * @notice Estimate fee for broadcasting to multiple chains
     */
    function estimateBroadcastFee(
        uint16[] calldata targetLzChainIds,
        bytes calldata payload
    ) external view returns (uint256 totalFee) {
        bytes memory adapterParams = abi.encodePacked(uint16(1), defaultGasLimit);

        for (uint256 i = 0; i < targetLzChainIds.length; i++) {
            (uint256 nativeFee,) = lzEndpoint.estimateFees(
                targetLzChainIds[i],
                address(this),
                payload,
                false,
                adapterParams
            );
            totalFee += nativeFee;
        }
    }

    /**
     * @notice Check if an event has been processed
     */
    function isEventProcessed(bytes32 eventId) external view returns (bool) {
        return processedEvents[eventId];
    }

    /**
     * @notice Get trusted remote for a chain
     */
    function getTrustedRemote(uint16 _lzChainId) external view returns (bytes memory) {
        return trustedRemotes[_lzChainId];
    }

    // ─── Internal ───

    function _initChainMappings() internal {
        // EVM Chain ID → LayerZero Chain ID
        evmToLzChainId[1] = 101;        // Ethereum
        evmToLzChainId[137] = 109;      // Polygon
        evmToLzChainId[42161] = 110;    // Arbitrum
        evmToLzChainId[10] = 111;       // Optimism
        evmToLzChainId[8453] = 184;     // Base
        evmToLzChainId[43114] = 106;    // Avalanche
        evmToLzChainId[56] = 102;       // BSC

        // LayerZero Chain ID → EVM Chain ID
        lzToEvmChainId[101] = 1;
        lzToEvmChainId[109] = 137;
        lzToEvmChainId[110] = 42161;
        lzToEvmChainId[111] = 10;
        lzToEvmChainId[184] = 8453;
        lzToEvmChainId[106] = 43114;
        lzToEvmChainId[102] = 56;
    }

    // ─── Receive ETH ───
    receive() external payable {}
}
