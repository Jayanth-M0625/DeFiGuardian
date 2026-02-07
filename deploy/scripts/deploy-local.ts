/**
 * Deploy all DeFiGuardian contracts to local Hardhat node
 * 
 * Usage:
 *   1. Start local node: npx hardhat node
 *   2. Run this script: npx hardhat run scripts/deploy-local.ts --network localhost
 * 
 * Deployment Order:
 *   1. VDFVerifier (no deps)
 *   2. Groth16Verifier (no deps)
 *   3. FROSTVerifier (placeholder registry)
 *   4. ZKVoteVerifier (groth16, placeholder registry, mock guardians)
 *   5. GuardianRegistry (zkVoteVerifier, frostVerifier, threshold)
 *   6. SecurityMiddleware (zkVoteVerifier, vdfVerifier, frostVerifier)
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Mock guardian data for local testing
const THRESHOLD = 7;

// Generate mock guardian data (10 guardians)
// Returns pubKeys as [2][10] array: [[x0..x9], [y0..y9]]
function generateMockGuardians(): {
  pubKeys: [bigint[], bigint[]];
  addresses: string[];
} {
  const xCoords: bigint[] = [];
  const yCoords: bigint[] = [];
  const addresses: string[] = [];

  for (let i = 0; i < 10; i++) {
    // Mock public keys (random but deterministic for testing)
    const seed = BigInt(i + 1);
    xCoords.push(seed * BigInt("0x1234567890abcdef"));
    yCoords.push(seed * BigInt("0xfedcba0987654321"));
    // Mock addresses
    addresses.push(ethers.Wallet.createRandom().address);
  }

  return { pubKeys: [xCoords, yCoords], addresses };
}

async function main() {
  console.log("🚀 Deploying DeFiGuardian contracts to local network...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  const deployed: Record<string, string> = {};

  // 1. Deploy VDFVerifier
  console.log("1/6 Deploying VDFVerifier...");
  const VDFVerifier = await ethers.getContractFactory("VDFVerifier");
  const vdfVerifier = await VDFVerifier.deploy();
  await vdfVerifier.waitForDeployment();
  deployed.VDFVerifier = await vdfVerifier.getAddress();
  console.log("    VDFVerifier:", deployed.VDFVerifier);

  // 2. Deploy Groth16Verifier (from GuardianVoteVerifier.sol)
  console.log("2/6 Deploying Groth16Verifier...");
  const Groth16Verifier = await ethers.getContractFactory("Groth16Verifier");
  const groth16Verifier = await Groth16Verifier.deploy();
  await groth16Verifier.waitForDeployment();
  deployed.Groth16Verifier = await groth16Verifier.getAddress();
  console.log("    Groth16Verifier:", deployed.Groth16Verifier);

  // 3. Deploy FROSTVerifier (with placeholder registry - will be deployer for now)
  console.log("3/6 Deploying FROSTVerifier...");
  const mockGroupPubKey = ethers.keccak256(ethers.toUtf8Bytes("mock-group-public-key"));
  const FROSTVerifier = await ethers.getContractFactory("FROSTVerifier");
  const frostVerifier = await FROSTVerifier.deploy(mockGroupPubKey, deployer.address);
  await frostVerifier.waitForDeployment();
  deployed.FROSTVerifier = await frostVerifier.getAddress();
  console.log("    FROSTVerifier:", deployed.FROSTVerifier);

  // 4. Deploy ZKVoteVerifier
  console.log("4/6 Deploying ZKVoteVerifier...");
  const { pubKeys, addresses } = generateMockGuardians();
  const ZKVoteVerifier = await ethers.getContractFactory("ZKVoteVerifier");
  const zkVoteVerifier = await ZKVoteVerifier.deploy(
    deployed.Groth16Verifier,
    deployer.address, // placeholder registry
    pubKeys,
    addresses,
    THRESHOLD
  );
  await zkVoteVerifier.waitForDeployment();
  deployed.ZKVoteVerifier = await zkVoteVerifier.getAddress();
  console.log("    ZKVoteVerifier:", deployed.ZKVoteVerifier);

  // 5. Deploy GuardianRegistry
  console.log("5/6 Deploying GuardianRegistry...");
  const GuardianRegistry = await ethers.getContractFactory("GuardianRegistry");
  const guardianRegistry = await GuardianRegistry.deploy(
    deployed.ZKVoteVerifier,
    deployed.FROSTVerifier,
    THRESHOLD
  );
  await guardianRegistry.waitForDeployment();
  deployed.GuardianRegistry = await guardianRegistry.getAddress();
  console.log("    GuardianRegistry:", deployed.GuardianRegistry);

  // 6. Deploy SecurityMiddleware
  console.log("6/6 Deploying SecurityMiddleware...");
  const SecurityMiddleware = await ethers.getContractFactory("SecurityMiddleware");
  const securityMiddleware = await SecurityMiddleware.deploy(
    deployed.ZKVoteVerifier,
    deployed.VDFVerifier,
    deployed.FROSTVerifier
  );
  await securityMiddleware.waitForDeployment();
  deployed.SecurityMiddleware = await securityMiddleware.getAddress();
  console.log("    SecurityMiddleware:", deployed.SecurityMiddleware);

  // Write deployed addresses to file
  const outputPath = path.join(__dirname, "..", "deployed-addresses.json");
  const output = {
    network: "localhost",
    chainId: 31337,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: deployed,
  };
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log("\n✅ Deployment complete!");
  console.log("📄 Addresses saved to:", outputPath);

  // Summary
  console.log("\n─── Deployed Contracts ───");
  for (const [name, address] of Object.entries(deployed)) {
    console.log(`  ${name}: ${address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
