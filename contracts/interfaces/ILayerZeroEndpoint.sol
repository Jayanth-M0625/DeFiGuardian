// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ILayerZeroEndpoint
 * @notice Interface for LayerZero endpoint contract
 * @dev LayerZero is a cross-chain messaging protocol that enables
 *      secure communication between different blockchains.
 */
interface ILayerZeroEndpoint {
    /**
     * @notice Send a message to another chain
     * @param _dstChainId Destination chain ID (LayerZero chain ID, not EVM chain ID)
     * @param _destination Encoded destination address on target chain
     * @param _payload Message payload to send
     * @param _refundAddress Address to refund excess fees
     * @param _zroPaymentAddress ZRO token payment address (use address(0) for native)
     * @param _adapterParams Additional adapter parameters (gas limits, etc.)
     */
    function send(
        uint16 _dstChainId,
        bytes calldata _destination,
        bytes calldata _payload,
        address payable _refundAddress,
        address _zroPaymentAddress,
        bytes calldata _adapterParams
    ) external payable;

    /**
     * @notice Estimate fees for sending a message
     * @param _dstChainId Destination chain ID
     * @param _userApplication User application address
     * @param _payload Message payload
     * @param _payInZRO Whether to pay in ZRO token
     * @param _adapterParams Additional adapter parameters
     * @return nativeFee Fee in native token
     * @return zroFee Fee in ZRO token
     */
    function estimateFees(
        uint16 _dstChainId,
        address _userApplication,
        bytes calldata _payload,
        bool _payInZRO,
        bytes calldata _adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee);

    /**
     * @notice Get the inbound nonce for a source chain and address
     */
    function getInboundNonce(uint16 _srcChainId, bytes calldata _srcAddress) external view returns (uint64);

    /**
     * @notice Get the outbound nonce for a destination chain and address
     */
    function getOutboundNonce(uint16 _dstChainId, address _srcAddress) external view returns (uint64);
}

/**
 * @title ILayerZeroReceiver
 * @notice Interface for contracts that receive LayerZero messages
 */
interface ILayerZeroReceiver {
    /**
     * @notice Receive a message from another chain
     * @param _srcChainId Source chain ID (LayerZero chain ID)
     * @param _srcAddress Source address on the origin chain
     * @param _nonce Message nonce
     * @param _payload Message payload
     */
    function lzReceive(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint64 _nonce,
        bytes calldata _payload
    ) external;
}

/**
 * @title ILayerZeroUserApplicationConfig
 * @notice Interface for LayerZero user application configuration
 */
interface ILayerZeroUserApplicationConfig {
    /**
     * @notice Set configuration for LayerZero
     */
    function setConfig(
        uint16 _version,
        uint16 _chainId,
        uint256 _configType,
        bytes calldata _config
    ) external;

    /**
     * @notice Set send version
     */
    function setSendVersion(uint16 _version) external;

    /**
     * @notice Set receive version
     */
    function setReceiveVersion(uint16 _version) external;
}
