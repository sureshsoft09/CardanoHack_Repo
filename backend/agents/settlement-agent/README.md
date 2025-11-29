# Settlement Agent

A TypeScript-based settlement orchestrator that combines Hydra Layer 2 micro-payments with Cardano mainnet transaction finalization for the Smart Freight Management System.

## Features

- **Hydra Layer 2 Integration**: Off-chain micro-payments for fast, low-cost settlements
- **Cardano Mainnet Settlement**: On-chain decision logging with Plutus validators
- **Multi-Party Hydra Heads**: Automated head creation between Settlement and Compliance agents
- **Decision Logging**: Cryptographically verifiable settlement records
- **Event-Driven Architecture**: Real-time settlement status updates
- **Mock Implementation**: Ready for development with production integration points

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Compliance      │───▶│ Settlement      │───▶│ Cardano         │
│ Agent           │    │ Agent           │    │ Mainnet         │
│                 │    │                 │    │                 │
│ - Violations    │    │ - Hydra Heads   │    │ - Plutus Script │
│ - Invoices      │    │ - Micro-payments│    │ - Decision Hash │
│ - Penalties     │    │ - Decision Logs │    │ - Immutable Log │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                ▲
                                │
                       ┌─────────────────┐
                       │ Hydra Layer 2   │
                       │                 │
                       │ - Fast payments │
                       │ - Low fees      │
                       │ - Instant final │
                       └─────────────────┘
```

## Core Settlement Flow

### 1. Invoice Settlement
```typescript
const { decisionLog, txHash } = await settlementAgent.settle(invoice);
// Returns:
// - decisionLog: Complete settlement record
// - txHash: Cardano transaction hash for on-chain verification
```

### 2. Hydra Head Management
- **Auto-creation** of Hydra heads between Settlement ↔ Compliance agents
- **Balance management** with configurable thresholds
- **Automatic closure** for idle heads

### 3. Decision Publication
```typescript
const txHash = await settlementAgent.publishOnChain(decisionLog);
// Submits to Plutus validator with:
// - decisionHash: SHA-256 of settlement data
// - signerPubKey: Settlement agent's verification key
// - Evidence: Telemetry and violation proofs
```

## API Usage

### Initialize Settlement Agent
```typescript
import { SettlementAgent } from './settlementAgent';

const agent = new SettlementAgent({
  complianceAgentAddress: 'addr1_compliance_agent',
  settlementAgentAddress: 'addr1_settlement_agent',
  hydraConfig: {
    nodeUrl: 'http://localhost:4001',
    network: 'testnet',
    signingKey: 'ed25519_sk_...'
  },
  cardanoConfig: {
    blockfrostApiKey: 'project_id',
    network: 'testnet',
    signingKey: 'ed25519_sk_...',
    address: 'addr1_settlement_agent'
  }
});

await agent.initialize();
```

### Process Settlement
```typescript
// Called by Compliance Agent when invoice needs settlement
const result = await agent.settle({
  invoiceId: 'invoice-uuid',
  shipmentId: 'SHIP-001',
  violationId: 'violation-uuid',
  amountAda: 50,
  currency: 'ADA',
  description: 'Cold chain violation settlement',
  recipientAddress: 'addr1_compliance_agent',
  metadata: {
    ruleViolated: 'TEMP_COLD_CHAIN',
    severity: 'critical',
    evidenceHash: 'sha256_evidence_hash'
  }
});

console.log(`Settlement completed: ${result.txHash}`);
```

### Event Handling
```typescript
agent.on('settlement:completed', (event) => {
  console.log(`Settlement ${event.decisionLog.decisionId} completed`);
  console.log(`Cardano TX: ${event.txHash}`);
  console.log(`Hydra TX: ${event.hydraTransaction.txId}`);
});

agent.on('hydra:head-opened', (head) => {
  console.log(`New Hydra head: ${head.headId}, Balance: ${head.balance} Lovelace`);
});

agent.on('cardano:decision-published', (event) => {
  console.log(`Decision published: ${event.txHash}`);
});
```

## Blockchain Integration Points

### Hydra Node Integration
```typescript
// TODO: Replace mock implementation with actual hydra-node API
class HydraClientWrapper {
  async initHead(params: {
    participants: string[];
    contestationPeriod: number;
    initialFunds: number;
  }): Promise<HydraHead> {
    // Real implementation:
    // const response = await fetch(`${this.nodeUrl}/head`, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${this.apiKey}` },
    //   body: JSON.stringify(params)
    // });
    // return response.json();
  }

  async submitTransaction(headId: string, tx: any): Promise<string> {
    // Real implementation:
    // const response = await fetch(`${this.nodeUrl}/head/${headId}/tx`, {
    //   method: 'POST',
    //   body: JSON.stringify(tx)
    // });
    // return response.json().txId;
  }
}
```

### Cardano Transaction Building
```typescript
// TODO: Replace mock with Blockfrost API or cardano-cli calls
async function publishOnChain(decisionLog: DecisionLog): Promise<string> {
  // Real implementation using Blockfrost:
  // const blockfrost = new BlockfrostAPI({
  //   projectId: this.config.blockfrostApiKey,
  //   network: this.config.network
  // });
  //
  // const utxos = await blockfrost.addressesUtxos(this.address);
  // const transaction = await blockfrost.txs({
  //   inputs: utxos,
  //   outputs: [{
  //     address: PLUTUS_VALIDATOR_ADDRESS,
  //     amount: '2000000', // 2 ADA
  //     datum: {
  //       shipmentId: decisionLog.shipmentId,
  //       decisionHash: decisionLog.decisionHash,
  //       signerPubKey: decisionLog.signerPubKey
  //     }
  //   }],
  //   metadata: {
  //     674: {
  //       msg: [`Smart Freight Settlement: ${decisionLog.shipmentId}`],
  //       decisionId: decisionLog.decisionId
  //     }
  //   }
  // });
  //
  // const signed = await this.signTransaction(transaction);
  // return await blockfrost.txSubmit(signed);
}
```

### Plutus Validator Integration
```haskell
-- Example Plutus validator for decision verification
validateDecision :: DecisionDatum -> DecisionRedeemer -> ScriptContext -> Bool
validateDecision datum redeemer ctx =
  traceIfFalse "Invalid decision hash" (verifyDecisionHash datum) &&
  traceIfFalse "Invalid signer" (verifySigner datum ctx) &&
  traceIfFalse "Invalid timestamp" (verifyTimestamp datum ctx)
```

## Configuration

### Environment Variables
```env
# Hydra Configuration
HYDRA_NODE_URL=http://localhost:4001
HYDRA_SIGNING_KEY=ed25519_sk_your_hydra_key

# Cardano Configuration
CARDANO_NETWORK=testnet
BLOCKFROST_API_KEY=your_blockfrost_project_id
CARDANO_SIGNING_KEY=ed25519_sk_your_cardano_key

# Addresses
COMPLIANCE_AGENT_ADDRESS=addr1_compliance_agent
SETTLEMENT_AGENT_ADDRESS=addr1_settlement_agent
PLUTUS_VALIDATOR_ADDRESS=addr1_script_address
```

### Hydra Head Parameters
```typescript
{
  participants: ['addr1_settlement', 'addr1_compliance'],
  contestationPeriod: 60, // seconds
  initialFunds: 100_000_000, // 100 ADA in Lovelace
  autoClose: true,
  idleTimeout: 1800 // 30 minutes
}
```

## Development

### Quick Start
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Development with hot reload
npm run dev

# Production build
npm run build
npm start
```

### Mock Implementation
- **Hydra operations** return mock transaction IDs and simulate WebSocket events
- **Cardano transactions** return fake transaction hashes with realistic delays
- **All blockchain calls** can be mocked via `MOCK_BLOCKCHAIN_CALLS=true`

### Testing Settlement Flow
```typescript
// Create test invoice
const testInvoice = {
  invoiceId: 'test-invoice-001',
  shipmentId: 'SHIP-001',
  amountAda: 25,
  currency: 'ADA',
  description: 'Test violation settlement'
};

// Execute settlement
const result = await settlementAgent.settle(testInvoice);
console.log(`Test settlement: ${result.txHash}`);
```

## Production Deployment

### Prerequisites
1. **Hydra Node**: Running hydra-node instance with API access
2. **Cardano Node**: Synced cardano-node or Blockfrost Pro account
3. **Plutus Validator**: Deployed decision validation script
4. **Signing Keys**: Ed25519 keys for Hydra and Cardano operations

### Security Considerations
- **Key Management**: Secure storage of signing keys (HSM recommended)
- **Network Security**: TLS for all API communications
- **Access Control**: Restrict hydra-node and cardano-node access
- **Monitoring**: Real-time alerts for failed settlements or blockchain issues

## Integration with Smart Freight System

1. **Compliance Agent** → Detects violation → Creates invoice
2. **Settlement Agent** → Receives `settle(invoice)` call
3. **Hydra Layer 2** → Fast micro-payment execution  
4. **Cardano Mainnet** → Immutable decision logging
5. **Event Emission** → Notify all system components

Perfect for demonstrating the power of Cardano's Layer 2 scaling combined with mainnet security! 🚛⚡🔗