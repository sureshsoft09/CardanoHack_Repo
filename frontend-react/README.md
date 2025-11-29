# Smart Freight Frontend - React Cardano Wallet Integration

A comprehensive React frontend with Cardano testnet wallet integration for the Smart Freight Management System. Supports Nami, Eternl, Flint, Typhon, and Gero wallets with invoice payment functionality.

## 🎯 **Key Features**

- **Multi-Wallet Support**: Nami, Eternl, Flint, Typhon, Gero wallet detection and connection
- **Cardano Testnet Integration**: Properly configured for testnet (Network ID: 0, Protocol Magic: 1097911063)
- **Invoice Payment System**: Direct payments and Hydra Layer 2 integration
- **Real-Time Updates**: Event-driven wallet state management with React hooks
- **CIP-30 Compliance**: Standard Cardano wallet API implementation
- **Transaction Signing**: Secure transaction building and wallet popup handling

## 🏗️ **Architecture Overview**

```
React Frontend Architecture:
┌─────────────────────────────────────────────────────────────┐
│                     React Application                       │
├─────────────────────────────────────────────────────────────┤
│  Components:                                                │
│  ├── WalletConnector: Multi-wallet detection & connection   │
│  ├── InvoicePayment: Payment processing with 2 methods     │
│  └── WalletIntegrationExample: Full demo interface         │
├─────────────────────────────────────────────────────────────┤
│  Hooks:                                                     │
│  ├── useCardanoWallet: Connection state management         │
│  ├── useInvoicePayment: Payment flow orchestration         │
│  ├── useTransactionSigning: TX signing & submission        │
│  ├── useWalletBalance: Balance monitoring                  │
│  └── useHydraIntegration: Layer 2 payment handling         │
├─────────────────────────────────────────────────────────────┤
│  Services:                                                  │
│  └── wallet.js: Core Cardano wallet service (CIP-30)      │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│               Browser Wallet Extensions                     │
│  Nami │ Eternl │ Flint │ Typhon │ Gero                   │
│             (window.cardano.*)                              │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 Cardano Testnet                            │
│  Network ID: 0 │ Protocol Magic: 1097911063                │
└─────────────────────────────────────────────────────────────┘
```

## 💰 **Payment Integration**

### **Two Payment Methods**

#### **1. Direct Cardano Payment**
```javascript
// Direct on-chain transaction
const result = await payInvoice(invoice, { method: 'direct' });
// Result: { directPayment: { txHash, explorerUrl, status } }
```

#### **2. Hydra Layer 2 Payment**
```javascript
// Off-chain Hydra head payment
const result = await payInvoice(invoice, { method: 'hydra' });
// Result: { hydraPayment: { paymentId, hydraHeadId, status } }
```

## 🔧 **Wallet Service API**

### **Core Wallet Operations**
```javascript
import walletService from './services/wallet';

// Detect available wallets
const wallets = walletService.detectWallets();
// Returns: [{ name: 'Nami', type: 'nami', isEnabled: true, icon, version }]

// Connect to wallet (triggers popup)
const connection = await walletService.connectWallet('nami');
// Returns: { walletType, networkId, addresses, balance, isConnected }

// Get wallet balance
const balance = await walletService.getBalance();
// Returns: { lovelace: '50000000', ada: 50, assets: [] }

// Sign transaction (triggers wallet popup)
const witnessSet = await walletService.signTransaction(txHex);

// Pay invoice (main payment function)
const result = await walletService.payInvoice(invoice);
```

### **React Hooks Integration**
```javascript
import { useCardanoWallet, useInvoicePayment } from './hooks/useWallet';

// Wallet connection management
const {
  isConnected,
  walletInfo,
  availableWallets,
  balance,
  addresses,
  connect,
  disconnect,
  error
} = useCardanoWallet();

// Invoice payment processing
const {
  payInvoice,
  isProcessing,
  paymentResult,
  paymentHistory,
  error
} = useInvoicePayment();
```

## 🎨 **UI Components**

### **WalletConnector Component**
- Auto-detects installed Cardano wallets
- Shows connection status and wallet info
- Handles testnet network validation
- Displays balance and addresses

### **InvoicePayment Component**
- Payment method selection (Direct vs Hydra)
- Invoice details display
- Payment processing with progress indicators
- Transaction result display with explorer links

### **Example Payment Flow**
```javascript
// Example invoice from Smart Freight system
const invoice = {
  invoiceId: 'inv-001',
  shipmentId: 'SHIP-001',
  amountAda: 25,
  currency: 'ADA',
  description: 'Cold chain temperature violation penalty',
  recipientAddress: 'addr_test1...',
  metadata: {
    ruleViolated: 'TEMP_COLD_CHAIN',
    severity: 'critical'
  }
};

// Process payment
const handlePayment = async () => {
  try {
    const result = await payInvoice(invoice);
    console.log('Payment successful:', result.txHash);
  } catch (error) {
    console.error('Payment failed:', error.message);
  }
};
```

## ⚙️ **Testnet Configuration**

### **Network Settings**
```javascript
const CARDANO_CONFIG = {
  network: 'testnet',
  networkId: 0,              // 0 = testnet, 1 = mainnet
  protocolMagic: 1097911063, // Cardano testnet protocol magic
  blockfrost: {
    url: 'https://cardano-testnet.blockfrost.io/api/v0',
    projectId: 'your_testnet_project_id'
  },
  explorer: 'https://testnet.cardanoscan.io'
};
```

### **Environment Variables**
```env
# Cardano Testnet Configuration
REACT_APP_CARDANO_NETWORK=testnet
REACT_APP_CARDANO_NETWORK_ID=0
REACT_APP_PROTOCOL_MAGIC=1097911063

# Backend Integration
REACT_APP_API_BASE_URL=http://localhost:3002
REACT_APP_SETTLEMENT_API=http://localhost:3004

# Development Settings
REACT_APP_MOCK_WALLET_CALLS=true
REACT_APP_DEBUG_WALLET_EVENTS=true
```

## 🚀 **Getting Started**

### **Prerequisites**
1. **Cardano Wallet**: Install [Nami](https://namiwallet.io) or [Eternl](https://eternl.io)
2. **Testnet ADA**: Get from [Cardano Testnet Faucet](https://testnets.cardano.org/en/testnets/cardano/tools/faucet/)
3. **Wallet Setup**: Switch wallet to testnet mode

### **Installation**
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm start

# Application runs on http://localhost:3000
```

### **Wallet Setup Instructions**
1. **Install wallet extension** (Nami/Eternl recommended)
2. **Switch to testnet** in wallet settings
3. **Get testnet ADA** from faucet
4. **Connect wallet** in the application
5. **Pay invoices** using either direct payment or Hydra Layer 2

## 🔗 **Backend Integration**

### **Settlement Agent Integration**
```javascript
// Hydra payment calls backend Settlement Agent
const response = await axios.post('/api/settlement/hydra-payment', {
  invoice,
  walletAddress,
  walletType: 'nami',
  networkId: 0
});

// If backend requires wallet signature for Hydra head funding
if (response.data.requiresWalletSignature) {
  const witnessSet = await walletService.signTransaction(response.data.txHex);
  // Send signed transaction back to backend
}
```

### **API Endpoints Expected**
- `POST /api/settlement/hydra-payment` - Initiate Hydra payment
- `POST /api/settlement/confirm-hydra-funding` - Confirm wallet signature
- `GET /api/settlement/hydra-heads/:id` - Get Hydra head status

## 🛠️ **Development Notes**

### **Mock Implementations**
- **Transaction Building**: Mock CBOR transaction construction (replace with cardano-serialization-lib)
- **Address Conversion**: Mock hex ↔ bech32 conversion (implement with CardanoWasm)
- **Balance Parsing**: Mock balance calculation (use CardanoWasm.Value)
- **Backend Calls**: Mock Settlement Agent responses for development

### **Production TODOs**
```javascript
// 1. Replace mock transaction building
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-browser';

// 2. Implement proper address handling
const address = CardanoWasm.Address.from_bytes(Buffer.from(hexAddress, 'hex'));
const bech32Address = address.to_bech32();

// 3. Add real UTXO management
const utxos = await walletApi.getUtxos();
const parsedUtxos = utxos.map(utxo => 
  CardanoWasm.TransactionUnspentOutput.from_bytes(Buffer.from(utxo, 'hex'))
);

// 4. Implement fee calculation
const linearFee = CardanoWasm.LinearFee.new(
  CardanoWasm.BigNum.from_str('44'),
  CardanoWasm.BigNum.from_str('155381')
);
```

### **Testing Scenarios**
1. **Wallet Detection**: Test with different wallet combinations
2. **Network Validation**: Ensure testnet-only operation
3. **Payment Flows**: Test both direct and Hydra payment methods
4. **Error Handling**: Test connection failures, insufficient funds, user rejection
5. **Backend Integration**: Test Settlement Agent API integration

## 🎯 **Perfect for Demonstrations**

This React frontend provides a complete **Cardano wallet integration** showcase:

- **🔌 Multi-wallet support** with automatic detection
- **⚡ Dual payment methods** (Direct + Hydra Layer 2)
- **🎨 Polished UI** with real-time updates
- **🧪 Testnet ready** with proper network configuration
- **🔗 Backend integration** for Settlement Agent coordination

Ideal for demonstrating **Cardano's real-world utility** in freight management and IoT applications! 🚛💎