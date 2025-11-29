#!/bin/bash

# Start Hydra Nodes for Smart Freight Management System
# This script sets up the complete Hydra development environment

set -e

echo "🚀 Starting Hydra nodes for Smart Freight Management..."
echo "====================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NETWORK="hydra-net"
CARDANO_MAGIC="1097911063"
KEYS_DIR="./hydra-keys"

# Create network if it doesn't exist
echo -e "${YELLOW}📡 Creating Docker network...${NC}"
docker network create $NETWORK 2>/dev/null || echo "Network $NETWORK already exists"

# Create keys directory
echo -e "${YELLOW}🔑 Setting up keys directory...${NC}"
mkdir -p $KEYS_DIR

# Check if keys exist, generate if needed
if [ ! -f "$KEYS_DIR/settlement.sk" ]; then
    echo -e "${YELLOW}🔐 Generating Cardano keys...${NC}"
    
    # Settlement Agent keys
    cardano-cli address key-gen \
        --verification-key-file $KEYS_DIR/settlement.vk \
        --signing-key-file $KEYS_DIR/settlement.sk
    
    # Compliance Agent keys  
    cardano-cli address key-gen \
        --verification-key-file $KEYS_DIR/compliance.vk \
        --signing-key-file $KEYS_DIR/compliance.sk
    
    echo -e "${GREEN}✅ Cardano keys generated${NC}"
fi

# Generate Hydra keys if needed (mock generation for demo)
if [ ! -f "$KEYS_DIR/hydra-settlement.sk" ]; then
    echo -e "${YELLOW}🌊 Generating Hydra keys...${NC}"
    
    # Mock Hydra key generation (replace with real hydra-node gen-hydra-key)
    echo "mock-hydra-signing-key-settlement" > $KEYS_DIR/hydra-settlement.sk
    echo "mock-hydra-verification-key-settlement" > $KEYS_DIR/hydra-settlement.vk
    echo "mock-hydra-signing-key-compliance" > $KEYS_DIR/hydra-compliance.sk  
    echo "mock-hydra-verification-key-compliance" > $KEYS_DIR/hydra-compliance.vk
    
    echo -e "${GREEN}✅ Hydra keys generated${NC}"
fi

# Get addresses for funding
SETTLEMENT_ADDR=$(cardano-cli address build \
    --payment-verification-key-file $KEYS_DIR/settlement.vk \
    --testnet-magic $CARDANO_MAGIC)

COMPLIANCE_ADDR=$(cardano-cli address build \
    --payment-verification-key-file $KEYS_DIR/compliance.vk \
    --testnet-magic $CARDANO_MAGIC)

echo -e "${YELLOW}💳 Addresses for funding:${NC}"
echo "Settlement Agent: $SETTLEMENT_ADDR"
echo "Compliance Agent: $COMPLIANCE_ADDR"
echo ""
echo -e "${YELLOW}💰 Fund these addresses with testnet ADA:${NC}"
echo "https://testnets.cardano.org/en/testnets/cardano/tools/faucet/"
echo ""

# Start Cardano node (simplified for demo)
echo -e "${YELLOW}🔗 Starting Cardano node...${NC}"
docker run -d \
    --name cardano-node \
    --network $NETWORK \
    -p 3001:3001 \
    -v cardano-data:/opt/cardano/data \
    inputoutput/cardano-node:latest \
    run \
    --config /opt/cardano/config/testnet-config.json \
    --topology /opt/cardano/config/testnet-topology.json \
    --database-path /opt/cardano/data/db \
    --socket-path /opt/cardano/data/node.socket \
    --port 3001 || echo "Cardano node already running"

# Wait for cardano-node to start
echo -e "${YELLOW}⏳ Waiting for Cardano node to start...${NC}"
sleep 5

# Start Settlement Agent Hydra node
echo -e "${YELLOW}🌊 Starting Settlement Agent Hydra node...${NC}"
docker run -d \
    --name hydra-settlement \
    --network $NETWORK \
    -p 4001:4001 \
    -p 5001:5001 \
    -v $(pwd)/$KEYS_DIR:/keys:ro \
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
    --testnet-magic $CARDANO_MAGIC || echo "Settlement Hydra node already running"

# Start Compliance Agent Hydra node
echo -e "${YELLOW}🌊 Starting Compliance Agent Hydra node...${NC}"
docker run -d \
    --name hydra-compliance \
    --network $NETWORK \
    -p 4002:4002 \
    -p 5002:5002 \
    -v $(pwd)/$KEYS_DIR:/keys:ro \
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
    --testnet-magic $CARDANO_MAGIC || echo "Compliance Hydra node already running"

# Wait for nodes to start
echo -e "${YELLOW}⏳ Waiting for Hydra nodes to initialize...${NC}"
sleep 10

# Check node status
echo -e "${YELLOW}📊 Checking node status...${NC}"
echo "Settlement node API: http://localhost:4001"
echo "Compliance node API: http://localhost:4002"

# Test API connectivity
if curl -s http://localhost:4001/ > /dev/null; then
    echo -e "${GREEN}✅ Settlement Agent API responding${NC}"
else
    echo -e "${RED}❌ Settlement Agent API not responding${NC}"
fi

if curl -s http://localhost:4002/ > /dev/null; then
    echo -e "${GREEN}✅ Compliance Agent API responding${NC}"
else
    echo -e "${RED}❌ Compliance Agent API not responding${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Hydra environment started successfully!${NC}"
echo "============================================"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Fund the addresses above with testnet ADA"
echo "2. Run: npm run demo"
echo "3. Watch the Hydra magic happen! ⚡"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "• View logs: npm run docker:logs"
echo "• Stop nodes: npm run docker:stop"
echo "• Monitor status: watch curl -s http://localhost:4001/"