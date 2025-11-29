#!/bin/bash

# Stop Hydra Nodes for Smart Freight Management System

set -e

echo "🛑 Stopping Hydra nodes for Smart Freight Management..."
echo "======================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Stop and remove containers
echo -e "${YELLOW}🔌 Stopping containers...${NC}"

# Stop Hydra nodes
docker stop hydra-settlement 2>/dev/null || echo "Settlement node not running"
docker stop hydra-compliance 2>/dev/null || echo "Compliance node not running"
docker stop cardano-node 2>/dev/null || echo "Cardano node not running"

# Remove containers
docker rm hydra-settlement 2>/dev/null || echo "Settlement container not found"
docker rm hydra-compliance 2>/dev/null || echo "Compliance container not found"
docker rm cardano-node 2>/dev/null || echo "Cardano container not found"

# Remove network
echo -e "${YELLOW}📡 Removing network...${NC}"
docker network rm hydra-net 2>/dev/null || echo "Network not found"

echo -e "${GREEN}✅ All Hydra nodes stopped and cleaned up${NC}"
echo ""
echo -e "${YELLOW}📋 Cleanup complete:${NC}"
echo "• All containers stopped and removed"
echo "• Network removed"
echo "• Keys preserved in ./hydra-keys/"
echo ""
echo -e "${YELLOW}To restart:${NC}"
echo "npm run docker:start"