// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {GuardianHook} from "../GuardianHook.sol";

/**
 * @title DeployGuardianHook
 * @notice Deployment script for Guardian Protocol's Uniswap v4 Hook
 *
 * Usage:
 *   forge script script/DeployGuardianHook.s.sol \
 *     --rpc-url $RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast \
 *     --verify
 */
contract DeployGuardianHook is Script {
    // Uniswap v4 PoolManager addresses (official deployments)
    address constant POOL_MANAGER_SEPOLIA = 0x8C4BcBE6b9eF47855f97E675296FA3F6fafa5F1A;
    address constant POOL_MANAGER_BASE_SEPOLIA = 0x7Da1D65F8B249183667cdE74C5CBD46dD38AA829;

    // Set these before deployment
    address securityMiddleware;
    address guardianRegistry;

    function setUp() public {
        // Load from environment or set directly
        securityMiddleware = vm.envOr("SECURITY_MIDDLEWARE", address(0));
        guardianRegistry = vm.envOr("GUARDIAN_REGISTRY", address(0));
    }

    function run() public {
        // Determine network and pool manager
        uint256 chainId = block.chainid;
        address poolManager;

        if (chainId == 11155111) {
            // Sepolia
            poolManager = POOL_MANAGER_SEPOLIA;
            console.log("Deploying to Sepolia...");
        } else if (chainId == 84532) {
            // Base Sepolia
            poolManager = POOL_MANAGER_BASE_SEPOLIA;
            console.log("Deploying to Base Sepolia...");
        } else {
            revert("Unsupported network");
        }

        console.log("PoolManager:", poolManager);
        console.log("SecurityMiddleware:", securityMiddleware);
        console.log("GuardianRegistry:", guardianRegistry);

        vm.startBroadcast();

        // Calculate required flags
        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG |
            Hooks.BEFORE_SWAP_FLAG |
            Hooks.AFTER_SWAP_FLAG |
            Hooks.BEFORE_ADD_LIQUIDITY_FLAG
        );

        // Mine valid hook address
        bytes memory creationCode = type(GuardianHook).creationCode;
        bytes memory constructorArgs = abi.encode(
            poolManager,
            securityMiddleware,
            guardianRegistry
        );

        (address hookAddress, bytes32 salt) = mineHookAddress(
            flags,
            creationCode,
            constructorArgs
        );

        console.log("Mined hook address:", hookAddress);
        console.log("Salt:", vm.toString(salt));

        // Deploy hook
        GuardianHook hook = new GuardianHook{salt: salt}(
            IPoolManager(poolManager),
            securityMiddleware,
            guardianRegistry
        );

        require(address(hook) == hookAddress, "Address mismatch");

        console.log("GuardianHook deployed at:", address(hook));

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== Deployment Complete ===");
        console.log("Network:", chainId);
        console.log("GuardianHook:", address(hook));
        console.log("PoolManager:", poolManager);
        console.log("SecurityMiddleware:", securityMiddleware);
        console.log("===========================\n");
    }

    /// @notice Mine a valid hook address
    function mineHookAddress(
        uint160 flags,
        bytes memory creationCode,
        bytes memory constructorArgs
    ) internal view returns (address hookAddress, bytes32 salt) {
        bytes memory bytecode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 bytecodeHash = keccak256(bytecode);

        for (uint256 i = 0; i < 100000; i++) {
            salt = bytes32(i);
            hookAddress = computeCreate2Address(salt, bytecodeHash);

            if (uint160(hookAddress) & flags == flags) {
                return (hookAddress, salt);
            }
        }

        revert("Could not find valid hook address");
    }

    /// @notice Compute CREATE2 address
    function computeCreate2Address(
        bytes32 salt,
        bytes32 bytecodeHash
    ) internal view returns (address) {
        return address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            bytes1(0xff),
                            address(this),
                            salt,
                            bytecodeHash
                        )
                    )
                )
            )
        );
    }
}