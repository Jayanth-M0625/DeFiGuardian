// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console} from "forge-std/Script.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {GuardianHook} from "../src/GuardianHook.sol";

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
    // Uniswap v4 PoolManager addresses (official deployments — https://docs.uniswap.org/contracts/v4/deployments)
    address constant POOL_MANAGER_SEPOLIA = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POOL_MANAGER_BASE_SEPOLIA = 0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408;

    // Set these before deployment
    address securityMiddleware;
    address guardianRegistry;

    function setUp() public {
        // Load from environment or set directly
        securityMiddleware = vm.envOr("SECURITY_MIDDLEWARE", address(0));
        guardianRegistry = vm.envOr("GUARDIAN_REGISTRY", address(0));
    }

    // Foundry's CREATE2 deployer (deterministic deployment proxy)
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_KEY");
        address deployer = vm.addr(deployerPrivateKey);

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
        console.log("Deployer:", deployer);

        // Calculate required flags
        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG |
            Hooks.BEFORE_SWAP_FLAG |
            Hooks.AFTER_SWAP_FLAG |
            Hooks.BEFORE_ADD_LIQUIDITY_FLAG
        );

        // Mine valid hook address BEFORE broadcast (uses deployer address, not address(this))
        bytes memory creationCode = type(GuardianHook).creationCode;
        bytes memory constructorArgs = abi.encode(
            poolManager,
            securityMiddleware,
            guardianRegistry
        );

        (address hookAddress, bytes32 salt) = mineHookAddress(
            flags,
            creationCode,
            constructorArgs,
            CREATE2_DEPLOYER
        );

        console.log("Mined hook address:", hookAddress);
        console.log("Salt:", vm.toString(salt));

        // Now broadcast the actual deployment
        vm.startBroadcast(deployerPrivateKey);

        // Deploy hook with CREATE2
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

    /// @notice Mine a valid hook address using CREATE2
    function mineHookAddress(
        uint160 flags,
        bytes memory creationCode,
        bytes memory constructorArgs,
        address deployer
    ) internal pure returns (address hookAddress, bytes32 salt) {
        bytes memory bytecode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 bytecodeHash = keccak256(bytecode);

        for (uint256 i = 0; i < 100000; i++) {
            salt = bytes32(i);
            hookAddress = address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                bytes1(0xff),
                                deployer,
                                salt,
                                bytecodeHash
                            )
                        )
                    )
                )
            );

            if (uint160(hookAddress) & flags == flags) {
                return (hookAddress, salt);
            }
        }

        revert("Could not find valid hook address");
    }
}