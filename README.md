# Smart Freight Management System

A comprehensive blockchain-powered freight management system built on Cardano, featuring IoT integration, Layer 2 scaling with Hydra, and automated compliance monitoring.

## 🚀 Overview

This project demonstrates a complete end-to-end freight management solution that leverages Cardano's blockchain infrastructure for secure, transparent, and automated logistics operations. The system integrates IoT sensors, smart contracts, Layer 2 scaling, and modern web technologies to create a production-ready freight management platform.

## 🏗️ Architecture

```
┌─────────────────┬─────────────────┬─────────────────┐
│   Frontend      │   Backend       │   Blockchain    │
│                 │                 │                 │
│ React + Wallet  │ Node.js APIs    │ Real Cardano    │
│ Integration     │ TypeScript      │ Transactions    │
│ + Leaflet Maps  │ Microservices   │                 │
├─────────────────┼─────────────────┼─────────────────┤
│ • Nami/Eternl   │ • Tracking      │ • Blockfrost    │
│ • Real Payments │ • Compliance    │   API           │
│ • Interactive   │ • Settlement    │ • CSL Lib       │
│   Dashboard     │ • Payment Svc   │ • Live Wallet   │
│ • Live Tracking │ • IoT Gateway   │   Monitoring    │
└─────────────────┴─────────────────┴─────────────────┘
```

## 📁 Project Structure

```
Smart Frieght Mgmt System/
├── backend/
│   └── agents/
│       ├── tracking-agent/         # Shipment tracking microservice
│       ├── compliance-agent/       # Rule-based compliance monitoring
│       ├── settlement-agent/       # Blockchain settlement orchestration
│       └── shared/                 # Common utilities and types
├── digital-twin-service/           # Digital twin API gateway
├── iot-simulator/                  # IoT sensor data simulation
├── frontend-react/                 # React web application with Leaflet maps
├── masumi-integration/             # Real Cardano payment processing
│   └── payment-service/            # Blockfrost API + Auto payment monitoring
└── onchain/
    ├── plutus/                     # Smart contracts (reference)
    └── hydra/                      # Layer 2 integration (reference)
```

## ✨ Key Features

### 🔗 Real Blockchain Integration
- **Cardano Serialization Library**: Real wallet generation with ED25519 cryptography
- **Blockfrost API**: Live blockchain queries and transaction verification
- **Cardano Wallet Support**: Nami, Eternl wallet connectivity with real ADA transfers
- **Automatic Payment Monitoring**: Background process checks payments every 20 seconds
- **Transaction Confirmations**: Configurable blockchain confirmation requirements
- **Real Testnet/Mainnet**: Actual Cardano blockchain integration (no mocks)

### 🌐 Microservices Architecture
- **Tracking Agent**: Real-time shipment location and status tracking
- **Compliance Agent**: Automated rule enforcement and anomaly detection
- **Settlement Agent**: Orchestrates Hydra payments and on-chain settlement
- **Digital Twin Service**: Unified API gateway with caching and aggregation

### 📱 Modern Frontend
- **React Application**: Premium gradient UI with glass morphism effects
- **Multi-Wallet Support**: Real Cardano wallet integration (Nami/Eternl)
- **Interactive Map**: Leaflet-based live shipment tracking with custom icons
- **Real Payments**: Direct blockchain transactions via Settlement Agent
- **Premium Dashboard**: Chart.js analytics, high-contrast stat cards
- **Live Tracking**: Click-to-highlight shipments with route visualization

### 🔧 DevOps & Infrastructure
- **Docker Integration**: Complete containerized development environment
- **TypeScript**: Type-safe development across all services
- **Event-Driven**: WebSocket and REST API integration
- **Comprehensive Testing**: Unit tests and integration examples

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18+)
- **Docker & Docker Compose**
- **Git**
- **Cardano Wallet** (Nami or Eternl browser extension)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sureshsoft09/CardanoHack_Repo.git
   cd CardanoHack_Repo
   ```

2. **Install dependencies:**
   ```bash
   # Backend services
   cd backend/agents/tracking-agent && npm install && cd ../../..
   cd backend/agents/compliance-agent && npm install && cd ../../..
   cd backend/agents/settlement-agent && npm install && cd ../../..
   
   # Frontend
   cd frontend-react && npm install && cd ..
   
   # Payment service (Real Cardano integration)
   cd masumi-integration/payment-service && npm install && cd ../..
   
   # IoT Simulator
   cd iot-simulator && npm install && cd ..
   ```

3. **Configure Payment Service:**
   ```bash
   # Get free Blockfrost API key from https://blockfrost.io/
   cd masumi-integration/payment-service
   cp .env.example .env
   # Edit .env and add your BLOCKFROST_API_KEY
   ```

4. **Start development environment:**
   ```bash
   # Terminal 1: Tracking Agent
   cd backend/agents/tracking-agent && npm start
   
   # Terminal 2: Compliance Agent
   cd backend/agents/compliance-agent && npm start
   
   # Terminal 3: Settlement Agent (Real blockchain transactions)
   cd backend/agents/settlement-agent && node src/server.js
   
   # Terminal 4: Payment Service (Auto payment monitoring)
   cd masumi-integration/payment-service && node src/server.js
   
   # Terminal 5: IoT Simulator
   cd iot-simulator && node src/iotSimulator.js
   
   # Terminal 6: Frontend
   cd frontend-react && npm start
   ```

5. **Access the application:**
   - Frontend Dashboard: http://localhost:3000
   - Tracking API: http://localhost:3001
   - Compliance API: http://localhost:3002
   - Settlement API (Real Cardano): http://localhost:3003
   - Payment Service: http://localhost:4001
   - IoT Simulator: Port 5000

## 🔧 Configuration

### Environment Variables

Create `.env` files in each service directory:

**Backend Services (.env):**
```env
PORT=3001
NODE_ENV=development
CARDANO_NETWORK=testnet
LOG_LEVEL=info
```

**Settlement Agent (.env):**
```env
PORT=3003
CARDANO_NETWORK=testnet
BLOCKFROST_PROJECT_ID=preprodYourKeyHere
```

**Payment Service (.env):**
```env
PORT=4001
BLOCKFROST_API_KEY=preprodYourKeyHere
CARDANO_NETWORK=testnet
MIN_CONFIRMATIONS=1
PAYMENT_CHECK_INTERVAL=20000
```

**Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_SETTLEMENT_API_URL=http://localhost:3003
REACT_APP_CARDANO_NETWORK=testnet
```

**Hydra Configuration:**
```env
CARDANO_NODE_SOCKET_PATH=/cardano/node.socket
HYDRA_SIGNING_KEY=/hydra/keys/hydra.sk
HYDRA_VERIFICATION_KEY=/hydra/keys/hydra.vk
```

## 📋 Usage Examples

### 1. IoT Sensor Simulation

```bash
cd iot-simulator
node src/iotSimulator.js --shipment SHIP-001 --interval 5000
```

### 2. Smart Contract Deployment

```bash
cd onchain/plutus
cabal run ShipmentEscrow
# Outputs validator script and example transactions
```

### 3. Real Cardano Payment Flow

```javascript
// Payment Service automatically monitors blockchain
const response = await fetch('http://localhost:4001/invoice/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    recipientAddress: 'addr_test1...',
    amount: 50,
    currency: 'ADA',
    description: 'Compliance violation payment',
    metadata: { shipmentId: 'SHIP-001' }
  })
});

const invoice = await response.json();
// Send ADA to invoice.payment.paymentAddress
// Service detects payment within 20-60 seconds
```

### 4. Frontend Wallet Integration (Real Transactions)

```javascript
// Connect Cardano wallet
const { connectWallet, payInvoice } = useCardanoWallet();
await connectWallet('nami');

// Execute real blockchain payment via Settlement Agent
await payInvoice({
    invoiceId: 'INV-001',
    amount: 50000000, // 50 ADA in lovelace
    recipient: 'addr_test1qz...',
    shipmentId: 'SHIP-001'
});
// Transaction submitted to Cardano blockchain
// Track at: https://preprod.cardanoscan.io
```

## 🧪 Testing

### Unit Tests
```bash
# Backend services
cd backend/agents/tracking-agent && npm test
cd ../compliance-agent && npm test
cd ../settlement-agent && npm test

# Frontend
cd frontend-react && npm test

# Smart contracts
cd onchain/plutus && cabal test
```

### Integration Tests
```bash
# End-to-end workflow test
cd backend/agents/settlement-agent
npm run test:integration
```

### Manual Testing
1. Start IoT simulator
2. Connect Cardano wallet (testnet)
3. Create shipment through frontend
4. Monitor compliance dashboard
5. Execute settlement payment

## 📊 Monitoring & Logging

### Service Logs
```bash
# View logs from all services
docker-compose logs -f

# Individual service logs
cd backend/agents/tracking-agent && npm run logs
```

### Hydra Node Status
```bash
# Check Hydra head status
curl http://localhost:4001/status

# View transaction history
curl http://localhost:4001/history
```

### Blockchain Monitoring
- **Cardano Testnet Explorer**: https://testnet.cardanoscan.io
- **Transaction Tracking**: Monitor settlement transactions
- **Smart Contract Activity**: View escrow contract interactions

## 🔐 Security Considerations

### Development Environment
- Uses Cardano **preprod testnet** (free testnet ADA)
- **Real blockchain integration** via Blockfrost API
- Automatic payment monitoring every 20 seconds
- Real wallet generation using cryptographic libraries
- Get testnet ADA: https://docs.cardano.org/cardano-testnet/tools/faucet/
- HTTPS required for production deployment

### Production Checklist
- [ ] Get Blockfrost mainnet API key (https://blockfrost.io/)
- [ ] Update CARDANO_NETWORK=mainnet in all services
- [ ] Implement proper key management (HSM/KMS for wallet keys)
- [ ] Add rate limiting and authentication to all APIs
- [ ] Enable comprehensive audit logging for all transactions
- [ ] Set up blockchain transaction monitoring and alerting
- [ ] Configure payment webhook retry logic
- [ ] Implement database persistence (replace in-memory storage)
- [ ] Set up backup strategy for wallet private keys
- [ ] Conduct security audit of payment flows

## 🚀 Deployment

### Docker Production Build
```bash
# Build all services
docker-compose -f docker-compose.prod.yml build

# Deploy to production
docker-compose -f docker-compose.prod.yml up -d
```

### Cloud Deployment (Azure/AWS)
1. Configure container registry
2. Set up Kubernetes cluster
3. Deploy Cardano node infrastructure
4. Configure domain and SSL certificates
5. Set up monitoring and backup strategies

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Cardano Community** for blockchain infrastructure
- **Hydra Team** for Layer 2 scaling solutions
- **Plutus Platform** for smart contract development
- **React Team** for frontend framework
- **Node.js Community** for backend runtime

## 📞 Support

For questions, issues, or contributions:

- **GitHub Issues**: [Create an issue](https://github.com/sureshsoft09/CardanoHack_Repo/issues)
- **Documentation**: See individual service README files
- **Community**: Join Cardano developer forums

---

**Built with ❤️ for the Cardano ecosystem**

*This project demonstrates the full potential of Cardano's blockchain infrastructure in real-world IoT and logistics applications, showcasing seamless integration between traditional web technologies and cutting-edge blockchain solutions.*