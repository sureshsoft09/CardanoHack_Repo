# Hydra Head Integration for Smart Freight Management

Complete guide for integrating Cardano Hydra Layer 2 scaling with the Smart Freight Management System for fast, low-cost off-chain payments and settlements.

## 🎯 **Overview**

This integration demonstrates how to use Hydra heads for off-chain micro-payments in the Smart Freight system:

- **Settlement Agent** opens Hydra heads with **Compliance Agent**
- **Off-chain payments** for violation penalties (fast, low fees)
- **On-chain settlement** when head closes (immutable record)
- **Development setup** with Docker hydra-node

## 🏗️ **Architecture**

```
Smart Freight Management + Hydra Layer 2:

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Compliance      │    │ Settlement      │    │ Hydra Head      │
│ Agent           │◄──►│ Agent           │◄──►│ (Layer 2)       │
│                 │    │                 │    │                 │
│ - Violations    │    │ - Head Manager  │    │ - Fast payments │
│ - Invoices      │    │ - Hydra Client  │    │ - Low fees      │
│ - Penalties     │    │ - TX Builder    │    │ - Instant final │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │ Cardano         │    │ hydra-node      │
                       │ Mainnet         │    │ (Docker)        │
                       │                 │    │                 │
                       │ - Settlement TX │    │ - WebSocket API │
                       │ - Plutus Script │    │ - REST API      │
                       │ - Final Record  │    │ - Head State    │
                       └─────────────────┘    └─────────────────┘
```

## 🚀 **Quick Start with Docker**

### **1. Start Hydra Node (Development)**
```bash
# Pull the official hydra-node image
docker pull ghcr.io/input-output-hk/hydra-node:latest

# Create network for hydra nodes
docker network create hydra-net

# Start cardano-node (required dependency)
docker run -d \
  --name cardano-node \
  --network hydra-net \
  -p 3001:3001 \
  -v $(pwd)/cardano-data:/opt/cardano/data \
  inputoutput/cardano-node:latest \
  run \
  --topology /opt/cardano/config/testnet-topology.json \
  --database-path /opt/cardano/data/db \
  --socket-path /opt/cardano/data/node.socket \
  --config /opt/cardano/config/testnet-config.json

# Start hydra-node (Settlement Agent)
docker run -d \
  --name hydra-settlement \
  --network hydra-net \
  -p 4001:4001 \
  -p 5001:5001 \
  -v $(pwd)/hydra-keys:/keys \
  ghcr.io/input-output-hk/hydra-node:latest \
  --node-id settlement-agent \
  --port 5001 \
  --api-port 4001 \
  --cardano-signing-key /keys/settlement.sk \
  --cardano-verification-key /keys/settlement.vk \
  --hydra-signing-key /keys/hydra-settlement.sk \
  --hydra-verification-key /keys/hydra-settlement.vk \
  --peer compliance-agent@hydra-compliance:5002 \
  --cardano-node-socket /opt/cardano/data/node.socket \
  --testnet-magic 1097911063

# Start hydra-node (Compliance Agent)  
docker run -d \
  --name hydra-compliance \
  --network hydra-net \
  -p 4002:4002 \
  -p 5002:5002 \
  -v $(pwd)/hydra-keys:/keys \
  ghcr.io/input-output-hk/hydra-node:latest \
  --node-id compliance-agent \
  --port 5002 \
  --api-port 4002 \
  --cardano-signing-key /keys/compliance.sk \
  --cardano-verification-key /keys/compliance.vk \
  --hydra-signing-key /keys/hydra-compliance.sk \
  --hydra-verification-key /keys/hydra-compliance.vk \
  --peer settlement-agent@hydra-settlement:5001 \
  --cardano-node-socket /opt/cardano/data/node.socket \
  --testnet-magic 1097911063
```

### **2. Generate Hydra Keys**
```bash
# Create keys directory
mkdir -p hydra-keys && cd hydra-keys

# Generate Cardano keys (Settlement Agent)
cardano-cli address key-gen \
  --verification-key-file settlement.vk \
  --signing-key-file settlement.sk

# Generate Cardano keys (Compliance Agent)
cardano-cli address key-gen \
  --verification-key-file compliance.vk \
  --signing-key-file compliance.sk

# Generate Hydra keys (Settlement Agent)
hydra-node gen-hydra-key \
  --output-file hydra-settlement

# Generate Hydra keys (Compliance Agent)
hydra-node gen-hydra-key \
  --output-file hydra-compliance
```

### **3. Fund Addresses with Testnet ADA**
```bash
# Get addresses
SETTLEMENT_ADDR=$(cardano-cli address build \
  --payment-verification-key-file settlement.vk \
  --testnet-magic 1097911063)

COMPLIANCE_ADDR=$(cardano-cli address build \
  --payment-verification-key-file compliance.vk \
  --testnet-magic 1097911063)

echo "Settlement Agent Address: $SETTLEMENT_ADDR"
echo "Compliance Agent Address: $COMPLIANCE_ADDR"

# Fund these addresses from Cardano testnet faucet:
# https://testnets.cardano.org/en/testnets/cardano/tools/faucet/
```

## 🔧 **Node.js Hydra Client**

The `hydra-client.js` script demonstrates complete Hydra head lifecycle:

```bash
# Install dependencies
npm install

# Run the Hydra client demo
node hydra-client.js

# Expected output:
# 1. Connects to both hydra nodes
# 2. Initiates head opening
# 3. Waits for head to be ready
# 4. Submits off-chain payment
# 5. Closes head
# 6. Generates settlement transaction
```

## 📡 **Hydra Node API Endpoints**

### **WebSocket API (Real-time Events)**
```javascript
// Connect to hydra-node WebSocket
const ws = new WebSocket('ws://localhost:4001');

// Listen for head state changes
ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  switch (message.tag) {
    case 'HeadIsInitializing':
      console.log('Head initialization started');
      break;
    case 'HeadIsOpen':
      console.log('Head is open, ready for transactions');
      break;
    case 'TxValid':
      console.log('Transaction confirmed off-chain');
      break;
    case 'HeadIsClosed':
      console.log('Head closed, settlement available');
      break;
  }
});
```

### **REST API (Head Management)**
```bash
# Get head status
curl http://localhost:4001/

# Submit transaction to head
curl -X POST http://localhost:4001/ \
  -H "Content-Type: application/json" \
  -d '{
    "tag": "NewTx",
    "transaction": "<cbor-encoded-transaction>"
  }'

# Close head
curl -X DELETE http://localhost:4001/
```

## 💰 **Payment Flow Integration**

### **1. Settlement Agent Initiates Head**
```javascript
// In Settlement Agent (settlementAgent.ts)
async function createNewHydraHead() {
  // Send init message to hydra-node
  const initMessage = {
    tag: 'Init',
    contestationPeriod: 60  // seconds
  };
  
  hydraWebSocket.send(JSON.stringify(initMessage));
  
  // Wait for HeadIsOpen event
  return new Promise((resolve) => {
    hydraWebSocket.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.tag === 'HeadIsOpen') {
        resolve(message.headId);
      }
    });
  });
}
```

### **2. Off-chain Payment Execution**
```javascript
// Execute micro-payment within Hydra head
async function executeHydraMicroPayment(invoice, hydraHead) {
  // Build Cardano transaction (off-chain)
  const transaction = {
    inputs: [{
      txId: 'previous-tx-id',
      outputIndex: 0
    }],
    outputs: [{
      address: invoice.recipientAddress,
      amount: invoice.amountAda * 1000000  // Lovelace
    }],
    fee: 0  // No fees in Hydra!
  };
  
  // Submit to Hydra head
  const submitMessage = {
    tag: 'NewTx',
    transaction: encodeCBOR(transaction)
  };
  
  hydraWebSocket.send(JSON.stringify(submitMessage));
  
  // Transaction is confirmed instantly off-chain
  return waitForConfirmation(transaction.id);
}
```

### **3. Head Closure and Settlement**
```javascript
// Close head and settle on-chain
async function closeHeadAndSettle(headId) {
  // Send close message
  const closeMessage = { tag: 'Close' };
  hydraWebSocket.send(JSON.stringify(closeMessage));
  
  // Wait for settlement transaction
  return new Promise((resolve) => {
    hydraWebSocket.on('message', (data) => {
      const message = JSON.parse(data);
      if (message.tag === 'HeadIsClosed') {
        // Settlement transaction is automatically submitted
        resolve(message.contestationDeadline);
      }
    });
  });
}
```

## 🔗 **Integration with Smart Freight**

### **Settlement Agent Integration**
The Settlement Agent uses Hydra for micro-payments:

```typescript
// In backend/agents/settlement-agent/src/settlementAgent.ts

class HydraClientWrapper {
  private ws: WebSocket;
  
  async initHead(participants: string[]): Promise<string> {
    // Initialize Hydra head between Settlement ↔ Compliance agents
    const initMsg = {
      tag: 'Init',
      participants,
      contestationPeriod: 60
    };
    
    this.ws.send(JSON.stringify(initMsg));
    return await this.waitForHeadOpen();
  }
  
  async submitTransaction(headId: string, tx: any): Promise<string> {
    // Submit off-chain payment transaction
    const submitMsg = {
      tag: 'NewTx', 
      transaction: this.encodeTxToCBOR(tx)
    };
    
    this.ws.send(JSON.stringify(submitMsg));
    return await this.waitForTxValid();
  }
  
  async closeHead(headId: string): Promise<string> {
    // Close head and trigger on-chain settlement
    this.ws.send(JSON.stringify({ tag: 'Close' }));
    return await this.waitForSettlement();
  }
}
```

### **Invoice Payment Workflow**
```
1. Compliance Agent → Detects violation → Creates invoice
2. Settlement Agent → Opens Hydra head (if needed)
3. Settlement Agent → Executes off-chain payment in head
4. Hydra Network → Confirms payment instantly (0 fees)
5. Settlement Agent → Closes head periodically
6. Cardano Network → Receives settlement transaction
7. Plutus Validator → Validates settlement → Unlocks escrow
```

## 🧪 **Development Testing**

### **Manual Testing Steps**
```bash
# 1. Start development environment
docker-compose up -d

# 2. Run Hydra client script
node hydra-client.js

# 3. Check logs
docker logs hydra-settlement
docker logs hydra-compliance

# 4. Monitor Cardano transactions
cardano-cli query utxo \
  --address $SETTLEMENT_ADDR \
  --testnet-magic 1097911063
```

### **Integration Testing**
```bash
# Test complete Settlement Agent + Hydra integration
cd backend/agents/settlement-agent
npm test -- --grep "Hydra"

# Expected tests:
# - Hydra head creation
# - Off-chain payment execution  
# - Head closure and settlement
# - Error handling and recovery
```

## 📊 **Performance Benefits**

### **Hydra vs Direct Cardano Payments**

| Metric | Direct Cardano | Hydra Layer 2 |
|--------|----------------|---------------|
| **Transaction Time** | ~20 seconds | ~100ms |
| **Transaction Fee** | ~0.2 ADA | ~0 ADA |
| **Throughput** | ~7 TPS | ~1000 TPS |
| **Finality** | 6+ confirmations | Instant |

### **Smart Freight Use Cases**
- ✅ **Micro-penalties**: $0.01 violations (impossible on L1)
- ✅ **Real-time billing**: Instant compliance charges
- ✅ **Batch settlements**: Close head daily/weekly
- ✅ **Cost efficiency**: 1000x reduction in fees
- ✅ **Scalability**: Handle thousands of shipments

## 🔒 **Security Considerations**

### **Hydra Head Security**
- **Multi-sig requirement**: Both agents must agree to close
- **Contestation period**: Time to dispute invalid closes
- **On-chain settlement**: Final state recorded on Cardano
- **Cryptographic safety**: Same security as Cardano L1

### **Smart Freight Security**
- **Key management**: Secure storage of Hydra signing keys
- **Network isolation**: Private Hydra network for freight partners
- **Dispute resolution**: Contestation mechanism for invalid payments
- **Audit trail**: All transactions logged and verifiable

## 🎯 **Production Deployment**

### **Infrastructure Requirements**
```yaml
# docker-compose.yml for production
version: '3.8'
services:
  cardano-node:
    image: inputoutput/cardano-node:latest
    volumes:
      - cardano-data:/opt/cardano/data
      - ./config:/opt/cardano/config
    
  hydra-settlement:
    image: ghcr.io/input-output-hk/hydra-node:latest
    depends_on: [cardano-node]
    volumes:
      - ./keys:/keys:ro
    environment:
      - HYDRA_NODE_ID=settlement-agent
      - CARDANO_NODE_SOCKET=/opt/cardano/data/node.socket
    
  hydra-compliance:
    image: ghcr.io/input-output-hk/hydra-node:latest
    depends_on: [cardano-node]
    volumes:
      - ./keys:/keys:ro
    environment:
      - HYDRA_NODE_ID=compliance-agent
```

### **Monitoring and Alerting**
```bash
# Monitor Hydra head status
curl -s http://localhost:4001/ | jq '.headStatus'

# Check settlement transactions
cardano-cli query utxo --address $SCRIPT_ADDRESS

# Alert on head closure failures
if [ "$(curl -s http://localhost:4001/ | jq -r '.headStatus')" = "Closed" ]; then
  echo "Alert: Hydra head closed, settlement in progress"
fi
```

## 🚛 **Perfect for Smart Freight**

This Hydra integration enables the Smart Freight Management System to:

- **⚡ Process thousands** of micro-payments per second
- **💰 Eliminate transaction fees** for small violations  
- **🔄 Settle in real-time** without waiting for blocks
- **📊 Scale to enterprise** freight volumes
- **🔒 Maintain security** with Cardano finality

The combination of **Hydra Layer 2** for payments + **Plutus validators** for settlement creates the perfect blockchain infrastructure for **real-world IoT and supply chain applications**! 🚛⚡🔗