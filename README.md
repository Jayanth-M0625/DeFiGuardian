# Aegis

> **Cryptographic Airlock for DeFi** — A security middleware that separates Intent from Execution using VDF time-locks, FROST threshold signatures, ZK private voting, ML fraud detection, and ENS security profiles.

Deployed and tested on **Sepolia testnet**. All 5 demo scripts execute real on-chain transactions.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Deployed Contracts (Sepolia)](#deployed-contracts-sepolia)
- [Services & Ports](#services--ports)
- [SDK (`sdk/`)](#sdk)
  - [Quick Start](#sdk-quick-start)
  - [Core Modules](#sdk-core-modules)
  - [Types Reference](#sdk-types-reference)
  - [Exported API Surface](#sdk-exported-api-surface)
- [ML Agent (`agent/`)](#ml-agent)
  - [Endpoints](#agent-endpoints)
  - [SSE Real-Time Events](#sse-real-time-events)
  - [ML Model Details](#ml-model-details)
- [Guardian Mock (`guardian-mock/`)](#guardian-mock)
  - [Endpoints](#guardian-endpoints)
  - [Voting Logic](#voting-logic)
- [VDF Worker (`lib/vdf/server.ts`)](#vdf-worker)
  - [Endpoints](#vdf-endpoints)
  - [VDF Internals](#vdf-internals)
- [Cryptographic Libraries (`lib/`)](#cryptographic-libraries)
  - [FROST Threshold Signatures (`lib/frost/`)](#frost-threshold-signatures)
  - [VDF Prover (`lib/vdf/`)](#vdf-prover)
  - [ZK Circuits (`lib/zk/`)](#zk-circuits)
- [Smart Contracts (`contracts/`)](#smart-contracts)
  - [SecurityMiddleware](#securitymiddleware)
  - [GuardianRegistry](#guardianregistry)
  - [Verifiers](#verifiers)
  - [GuardianHook (Uniswap v4)](#guardianhook-uniswap-v4)
  - [ENSSecurityProfile](#enssecurityprofile)
  - [CrossChainMessenger](#crosschainmessenger)
  - [Contract ABIs (for Frontend)](#contract-abis-for-frontend)
- [Demo Scripts](#demo-scripts)
- [Transaction Flow (End-to-End)](#transaction-flow-end-to-end)
- [Frontend Integration Guide](#frontend-integration-guide)
  - [Landing Page Data Sources](#landing-page-data-sources)
  - [TX Logger Page](#tx-logger-page)
  - [Connecting to the SDK](#connecting-to-the-sdk)
  - [SSE Event Stream](#sse-event-stream)
  - [Reading On-Chain State](#reading-on-chain-state)
- [Running Locally](#running-locally)
- [Environment Variables](#environment-variables)

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                          USER / dApp                                 │
│                     (Frontend / Wallet)                               │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     SDK SecurityMiddleware                            │
│               sdk/core/middleware.ts                                  │
│                                                                      │
│  executeSecurely(intent, onProgress, sender)                         │
│    ├── 0. Pre-flight: isPaused? isBlacklisted?        [on-chain]     │
│    ├── 0.5 LI.FI cross-chain routing                  [LI.FI API]   │
│    ├── 0.55 ENS security profile lookup               [ENS]         │
│    ├── 0.6 ML Agent analysis (auto if sender given)   [HTTP :5000]  │
│    ├── 1. VDF computation (if ML flagged)      ──┐    [HTTP :3000]  │
│    └── 2. Guardian voting (parallel)            ──┤    [HTTP :3001]  │
│         └── FROST threshold signature            │                   │
│    ├── 3. On-chain execution                  ◄──┘    [Sepolia TX]  │
│    └── 4. Cross-chain confirmation (if bridge)        [LI.FI]       │
└──────────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
   ┌────────────┐    ┌──────────────┐    ┌─────────────────┐
   │  ML Agent  │    │  Guardian    │    │  VDF Worker     │
   │  :5000     │    │  Network     │    │  :3000          │
   │            │    │  :3001       │    │                 │
   │ XGBoost    │    │ 10 guardians │    │ Wesolowski VDF  │
   │ 47 features│    │ FROST signing│    │ RSA-2048        │
   │ Etherscan  │    │ ZK voting    │    │ 50k iter (demo) │
   └────────────┘    └──────────────┘    └─────────────────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │              Sepolia Smart Contracts                         │
   │                                                              │
   │  SecurityMiddleware ──► GuardianRegistry                     │
   │       │                      │                               │
   │       ├── VDFVerifier        ├── ZKVoteVerifier              │
   │       ├── FROSTVerifier      └── CrossChainMessenger         │
   │       └── Groth16Verifier                                    │
   └──────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
Aegis/
├── sdk/                          # TypeScript SDK — main integration point
│   ├── index.ts                  # Public API exports
│   ├── core/
│   │   ├── middleware.ts         # SecurityMiddleware orchestrator (the "Airlock")
│   │   ├── contract.ts          # On-chain contract interactions
│   │   ├── VDF.ts               # VDF client (HTTP requests to worker)
│   │   ├── ZK.ts                # ZK vote client (polls Guardian API)
│   │   ├── lifi.ts              # LI.FI cross-chain integration
│   │   ├── ens.ts               # ENS security profiles
│   │   ├── crosschain.ts        # Cross-chain security sync (LayerZero)
│   │   ├── constants.ts         # Protocol constants & deployed addresses
│   │   ├── types.ts             # Shared types (votes, proofs, proposals)
│   │   └── adapters.ts          # Buffer↔string type converters
│   └── mockExamples/            # 5 demo scripts + shared utilities
│       ├── smallTx.ts           # Use case 1: Small TX fast pass
│       ├── bigTxPass.ts         # Use case 2: Big TX + VDF + guardian approve
│       ├── bigTxFail.ts         # Use case 3: Big TX + VDF + guardian REJECT
│       ├── BigTxCrossPass.ts    # Use case 4: Cross-chain big TX pass
│       ├── SmallTxCross.ts      # Use case 5: Cross-chain small TX
│       └── shared/
│           ├── sdkMode.ts       # Sepolia SDK bridge (--sepolia flag)
│           ├── liveMode.ts      # Live mode bridge (--live flag)
│           ├── liveClients.ts   # HTTP clients for live services
│           └── utils.ts         # Terminal formatting helpers
│
├── agent/                        # Python ML Agent (Flask API)
│   ├── main.py                  # Flask server — /analyze, /review, /events
│   ├── src/
│   │   ├── model.py             # XGBoost fraud detector + SHAP explanations
│   │   ├── features.py          # 47-feature computation from Etherscan data
│   │   └── etherscan.py         # Etherscan V2 API client
│   └── models/
│       ├── eth_fraud_xgb.json   # Trained XGBoost model weights
│       └── preprocessors.pkl    # Feature scalers (StandardScaler)
│
├── guardian-mock/                # Mock Guardian Network (Express server)
│   └── src/
│       ├── server.ts            # Express API — /proposals/submit, status
│       └── mockFrost.ts         # Simplified FROST signing simulation
│
├── lib/                          # Cryptographic libraries
│   ├── frost/                   # FROST threshold signatures (Ed25519)
│   │   └── src/
│   │       ├── dkg.ts           # Distributed Key Generation
│   │       ├── coordinator.ts   # Signing coordination
│   │       ├── participant.ts   # Individual signer
│   │       └── aggregator.ts    # Signature aggregation
│   ├── vdf/                     # VDF (Verifiable Delay Function)
│   │   ├── server.ts            # HTTP worker server (port 3000)
│   │   └── src/
│   │       ├── prover.ts        # Wesolowski VDF: y = x^(2^T) mod N
│   │       ├── verifier.ts      # Proof verification
│   │       ├── params.ts        # RSA-2048 modulus, iteration config
│   │       └── client.ts        # VDF client (local or HTTP)
│   └── zk/                      # Zero-Knowledge voting circuits
│       ├── circuits/
│       │   └── GuardianVote.circom  # Circom ZK circuit
│       ├── artifacts/           # Compiled circuit + proving key
│       └── contracts/
│           └── GuardianVoteVerifier.sol  # Auto-generated Groth16 verifier
│
├── contracts/                    # Solidity smart contracts
│   ├── SecurityMiddleware.sol   # Main airlock (queue + execute)
│   ├── GuardianRegistry.sol     # Security state manager
│   ├── ENSSecurityProfile.sol   # ENS text record reader
│   ├── CrossChainMessenger.sol  # LayerZero cross-chain messaging
│   ├── hooks/
│   │   └── GuardianHook.sol     # Uniswap v4 Hook integration
│   ├── verifiers/
│   │   ├── VDFVerifier.sol      # On-chain VDF verification
│   │   ├── FROSTVerifier.sol    # Ed25519 Schnorr signature verification
│   │   └── ZKVoteVerifier.sol   # Groth16 ZK proof verification
│   └── interfaces/
│       └── ILayerZeroEndpoint.sol
│
├── deploy/                       # Hardhat deployment
│   ├── scripts/
│   │   ├── deploy-local.ts      # Local Hardhat deployment
│   │   ├── test-sepolia.ts      # Sepolia deployment script
│   │   └── test-integration.ts  # Integration tests
│   ├── deployed-addresses.json  # Current Sepolia addresses
│   └── hardhat.config.ts
│
├── ML_bot/
│   └── DefGuard_MLbot.ipynb     # Jupyter notebook for model training
│
└── docs/
    └── ENS_SECURITY_PROFILES.md # ENS integration documentation
```

---

## Deployed Contracts (Sepolia)

| Contract | Address | Role |
|----------|---------|------|
| **SecurityMiddleware** | `0x8A4364c08147b1Ec0025e7B1e848BF675f9Dc7b9` | Main airlock — queue + execute transactions |
| **GuardianRegistry** | `0x702e8307Bc9c8EC7489C6f9e5562EdA44bB9fB7d` | Security state, proposals, guardian management |
| **VDFVerifier** | `0xFAf997119B0FFDF62E149Cbfc3713267a7C8DaEA` | On-chain VDF proof verification |
| **Groth16Verifier** | `0x42D098fE28Ae3923Ac972EB1b803f3e295EFEE7D` | ZK proof verification (snarkjs-generated) |
| **FROSTVerifier** | `0x02a59687A130D198a23F790866500489F6f88C12` | FROST threshold signature verification |
| **ZKVoteVerifier** | `0xb638C0997778F172ba4609B8E20252483cD87eEE` | Guardian voting with ZK privacy |
| **GuardianHook** | `0xFce40025E4a77D5395188d82657A728521D839ec` | Uniswap v4 Hook — enforces security on swaps |

**Deployer**: `0x69E135540F4F5B69592365DFE7730c08ACe96CCb`  
**Network**: Sepolia (Chain ID: `11155111`)  
**Uniswap v4 PoolManager**: `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543`  
**Block Explorer**: `https://sepolia.etherscan.io/address/<ADDRESS>`

---

## Services & Ports

| Service | Port | Tech | Purpose |
|---------|------|------|---------|
| **ML Agent** | `5000` | Python/Flask | Fraud detection, Etherscan analysis, SSE events |
| **VDF Worker** | `3000` | Node.js/HTTP | Wesolowski VDF time-lock computation |
| **Guardian Mock** | `3001` | Node.js/Express | Guardian network, FROST signing, voting |

---

## SDK

### SDK Quick Start

```typescript
import { createSecurityMiddleware, createTestnetMiddleware } from '@sackmoney/sdk';
import { ethers } from 'ethers';

// Option A: Quick setup for Sepolia
const middleware = createTestnetMiddleware(provider, signer, {
  vdfWorkerUrl: 'http://localhost:3000',
  guardianApiUrl: 'http://localhost:3001',
  agentApiUrl: 'http://localhost:5000',
});

// Option B: Manual setup
const middleware = createSecurityMiddleware({
  security: {
    middlewareAddress: '0x8A4364c08147b1Ec0025e7B1e848BF675f9Dc7b9',
    registryAddress: '0x702e8307Bc9c8EC7489C6f9e5562EdA44bB9fB7d',
    chainId: 11155111,
  },
  vdfWorkerUrl: 'http://localhost:3000',
  guardianApiUrl: 'http://localhost:3001',
  agentApiUrl: 'http://localhost:5000',
  provider,
  signer,
});

// Execute a transaction through the security airlock
const result = await middleware.executeSecurely(
  {
    type: 'swap',
    target: '0xUniswapRouter...',
    data: '0xSwapCalldata...',
    value: 0n,
    amount: ethers.parseEther('100'),
    sourceChain: 11155111,
  },
  (progress) => {
    // Real-time progress updates
    console.log(`[${progress.stage}] ${progress.message}`);
    // progress.stage: 'submitted' | 'vdf-pending' | 'voting-pending' | 'ready' | 'executing' | 'complete' | 'failed'
    // progress.vdfStatus: { progress: 0-100, estimatedTimeLeft: seconds }
    // progress.voteStatus: { votes: { approve, reject, abstain }, threshold: 7 }
  },
  senderAddress, // enables auto ML analysis
);

console.log(result.txHash);           // On-chain TX hash
console.log(result.executionTime);    // Total ms
console.log(result.vdfProof);         // { output, proof, iterations }
console.log(result.frostSignature);   // { signature, message, publicKey }
```

### SDK Core Modules

| Module | File | Responsibility |
|--------|------|----------------|
| **SecurityMiddleware** | `sdk/core/middleware.ts` | Main orchestrator — the "Cryptographic Airlock" |
| **SecurityContract** | `sdk/core/contract.ts` | On-chain reads/writes (queue, execute, isPaused, isBlacklisted) |
| **VDFClient** | `sdk/core/VDF.ts` | HTTP client for VDF worker (request proof, poll status) |
| **ZKVoteClient** | `sdk/core/ZK.ts` | Polls Guardian API for voting status, waits for result |
| **LiFiClient** | `sdk/core/lifi.ts` | LI.FI cross-chain quote/route/execute |
| **ENSSecurityClient** | `sdk/core/ens.ts` | Reads ENS text records for user security preferences |
| **CrossChainSync** | `sdk/core/crosschain.ts` | LayerZero security event propagation |
| **Constants** | `sdk/core/constants.ts` | Deployed addresses, thresholds, iteration counts |
| **Types** | `sdk/core/types.ts` | Shared types (votes, proofs, proposals) |
| **Adapters** | `sdk/core/adapters.ts` | Buffer↔string converters for lib/ interop |

### SDK Types Reference

#### `TransactionIntent`

```typescript
interface TransactionIntent {
  type: 'swap' | 'bridge' | 'generic';
  target: string;          // Target contract address
  data: string;            // Encoded calldata (0x...)
  value: bigint;           // ETH value in wei
  amount: bigint;          // Display amount in wei
  sourceChain: number;     // Chain ID (11155111 for Sepolia)
  destChain?: number;      // Destination chain (for bridges)
  mlBotFlagged?: boolean;  // Force ML flag (auto-detected if omitted)
  forceGuardianOutcome?: 'approve' | 'reject';  // Testing only
  metadata?: {
    protocol: 'uniswap' | 'lifi' | 'custom';
    tokenIn?: string;
    tokenOut?: string;
    slippage?: number;
  };
}
```

#### `ExecutionResult`

```typescript
interface ExecutionResult {
  success: boolean;
  txHash: string;                          // On-chain TX hash
  receipt: ethers.TransactionReceipt;
  vdfProof: VDFProof;                      // { output, proof, iterations }
  frostSignature: FrostSignature;          // { signature, message, publicKey }
  executionTime: number;                   // Total ms
  ensName?: string;                        // Resolved ENS name
  ensSecurityProfile?: SecurityProfile;    // User's ENS preferences
}
```

#### `ExecutionProgress`

```typescript
interface ExecutionProgress {
  stage: 'submitted' | 'vdf-pending' | 'voting-pending' | 'ready' | 'executing' | 'complete' | 'failed';
  vdfStatus?: VDFStatus;
  voteStatus?: VoteStatus;
  message: string;          // Human-readable progress message
}
```

#### `VDFProof`

```typescript
interface VDFProof {
  output: string;      // VDF output hash (0x...)
  proof: string;       // VDF proof bytes (0x...)
  iterations: number;  // Sequential iterations (50000 demo / 300000000 prod)
}
```

#### `FrostSignature`

```typescript
interface FrostSignature {
  signature: string;   // Aggregated FROST signature
  message: string;     // Signed message hash
  publicKey: string;   // Group public key
}
```

#### `VoteStatus`

```typescript
interface VoteStatus {
  proposalId: string;
  phase: 'commit' | 'reveal' | 'complete' | 'expired';
  votes: {
    approve: number;   // 0-10
    reject: number;    // 0-10
    abstain: number;   // 0-10
    pending: number;   // 0-10
  };
  threshold: number;           // Required approvals (7)
  isApproved: boolean;         // approve >= 7
  isRejected: boolean;         // reject > 3
  frostSignature?: {           // Available when approved
    R: string;                 // Commitment point
    z: string;                 // Scalar
  };
  expiresAt: number;           // Unix timestamp
}
```

#### `SecurityProfile` (ENS)

```typescript
interface SecurityProfile {
  threshold: bigint;       // Flag TXs above this amount (wei). 0 = disabled
  delay: number;           // Extra delay seconds for flagged TXs
  whitelist: string[];     // Allowed protocols (ENS names or addresses)
  mode: SecurityMode;      // 'strict' | 'normal' | 'paranoid'
  notifyUrl?: string;      // Webhook URL for alerts
  hasProfile: boolean;     // Whether user has set any ENS profile
}
```

#### `SecurityState` (on-chain)

```typescript
interface SecurityState {
  isPaused: boolean;
  lastUpdateBlock: number;
  requiredDelay: number;   // VDF iterations based on amount
  threshold: number;       // Guardian threshold (7)
}
```

### SDK Exported API Surface

```typescript
// ─── Core ───
export { SecurityMiddleware, createSecurityMiddleware }
export { SecurityContract }
export { VDFClient, getVDFClient }
export { ZKVoteClient, getZKVoteClient }
export { LiFiClient, getLiFiClient, getQuickQuote, LiFiError }
export { ENSSecurityClient, createENSSecurityClient, getENSSecurityClient }
export { CrossChainSync, CrossChainBroadcaster, SecurityEventEncoder }

// ─── Quick Setup ───
export { createMainnetMiddleware }   // Quick mainnet setup
export { createTestnetMiddleware }   // Quick Sepolia setup
export { createLocalMiddleware }     // Quick local Hardhat setup

// ─── Constants ───
export { PROTOCOL_ADDRESSES }        // { [chainId]: { middleware, registry } }
export { GUARDIAN_COUNT }            // 10
export { GUARDIAN_THRESHOLD }        // 7
export { VDF_ITERATIONS }           // 300_000_000
export { VDF_DELAY_SECONDS }        // 1800 (30 min)
export { ML_BOT_THRESHOLD }         // 50
export { VOTE_VALUES }              // { REJECT: 0, APPROVE: 1, ABSTAIN: 2 }
export { LIFI_API_URL, LIFI_INTEGRATOR_ID, NATIVE_TOKEN, LIFI_DIAMOND }

// ─── ENS ───
export { ENS_KEY_PREFIX }  // 'defi.guardian'
export { ENS_KEYS }        // { THRESHOLD, DELAY, WHITELIST, MODE, NOTIFY }
export { DEFAULT_PROFILE }

export const VERSION = '1.0.0';
```

---

## ML Agent

**Stack**: Python 3.11+, Flask, XGBoost, SHAP, Etherscan V2 API  
**Location**: `agent/`  
**Port**: `5000`

### Agent Endpoints

#### `GET /health`

```json
{ "status": "ok", "model_loaded": true }
```

#### `POST /analyze` — Quick Fraud Score

Analyzes a wallet address using on-chain transaction history.

**Request:**
```json
{
  "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"
}
```

**Response:**
```json
{
  "address": "0x742d...",
  "is_fraud": false,
  "score": 47.3,
  "verdict": "suspicious",
  "recommendation": "review"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `score` | `number` | `0`–`100`. Higher = more likely fraud |
| `verdict` | `string` | `safe` (<25), `suspicious` (25–60), `dangerous` (>60) |
| `recommendation` | `string` | `approve`, `review`, or `reject` |

#### `POST /analyze/detailed` — Full Analysis + SHAP Explanations

**Request:**
```json
{
  "address": "0x742d...",
  "top_features": 5
}
```

**Response:**
```json
{
  "address": "0x742d...",
  "is_fraud": false,
  "score": 47.3,
  "confidence": "medium",
  "verdict": "suspicious",
  "recommendation": "review",
  "explanation": {
    "summary": "No fraud indicators detected. Wallet behavior appears normal.",
    "top_factors": [
      {
        "feature": "avg val sent",
        "impact": "increases",
        "importance": 0.82,
        "value": 1.5,
        "reason": "Unusually high average sent value"
      }
    ]
  },
  "stats": {
    "eth_transactions": 142,
    "token_transactions": 38,
    "balance_eth": 2.5,
    "account_age_days": 365,
    "unique_counterparties": 87
  }
}
```

#### `POST /review` — Full Flow (SDK Integration Point)

**This is the main endpoint the SDK calls.** It runs ML analysis, then forwards the proposal to the Guardian Network.

**Request:**
```json
{
  "guardianApiUrl": "http://localhost:3001",
  "proposal": {
    "txHash": "0xabc123...",
    "sender": "0x69E135...",
    "senderENS": "alice.eth",
    "target": "0xUniswap...",
    "value": "1000000000000000000",
    "data": "0x...",
    "chainId": 11155111,
    "amount": "1000000000000000000",
    "forceOutcome": "reject"
  }
}
```

**Response:**
```json
{
  "proposalId": "0xabc12345...",
  "mlAnalysis": {
    "score": 47.3,
    "verdict": "suspicious",
    "flagged": false
  },
  "guardianStatus": {
    "submitted": true,
    "proposalId": "0xabc12345...",
    "message": "Proposal submitted to Guardian Network"
  },
  "senderENS": "alice.eth"
}
```

### SSE Real-Time Events

#### `GET /events` — Server-Sent Events Stream

Connect to receive real-time transaction events as they happen.

```javascript
const evtSource = new EventSource('http://localhost:5000/events');

evtSource.addEventListener('review', (event) => {
  const data = JSON.parse(event.data);
  // data.proposalId, data.mlAnalysis, data.guardianStatus
  console.log('New review:', data);
});

evtSource.addEventListener('analyze', (event) => {
  const data = JSON.parse(event.data);
  // data.address, data.score, data.verdict
  console.log('New analysis:', data);
});
```

**Event Types:**
| Event | Triggered By | Payload |
|-------|-------------|---------|
| `review` | `POST /review` | `{ proposalId, mlAnalysis, guardianStatus, senderENS }` |
| `analyze` | `POST /analyze` | `{ address, is_fraud, score, verdict, recommendation }` |

Sends keepalive comments (`: keepalive\n\n`) every 30 seconds.

### ML Model Details

- **Algorithm**: XGBoost (gradient-boosted trees)
- **Features**: 47 features computed from Etherscan transaction history
- **Training data**: Ethereum mainnet fraud/non-fraud labeled addresses
- **Key features**: Transaction frequency, value distribution, contract interactions, timing patterns, unique counterparties
- **Model file**: `agent/models/eth_fraud_xgb.json`
- **Preprocessor**: `agent/models/preprocessors.pkl` (StandardScaler)
- **Training notebook**: `ML_bot/DefGuard_MLbot.ipynb`
- **Flag threshold**: Score >= `50` → flagged for VDF delay

---

## Guardian Mock

**Stack**: Node.js, Express, TypeScript  
**Location**: `guardian-mock/`  
**Port**: `3001`

### Guardian Endpoints

#### `GET /health`

```json
{
  "status": "ok",
  "guardianCount": 10,
  "threshold": 7,
  "networkInitialized": true,
  "activeProposals": 5
}
```

#### `POST /proposals/submit` — Submit Proposal for Voting

**Request:**
```json
{
  "txHash": "0xabc123...",
  "sender": "0x69E135...",
  "senderENS": "alice.eth",
  "target": "0xUniswap...",
  "value": "1000000000000000000",
  "data": "0x...",
  "chainId": 11155111,
  "amount": "1000000000000000000",
  "mlScore": 47.3,
  "mlFlagged": false,
  "forceOutcome": "auto"
}
```

**Response:**
```json
{
  "proposalId": "0xabc12345000000...",
  "status": "pending",
  "message": "Proposal submitted, voting in progress"
}
```

| `forceOutcome` | Description |
|----------------|-------------|
| `"auto"` (default) | Vote based on `mlScore` thresholds |
| `"approve"` | Force 8-1 approval |
| `"reject"` | Force 8-1 rejection |

#### `GET /proposals/:id` — Quick Status

```json
{
  "proposalId": "0xabc12345...",
  "status": "approved",
  "votes": { "approve": 8, "reject": 1, "abstain": 1 },
  "threshold": 7,
  "frostSignature": { "R": "0x...", "z": "0x..." },
  "mlScore": 47.3,
  "mlFlagged": false,
  "senderENS": "alice.eth"
}
```

#### `GET /proposals/:id/status` — Full Status (SDK Polling)

```json
{
  "proposalId": "0xabc12345...",
  "phase": "complete",
  "votes": { "approve": 8, "reject": 1, "abstain": 1, "pending": 0 },
  "threshold": 7,
  "isApproved": true,
  "isRejected": false,
  "frostSignature": { "R": "0x...", "z": "0x..." },
  "senderENS": "alice.eth",
  "expiresAt": 1707400000000
}
```

### Voting Logic

| ML Score | `forceOutcome` | Result |
|----------|---------------|--------|
| Any | `"approve"` | 8 approve, 1 reject |
| Any | `"reject"` | 1 approve, 8 reject |
| >= 70 | `"auto"` | 1 approve, 8 reject (HIGH RISK) |
| 50–69 | `"auto"` | 3 approve, 6 reject (MEDIUM RISK) |
| < 50 | `"auto"` | 8 approve, 1 reject (LOW RISK) |

Guardian names: `alice.eth`, `bob.eth`, `charlie.eth`, `diana.eth`, `eve.eth`, `frank.eth`, `grace.eth`, `henry.eth`, `iris.eth`, `jack.eth`

---

## VDF Worker

**Stack**: Node.js, HTTP server (zero dependencies)  
**Location**: `lib/vdf/server.ts`  
**Port**: `3000`

### VDF Endpoints

#### `GET /health`

```json
{
  "status": "ok",
  "service": "vdf-worker",
  "localCompute": true,
  "activeJobs": 0,
  "demoIterations": 50000
}
```

#### `POST /vdf/request` — Start VDF Computation

**Request:**
```json
{
  "txHash": "0xabc123...",
  "chainId": 11155111,
  "sender": "0x69E135...",
  "mlBotFlagged": true,
  "iterations": 300000000
}
```

**Response:**
```json
{ "jobId": "vdf_1_1707400000000" }
```

#### `GET /vdf/status/:jobId` — Poll Progress

**Computing:**
```json
{
  "status": "computing",
  "progress": 45,
  "estimatedTimeLeft": 2
}
```

**Ready:**
```json
{
  "status": "ready",
  "progress": 100,
  "estimatedTimeLeft": 0,
  "proof": {
    "output": "0xabcdef...",
    "proof": "0x123456...",
    "iterations": 50000
  }
}
```

| Status | Description |
|--------|-------------|
| `pending` | Job created, not started |
| `computing` | VDF in progress, check `progress` (0–100) |
| `ready` | Proof available in `proof` field |
| `failed` | Error occurred, check `error` field |
| `bypassed` | Guardians approved, VDF cancelled |

#### `POST /vdf/mock` — Instant Mock Proof (Dev)

```json
{ "output": "0x000...000", "proof": "0x", "iterations": 0 }
```

### VDF Internals

- **Algorithm**: Wesolowski VDF — `y = x^(2^T) mod N`, proof `π = x^⌊(2^T)/l⌋ mod N`
- **Modulus**: RSA-2048 (pre-generated `GUARDIAN_VDF_MODULUS`)
- **Demo iterations**: `50,000` (~1 second)
- **Production iterations**: `300,000,000` (~30 minutes)
- **Sequential**: Cannot be parallelized — this is the security guarantee
- **Configured via env**: `VDF_ITERATIONS=50000 VDF_PORT=3000`

---

## Cryptographic Libraries

### FROST Threshold Signatures (`lib/frost/`)

7-of-10 Schnorr threshold signatures on Ed25519.

```typescript
import { performDKG, FROSTCoordinator, FROSTParticipant, aggregateSignatureShares } from 'lib/frost';

// 1. DKG — each participant generates a key share
const dkgOutput = performDKG({ threshold: 7, totalParticipants: 10 });

// 2. Signing — coordinator runs 2-round protocol
const coordinator = new FROSTCoordinator(dkgOutput);
const commitments = participants.map(p => p.generateCommitment());
const shares = participants.map(p => p.sign(message, commitments));
const signature = aggregateSignatureShares(shares, commitments, message, groupPublicKey);

// Signature: { R: bytes32, z: bytes32 }
// On-chain verification: z*G == R + c*Y  (Ed25519 Schnorr)
```

**Exports**: `performDKG`, `FROSTCoordinator`, `FROSTParticipant`, `aggregateSignatureShares`, `verifyFROSTSignature`, `formatSignatureForSolidity`

### VDF Prover (`lib/vdf/`)

Wesolowski VDF with RSA-2048 modulus.

```typescript
import { VDFProver, getVDFParams, VDFVerifier } from 'lib/vdf';

const params = getVDFParams(50000); // iterations
const prover = new VDFProver(params);
const proof = await prover.compute(challenge, (progress, iteration) => {
  console.log(`${progress}% complete`);
});

const verifier = new VDFVerifier(params);
const isValid = await verifier.verify(challenge, proof);
```

**Exports**: `VDFProver`, `computeVDF`, `VDFVerifier`, `verifyVDF`, `isValidVDF`, `VDFClient`, `getVDFParams`, `GUARDIAN_VDF_MODULUS`, `isVDFRequired`, `getRequiredDelay`, `getRequiredIterations`

### ZK Circuits (`lib/zk/`)

Circom + snarkjs Groth16 for private guardian voting.

**Circuit**: `GuardianVote.circom`  
Proves:
1. Voter is one of 10 valid guardians
2. Voter owns the private key for their guardian slot
3. Revealed vote matches earlier commitment
4. Vote value is valid (0=reject, 1=approve, 2=abstain)

**Without revealing**: Which guardian voted (until reveal).

**Artifacts**: `GuardianVote_final.zkey`, `GuardianVote_verification_key.json`, `generate_witness.js`

---

## Smart Contracts

### SecurityMiddleware

**Address**: `0x8A4364c08147b1Ec0025e7B1e848BF675f9Dc7b9`

The main "Cryptographic Airlock". Two-step execution:

1. `queueTransaction(txHash, sender, destination, value, mlBotFlagged, txData)` → creates a pending TX, starts VDF timer if flagged
2. `executeTransaction(txHash, vdfProof, frostR, frostZ)` → verifies proofs and executes

**Key Functions:**
```solidity
function queueTransaction(bytes32 txHash, address sender, address destination, uint256 value, bool mlBotFlagged, bytes calldata txData) external returns (bytes32 proposalId)
function executeTransaction(bytes32 txHash, bytes calldata vdfProof, bytes32 frostR, bytes32 frostZ) external
function isPaused() external view returns (bool)
function blacklistedAddresses(address) external view returns (bool)
function getTransactionStatus(bytes32 txHash) external view returns (bool exists, bool mlBotFlagged, bool executed, bool guardianApproved, bool guardianRejected, uint256 vdfDeadline, bool vdfComplete)
function GUARDIAN_THRESHOLD() external pure returns (uint8)  // returns 7
function getVDFDelay() external pure returns (uint256)       // returns 1800
```

**Events:**
```solidity
event TransactionQueued(bytes32 indexed txHash, bytes32 indexed proposalId, bool mlBotFlagged, uint256 vdfDeadline, string reason)
event TransactionExecuted(bytes32 indexed txHash, string executionPath)
event TransactionBlocked(bytes32 indexed txHash, string reason)
event GuardianBypass(bytes32 indexed txHash, bytes32 indexed proposalId, uint8 approvals)
```

### GuardianRegistry

**Address**: `0x702e8307Bc9c8EC7489C6f9e5562EdA44bB9fB7d`

Security state manager. Creates proposals, listens for ZK vote results, executes security actions.

**Security Actions** (enum):
- `0` = `EMERGENCY_PAUSE` — pause protocol on all chains
- `1` = `BLACKLIST_ADDRESS` — block a specific address
- `2` = `THRESHOLD_INCREASE` — raise guardian threshold
- `3` = `MONITOR_ONLY` — alert without action

**Key Functions:**
```solidity
function initiateVote(bytes32 proposalId, SecurityAction action, address targetAddress, string description) external
function executeProposal(bytes32 proposalId, bytes32 frostR, bytes32 frostZ) external
function isPaused() external view returns (bool)
function pauseReason() external view returns (string)
function isGuardian(address) external view returns (bool)
function getGuardianENS(address) external view returns (string)
function getAggregatedPublicKey() external view returns (bytes)
function getGuardianCount() external view returns (uint8)
```

**Events:**
```solidity
event Paused(bytes32 indexed eventId, string reason)
event Unpaused(bytes32 indexed eventId)
event AddressBlacklisted(address indexed target, bytes32 indexed eventId)
event SecurityActionExecuted(bytes32 indexed proposalId, SecurityAction action, bool success)
event CrossChainEventReceived(bytes32 indexed eventId, uint16 sourceChain, SecurityAction action)
```

### Verifiers

#### VDFVerifier (`0xFAf997119B0FFDF62E149Cbfc3713267a7C8DaEA`)

```solidity
function verify(bytes32 txHash, uint256 startTime, bytes calldata proof) external view returns (bool)
// Constants:
uint256 public constant MAX_ITERATIONS = 500_000_000;
uint256 public constant DEFAULT_ITERATIONS = 300_000_000;
uint256 public constant SQUARINGS_PER_SECOND = 166_000;
```

#### FROSTVerifier (`0x02a59687A130D198a23F790866500489F6f88C12`)

```solidity
function verify(bytes32 message, bytes32 R, bytes32 z) external returns (bool)
// Verification: z*G == R + c*Y  (Ed25519 Schnorr)
bytes32 public groupPublicKey;     // Set by GuardianRegistry
address public guardianRegistry;
```

#### ZKVoteVerifier (`0xb638C0997778F172ba4609B8E20252483cD87eEE`)

```solidity
function createProposal(bytes32 proposalId, string description) external
function submitCommitment(bytes32 proposalId, bytes32 commitment, uint8 guardianSlot) external
function revealVote(bytes32 proposalId, uint8 guardianSlot, uint8 vote, uint[2] pA, uint[2][2] pB, uint[2] pC) external
function getProposalState(bytes32 proposalId) external view returns (uint8 commitCount, uint8 revealCount, uint8 approveCount, uint8 rejectCount, uint8 abstainCount, bool isFinalized)
function proposalExists(bytes32 proposalId) external view returns (bool)
```

**Events:**
```solidity
event ProposalCreated(bytes32 indexed proposalId, uint256 commitDeadline)
event CommitmentSubmitted(bytes32 indexed proposalId, uint8 slot)
event VoteRevealed(bytes32 indexed proposalId, uint8 slot, uint8 vote)
event ProposalFinalized(bytes32 indexed proposalId, uint8 approvals, uint8 rejections, uint8 abstentions, bool passed)
```

### GuardianHook (Uniswap v4)

**Location**: `contracts/hooks/GuardianHook.sol`

Uniswap v4 Hook that enforces Guardian Protocol security on every swap:
- `beforeSwap`: Checks blacklist, pause state, ENS security profile
- `afterSwap`: Logs large swaps for monitoring
- `beforeAddLiquidity`: Verifies LP addresses

ENS integration: reads user's `defi.guardian.*` text records to apply personalized rules (threshold, whitelist, paranoid mode).

### ENSSecurityProfile

**Location**: `contracts/ENSSecurityProfile.sol`

On-chain reader for ENS-based security preferences.

**ENS Text Record Keys:**
| Key | Type | Example |
|-----|------|---------|
| `defi.guardian.threshold` | Wei string | `"10000000000000000000"` (10 ETH) |
| `defi.guardian.delay` | Seconds | `"300"` (5 min extra delay) |
| `defi.guardian.whitelist` | CSV | `"uniswap.eth,aave.eth,0x1234..."` |
| `defi.guardian.mode` | String | `"strict"` / `"normal"` / `"paranoid"` |
| `defi.guardian.notify` | URL | `"https://hooks.slack.com/..."` |

### CrossChainMessenger

**Location**: `contracts/CrossChainMessenger.sol`

LayerZero-based cross-chain security event propagation. When an attack is detected on one chain, the FROST-signed security event is broadcast to all other chains.

```solidity
function broadcast(bytes32 eventId, uint8 eventType, uint8 severity, uint16[] targetChains, bytes data, bytes32 frostR, bytes32 frostZ) external
function lzReceive(uint16 srcChainId, bytes srcAddress, uint64 nonce, bytes payload) external  // LayerZero callback
```

### Contract ABIs (for Frontend)

The ABIs needed for frontend integration are in the SDK's `contract.ts`:

```typescript
// SecurityMiddleware ABI
const SECURITY_MIDDLEWARE_ABI = [
  "function queueTransaction(bytes32 txHash, address sender, address destination, uint256 value, bool mlBotFlagged, bytes calldata txData) external returns (bytes32 proposalId)",
  "function executeTransaction(bytes32 txHash, bytes calldata vdfProof, bytes32 frostR, bytes32 frostZ) external",
  "function isPaused() external view returns (bool)",
  "function blacklistedAddresses(address account) external view returns (bool)",
  "function getTransactionStatus(bytes32 txHash) external view returns (bool exists, bool mlBotFlagged, bool executed, bool guardianApproved, bool guardianRejected, uint256 vdfDeadline, bool vdfComplete)",
  "function getVDFDelay() external pure returns (uint256)",
  "function GUARDIAN_THRESHOLD() external pure returns (uint8)",
  "event TransactionQueued(bytes32 indexed txHash, bytes32 indexed proposalId, bool mlBotFlagged, uint256 vdfDeadline, string reason)",
  "event TransactionExecuted(bytes32 indexed txHash, string executionPath)",
  "event TransactionBlocked(bytes32 indexed txHash, string reason)",
  "event GuardianBypass(bytes32 indexed txHash, bytes32 indexed proposalId, uint8 approvals)",
];

// GuardianRegistry ABI
const GUARDIAN_REGISTRY_ABI = [
  "function getAggregatedPublicKey() external view returns (bytes)",
  "function getGuardianCount() external view returns (uint8)",
  "function isPaused() external view returns (bool)",
  "function pauseReason() external view returns (string)",
  "function isGuardian(address account) external view returns (bool)",
  "function getGuardianENS(address guardian) external view returns (string)",
];
```

Full compiled ABIs are in `deploy/artifacts/` after running `npx hardhat compile`.

---

## Demo Scripts

Run with `--sepolia` for real on-chain execution:

```bash
cd sdk

# Individual scripts
npx ts-node mockExamples/smallTx.ts --sepolia
npx ts-node mockExamples/bigTxPass.ts --sepolia
npx ts-node mockExamples/bigTxFail.ts --sepolia
npx ts-node mockExamples/BigTxCrossPass.ts --sepolia
npx ts-node mockExamples/SmallTxCross.ts --sepolia

# Or via npm
npm run demo:sepolia:1   # smallTx
npm run demo:sepolia:2   # bigTxPass
npm run demo:sepolia:3   # bigTxFail
npm run demo:sepolia:4   # BigTxCrossPass
npm run demo:sepolia:5   # SmallTxCross
```

| # | Script | Scenario | ML Flag | VDF | Guardian | Result |
|---|--------|----------|---------|-----|----------|--------|
| 1 | `smallTx` | 0.1 ETH same-chain | Auto (47.3 score) | No | 8-1 approve | **PASS** — on-chain TX |
| 2 | `bigTxPass` | 500 ETH same-chain | `true` | Real 50k iterations | 8-1 approve | **PASS** — on-chain TX |
| 3 | `bigTxFail` | 1000 ETH attack | `true` + `forceOutcome=reject` | Real 50k iterations | 8-1 reject | **BLOCKED** — no TX |
| 4 | `BigTxCrossPass` | 500 ETH cross-chain (Sepolia→Polygon) | Auto (47.3 score) | No | 8-1 approve | **PASS** — on-chain TX |
| 5 | `SmallTxCross` | 0.5 ETH cross-chain | Auto (47.3 score) | No | 8-1 approve | **PASS** — on-chain TX |

**Modes**: `--sepolia` (real on-chain), `--live` (local Hardhat), default (pure mock simulation)

---

## Transaction Flow (End-to-End)

```
User submits TransactionIntent
        │
        ▼
[0] PRE-FLIGHT
    ├── isPaused() → revert if true
    └── isBlacklisted(sender) → revert if true
        │
        ▼
[0.5] ROUTE (if cross-chain)
    └── LI.FI API: get quote → best route → transform intent
        │
        ▼
[0.55] ENS PROFILE
    ├── provider.lookupAddress(sender) → ENS name
    ├── Read text records: threshold, mode, whitelist
    └── Apply rules (flag if above threshold, block if not whitelisted in paranoid mode)
        │
        ▼
[0.6] ML AGENT (if mlBotFlagged === undefined)
    ├── POST /review → { score, flagged, proposalId }
    │   ├── Fetch Etherscan TX history
    │   ├── Compute 47 features
    │   ├── XGBoost predict
    │   └── Forward to Guardian Network
    └── Set mlBotFlagged = analysis.flagged
        │
        ▼
[1-2] PARALLEL EXECUTION
    ┌─────────────────────────┬─────────────────────────┐
    │  VDF (if ML flagged)    │  GUARDIAN VOTING         │
    │                         │                          │
    │  POST /vdf/request      │  POST /proposals/submit  │
    │  Poll /vdf/status/:id   │  Poll /proposals/:id/status
    │                         │                          │
    │  Wesolowski VDF:        │  10 guardians vote:      │
    │  y = x^(2^T) mod N      │  score>=70 → reject     │
    │  50k iter (~1s demo)    │  score>=50 → likely reject
    │                         │  score<50  → approve     │
    │  Returns: VDFProof      │  Returns: FrostSignature │
    └─────────────────────────┴─────────────────────────┘
        │                              │
        │   If guardian REJECTS:       │
        │   throw "rejected"  ◄────────┘
        │
        ▼
[3] ON-CHAIN EXECUTION
    ├── queueTransaction(txHash, sender, dest, value, flagged, data)
    ├── executeTransaction(txHash, vdfProof, frostR, frostZ)
    └── Returns: TransactionReceipt
        │
        ▼
[4] RESULT
    └── { txHash, receipt, vdfProof, frostSignature, executionTime }
```

---

## Frontend Integration Guide

### Landing Page Data Sources

| Data Point | Source | How to Get |
|-----------|--------|------------|
| Protocol paused? | SecurityMiddleware contract | `isPaused()` — ethers.js read call |
| Guardian threshold | SecurityMiddleware contract | `GUARDIAN_THRESHOLD()` → returns `7` |
| VDF delay | SecurityMiddleware contract | `getVDFDelay()` → returns `1800` (30 min) |
| Guardian count | GuardianRegistry contract | `getGuardianCount()` → returns `10` |
| Active proposals | Guardian Mock API | `GET :3001/health` → `activeProposals` |
| ML model status | Agent API | `GET :5000/health` → `model_loaded` |
| VDF worker status | VDF Worker API | `GET :3000/health` → `activeJobs`, `demoIterations` |
| Is address blacklisted? | SecurityMiddleware contract | `blacklistedAddresses(addr)` → `bool` |
| TX status | SecurityMiddleware contract | `getTransactionStatus(txHash)` → `(exists, flagged, executed, ...)` |

### TX Logger Page

#### Real-Time Transaction Feed via SSE

```typescript
// Connect to Agent's SSE stream for live events
const evtSource = new EventSource('http://localhost:5000/events');

// New transaction review event
evtSource.addEventListener('review', (e) => {
  const data = JSON.parse(e.data);
  addToLog({
    proposalId: data.proposalId,
    mlScore: data.mlAnalysis.score,
    mlVerdict: data.mlAnalysis.verdict,
    mlFlagged: data.mlAnalysis.flagged,
    guardianSubmitted: data.guardianStatus.submitted,
    senderENS: data.senderENS,
    timestamp: Date.now(),
  });
});
```

#### Polling Guardian Voting Status

```typescript
// After getting a proposalId from the review event:
async function pollVoting(proposalId: string) {
  const res = await fetch(`http://localhost:3001/proposals/${proposalId}/status`);
  const status = await res.json();
  
  return {
    phase: status.phase,        // 'commit' | 'reveal' | 'complete' | 'expired'
    approvals: status.votes.approve,
    rejections: status.votes.reject,
    abstentions: status.votes.abstain,
    pending: status.votes.pending,
    isApproved: status.isApproved,
    isRejected: status.isRejected,
    frostSignature: status.frostSignature,  // { R, z } when approved
  };
}
```

#### On-Chain Event Listening

```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://sepolia.infura.io/v3/YOUR_KEY');

const middleware = new ethers.Contract(
  '0x8A4364c08147b1Ec0025e7B1e848BF675f9Dc7b9',
  [
    'event TransactionQueued(bytes32 indexed txHash, bytes32 indexed proposalId, bool mlBotFlagged, uint256 vdfDeadline, string reason)',
    'event TransactionExecuted(bytes32 indexed txHash, string executionPath)',
    'event TransactionBlocked(bytes32 indexed txHash, string reason)',
    'event GuardianBypass(bytes32 indexed txHash, bytes32 indexed proposalId, uint8 approvals)',
  ],
  provider,
);

// Listen for new transactions
middleware.on('TransactionQueued', (txHash, proposalId, mlBotFlagged, vdfDeadline, reason) => {
  console.log('TX Queued:', { txHash, proposalId, mlBotFlagged, vdfDeadline, reason });
});

middleware.on('TransactionExecuted', (txHash, executionPath) => {
  console.log('TX Executed:', { txHash, executionPath });
});

middleware.on('TransactionBlocked', (txHash, reason) => {
  console.log('TX Blocked:', { txHash, reason });
});
```

### Connecting to the SDK

```typescript
import { createTestnetMiddleware } from '@sackmoney/sdk';
// or: import { createSecurityMiddleware } from '../../sdk';

const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();

const middleware = createTestnetMiddleware(provider, signer, {
  vdfWorkerUrl: 'http://localhost:3000',
  guardianApiUrl: 'http://localhost:3001',
  agentApiUrl: 'http://localhost:5000',
});

// Check protocol state
const state = await middleware.getSecurityState();
// { isPaused, lastUpdateBlock, requiredDelay, threshold }

// Check if address is blacklisted
const banned = await middleware.isBlacklisted('0x...');

// Execute a TX through the airlock
const result = await middleware.executeSecurely(
  { type: 'generic', target: '0x...', data: '0x', value: 0n, amount: parseEther('1'), sourceChain: 11155111 },
  (progress) => updateUI(progress),
  senderAddress,
);
```

### Reading On-Chain State

```typescript
// Direct contract reads (no SDK needed)
const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);

// SecurityMiddleware
const middleware = new ethers.Contract('0x8A4364c08147b1Ec0025e7B1e848BF675f9Dc7b9', [
  'function isPaused() view returns (bool)',
  'function blacklistedAddresses(address) view returns (bool)',
  'function GUARDIAN_THRESHOLD() pure returns (uint8)',
  'function getVDFDelay() pure returns (uint256)',
  'function getTransactionStatus(bytes32) view returns (bool, bool, bool, bool, bool, uint256, bool)',
], provider);

const paused = await middleware.isPaused();                    // false
const threshold = await middleware.GUARDIAN_THRESHOLD();        // 7
const vdfDelay = await middleware.getVDFDelay();               // 1800n (30 min)
const [exists, flagged, executed, approved, rejected, deadline, vdfDone] =
  await middleware.getTransactionStatus('0xTXHASH...');

// GuardianRegistry
const registry = new ethers.Contract('0x702e8307Bc9c8EC7489C6f9e5562EdA44bB9fB7d', [
  'function isPaused() view returns (bool)',
  'function getGuardianCount() view returns (uint8)',
], provider);

const guardianCount = await registry.getGuardianCount();       // 10
```

---

## Running Locally

### Prerequisites

- Node.js 18+
- Python 3.11+ with `uv` (or pip)
- A Sepolia RPC URL (Infura/Alchemy)
- A funded Sepolia wallet (>0.01 ETH)

### 1. Start Services

```bash
# Terminal 1: ML Agent (port 5000)
cd agent
uv run python main.py

# Terminal 2: Guardian Mock (port 3001)
cd guardian-mock
npm install && npx ts-node src/server.ts

# Terminal 3: VDF Worker (port 3000)
cd lib/vdf
npm install && npx ts-node server.ts
```

### 2. Run Demo Scripts

```bash
cd sdk
npm install

# Mock mode (no services needed)
npx ts-node mockExamples/smallTx.ts

# Sepolia mode (all 3 services must be running)
npx ts-node mockExamples/smallTx.ts --sepolia
```

### 3. Verify Health

```bash
curl http://localhost:5000/health   # Agent
curl http://localhost:3001/health   # Guardian
curl http://localhost:3000/health   # VDF Worker
```

---

## Environment Variables

### `deploy/.env`

```env
PRIVATE_KEY=0x...            # Deployer/signer private key
SEPOLIA_RPC_URL=https://...  # Sepolia RPC endpoint
ETHERSCAN_API_KEY=...        # For contract verification
```

### `agent/.env` (optional)

```env
ETHERSCAN_API_KEY=...        # For wallet analysis (falls back to hash-based scoring)
PORT=5000                    # Agent port
```

### VDF Worker (env vars)

```env
VDF_PORT=3000                # Worker port (default: 3000)
VDF_ITERATIONS=50000         # Demo iterations (default: 50000, prod: 300000000)
```

### `sdkMode.ts` defaults

```env
AGENT_URL=http://localhost:5000       # ML Agent
GUARDIAN_URL=http://localhost:3001    # Guardian Network
VDF_WORKER_URL=http://localhost:3000  # VDF Worker
```

---

## Protocol Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `GUARDIAN_COUNT` | `10` | Total guardians in the network |
| `GUARDIAN_THRESHOLD` | `7` | Required approvals for execution |
| `REJECTION_THRESHOLD` | `4` | Rejections needed to block (>3) |
| `VDF_ITERATIONS` | `300,000,000` | Production VDF iterations (30 min) |
| `VDF_DELAY_SECONDS` | `1800` | Fixed 30-minute delay when flagged |
| `ML_BOT_THRESHOLD` | `50` | Score >= 50 = flagged for VDF |
| `VOTE_APPROVE` | `1` | Circuit value for approve |
| `VOTE_REJECT` | `0` | Circuit value for reject |
| `VOTE_ABSTAIN` | `2` | Circuit value for abstain |
| `ZK_POLL_INTERVAL` | `3000` ms | Vote status polling interval |
| `VDF_POLL_INTERVAL` | `2000` ms | VDF status polling interval |
| `ZK_TIMEOUT` | `300000` ms | Vote timeout (5 min) |
| `VDF_TIMEOUT` | `2100000` ms | VDF timeout (35 min) |
