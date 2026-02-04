# VDF Setup Instructions

## Quick Start

```bash
cd lib/vdf
npm install
npm test
```
## Installation Steps

### 1. Navigate to VDF directory
```bash
cd lib/vdf
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run tests
```bash
npm test
```
## Project Structure

```
vdf/
├── src/                   
│   ├── types.ts           
│   ├── params.ts          # VDF params
│   ├── prover.ts          # computation
│   ├── verifier.ts        # verification
│   ├── client.ts          
│   └── index.ts           # exports
├── contracts/            
│   ├── SecurityMiddleware.sol
│   └── VDFVerifier.sol
├── test/                  
│   └── vdf.test.ts
├── examples/              
│   └── vdf-demo.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Integration

### With FROST (lib/frost)

VDF works with FROST signatures for guardian bypass:
```typescript
// Guardian approval bypasses VDF
if (guardianApproved) {
  const zeroProof = vdfClient.createZeroProof();
  await executeWithProof(zeroProof);
}
```

### With ZK Voting (lib/zk)

VDF starts when ZK voting proposal created:
```typescript
// Create proposal → Start VDF
const proposalId = await guardianRegistry.initiateVote(...);
const vdfJobId = await vdfClient.requestProof(...);

// then wait for either:
// - Guardian approval (fast)
// - VDF completion (slow)
```