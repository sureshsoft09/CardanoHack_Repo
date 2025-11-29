# Smart Freight Management System

A comprehensive blockchain-powered freight management system built on Cardano, featuring IoT integration, Layer 2 scaling with Hydra, and automated compliance monitoring.

## 🚀 Overview

This project demonstrates a complete end-to-end freight management solution that leverages Cardano's blockchain infrastructure for secure, transparent, and automated logistics operations. The system integrates IoT sensors, smart contracts, Layer 2 scaling, and modern web technologies to create a production-ready freight management platform.

## 🏗️ Architecture

```
┌─────────────────┬─────────────────┬─────────────────┐
│   Frontend      │   Backend       │   Blockchain    │
│                 │                 │                 │
│ React + Wallet  │ Node.js APIs    │ Plutus V2       │
│ Integration     │ TypeScript      │ Smart Contracts │
│                 │ Microservices   │                 │
├─────────────────┼─────────────────┼─────────────────┤
│ • Nami/Eternl   │ • Tracking      │ • Escrow        │
│ • Payment UI    │ • Compliance    │ • Validation    │
│ • Real-time     │ • Settlement    │ • Cardano       │
│   Dashboard     │ • IoT Gateway   │   Integration   │
└─────────────────┴─────────────────┴─────────────────┘
                           │
                    ┌─────────────┐
                    │  Hydra L2   │
                    │  Scaling    │
                    └─────────────┘
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
├── frontend-react/                 # React web application
├── masumi-integration/             # Cardano payment processing
│   ├── payment-service/            # Payment endpoints and webhooks
│   └── agent-registration/         # Agent management
└── onchain/
    ├── plutus/                     # Haskell smart contracts
    └── hydra/                      # Layer 2 scaling integration
```

## ✨ Key Features

### 🔗 Blockchain Integration
- **Plutus V2 Smart Contracts**: Shipment escrow with cryptographic validation
- **Cardano Wallet Support**: Nami, Eternl, and testnet compatibility
- **Hydra Layer 2**: Fast, low-cost off-chain payments with instant finality
- **On-chain Settlement**: Automatic mainnet settlement for large transactions

### 🌐 Microservices Architecture
- **Tracking Agent**: Real-time shipment location and status tracking
- **Compliance Agent**: Automated rule enforcement and anomaly detection
- **Settlement Agent**: Orchestrates Hydra payments and on-chain settlement
- **Digital Twin Service**: Unified API gateway with caching and aggregation

### 📱 Modern Frontend
- **React Application**: Responsive design with real-time updates
- **Multi-Wallet Support**: Connect with popular Cardano wallets
- **Payment Interface**: Dual payment methods (Hydra L2 + On-chain)
- **Dashboard**: Live IoT data visualization and shipment tracking

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
   
   # Payment service
   cd masumi-integration/payment-service && npm install && cd ../..
   ```

3. **Start development environment:**
   ```bash
   # Start Hydra nodes (Layer 2)
   cd onchain/hydra
   docker-compose up -d
   
   # Start backend services
   cd ../../backend/agents/tracking-agent && npm run dev &
   cd ../compliance-agent && npm run dev &
   cd ../settlement-agent && npm run dev &
   
   # Start frontend
   cd ../../frontend-react && npm start
   ```

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Tracking API: http://localhost:3001
   - Compliance API: http://localhost:3002
   - Settlement API: http://localhost:3003

## 🔧 Configuration

### Environment Variables

Create `.env` files in each service directory:

**Backend Services (.env):**
```env
PORT=3001
NODE_ENV=development
CARDANO_NETWORK=testnet
HYDRA_NODE_URL=ws://localhost:4001
LOG_LEVEL=info
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

### 3. Hydra Payment Flow

```javascript
const hydraClient = new SmartFreightHydraClient();
await hydraClient.initialize();

// Execute micro-payment
await hydraClient.executePayment({
    shipmentId: 'SHIP-001',
    amount: 1000000, // 1 ADA in lovelace
    recipient: 'addr_test1...'
});
```

### 4. Frontend Wallet Integration

```javascript
// Connect wallet
const { connectWallet, payInvoice } = useCardanoWallet();
await connectWallet('nami');

// Execute payment
await payInvoice({
    amount: 5000000, // 5 ADA
    recipient: 'addr_test1...',
    shipmentId: 'SHIP-001'
});
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
- All examples use Cardano **testnet** (no real funds)
- Mock implementations for payment processing
- Local key generation for Hydra nodes
- HTTPS recommended for production deployment

### Production Checklist
- [ ] Migrate to Cardano mainnet
- [ ] Implement proper key management (HSM/KMS)
- [ ] Add rate limiting and authentication
- [ ] Enable comprehensive audit logging
- [ ] Configure monitoring and alerting
- [ ] Conduct security audit of smart contracts

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