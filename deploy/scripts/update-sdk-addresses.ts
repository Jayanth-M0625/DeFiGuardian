/**
 * Update SDK constants with deployed contract addresses
 * 
 * Reads deployed-addresses.json and updates sdk/core/constants.ts
 * 
 * Usage:
 *   npx ts-node scripts/update-sdk-addresses.ts
 */

import * as fs from "fs";
import * as path from "path";

const DEPLOY_DIR = path.join(__dirname, "..");
const SDK_CONSTANTS = path.join(DEPLOY_DIR, "..", "sdk", "core", "constants.ts");
const DEPLOYED_FILE = path.join(DEPLOY_DIR, "deployed-addresses.json");

function main() {
  // Check if deployed addresses exist
  if (!fs.existsSync(DEPLOYED_FILE)) {
    console.error("❌ No deployed-addresses.json found. Run deploy-local.ts first.");
    process.exit(1);
  }

  // Read deployed addresses
  const deployed = JSON.parse(fs.readFileSync(DEPLOYED_FILE, "utf-8"));
  const chainId = deployed.chainId;
  const contracts = deployed.contracts;

  console.log(`📄 Updating SDK constants for chain ${chainId}...`);
  console.log("   SecurityMiddleware:", contracts.SecurityMiddleware);
  console.log("   GuardianRegistry:", contracts.GuardianRegistry);

  // Read current constants file
  let constantsContent = fs.readFileSync(SDK_CONSTANTS, "utf-8");

  // Find and update the PROTOCOL_ADDRESSES section for the chainId
  // Pattern: Find the chainId block and update middleware/registry
  const chainIdPattern = new RegExp(
    `(${chainId}:\\s*{[^}]*middleware:\\s*')[^']*(',[^}]*registry:\\s*')[^']*(')`
  );

  if (chainIdPattern.test(constantsContent)) {
    constantsContent = constantsContent.replace(
      chainIdPattern,
      `$1${contracts.SecurityMiddleware}$2${contracts.GuardianRegistry}$3`
    );
    console.log("✅ Updated PROTOCOL_ADDRESSES for chain", chainId);
  } else {
    console.warn("⚠️  Could not find PROTOCOL_ADDRESSES entry for chain", chainId);
    console.log("   Please manually update sdk/core/constants.ts");
  }

  // Write back
  fs.writeFileSync(SDK_CONSTANTS, constantsContent);
  console.log("✅ SDK constants updated!");
}

main();
