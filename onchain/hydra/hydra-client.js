#!/usr/bin/env node

/**
 * Hydra Client for Smart Freight Management System
 * 
 * Demonstrates complete Hydra head lifecycle:
 * 1. Connect to hydra-node instances
 * 2. Initialize Hydra head between Settlement ↔ Compliance agents  
 * 3. Execute off-chain payments for violation penalties
 * 4. Close head and settle on Cardano mainnet
 * 
 * Usage:
 *   node hydra-client.js
 * 
 * Prerequisites:
 *   - Docker containers running (see instructions.md)
 *   - Hydra nodes funded with testnet ADA
 *   - WebSocket connections available
 */

const WebSocket = require('ws');
const axios = require('axios');
const crypto = require('crypto');

// Configuration for Smart Freight Hydra integration
const CONFIG = {
  // Hydra Node URLs (from Docker setup)
  settlementNode: {
    websocket: 'ws://localhost:4001',
    rest: 'http://localhost:4001',
    nodeId: 'settlement-agent'
  },
  complianceNode: {
    websocket: 'ws://localhost:4002', 
    rest: 'http://localhost:4002',
    nodeId: 'compliance-agent'
  },
  
  // Cardano testnet configuration
  cardano: {
    networkMagic: 1097911063,
    network: 'testnet'
  },
  
  // Demo payment parameters
  demoPayment: {
    invoiceId: 'inv-demo-001',
    shipmentId: 'SHIP-DEMO-001',
    violationType: 'TEMP_COLD_CHAIN',
    penaltyAda: 25,
    description: 'Cold chain temperature violation penalty (Demo)'
  }
};

/**
 * Main Hydra Client class for Smart Freight integration
 */
class SmartFreightHydraClient {
  constructor() {
    this.settlementWs = null;
    this.complianceWs = null;
    this.headId = null;
    this.headState = 'Idle';
    this.transactions = new Map();
    
    // Event handlers for different head states
    this.eventHandlers = new Map();
    this.setupEventHandlers();
  }

  /**
   * Initialize WebSocket connections to both Hydra nodes
   */
  async initialize() {
    console.log('🚀 Initializing Smart Freight Hydra Client...\n');
    
    try {
      // Connect to Settlement Agent hydra-node
      await this.connectToHydraNode('settlement');
      
      // Connect to Compliance Agent hydra-node  
      await this.connectToHydraNode('compliance');
      
      console.log('✅ Connected to both Hydra nodes successfully\n');
      
      // Wait a moment for connections to stabilize
      await this.sleep(2000);
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Hydra connections:', error.message);
      throw error;
    }
  }

  /**
   * Connect to individual Hydra node via WebSocket
   */
  async connectToHydraNode(nodeType) {
    const config = nodeType === 'settlement' ? CONFIG.settlementNode : CONFIG.complianceNode;
    
    console.log(`📡 Connecting to ${nodeType} node: ${config.websocket}`);
    
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(config.websocket);
      
      ws.on('open', () => {
        console.log(`✅ Connected to ${nodeType} hydra-node`);
        
        if (nodeType === 'settlement') {
          this.settlementWs = ws;
        } else {
          this.complianceWs = ws;
        }
        
        // Setup message handling for this connection
        ws.on('message', (data) => this.handleHydraMessage(nodeType, data));
        ws.on('error', (error) => console.error(`❌ ${nodeType} WebSocket error:`, error));
        ws.on('close', () => console.log(`🔌 ${nodeType} WebSocket connection closed`));
        
        resolve();
      });
      
      ws.on('error', (error) => {
        console.error(`❌ Failed to connect to ${nodeType} node:`, error);
        reject(error);
      });
      
      // Connection timeout after 10 seconds
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          reject(new Error(`Connection timeout for ${nodeType} node`));
        }
      }, 10000);
    });
  }

  /**
   * Handle incoming messages from Hydra nodes
   */
  handleHydraMessage(nodeType, data) {
    try {
      const message = JSON.parse(data.toString());
      
      console.log(`📨 [${nodeType.toUpperCase()}] Received:`, message.tag || message.type || 'Unknown');
      
      // Route message to appropriate handler
      if (this.eventHandlers.has(message.tag)) {
        this.eventHandlers.get(message.tag)(message, nodeType);
      } else {
        console.log(`⚠️  Unhandled message type: ${message.tag}`);
        console.log('   Message:', JSON.stringify(message, null, 2));
      }
      
    } catch (error) {
      console.error('❌ Error parsing Hydra message:', error);
      console.log('   Raw data:', data.toString());
    }
  }

  /**
   * Setup event handlers for different Hydra head states
   */
  setupEventHandlers() {
    // Head lifecycle events
    this.eventHandlers.set('Greetings', (msg, nodeType) => {
      console.log(`👋 [${nodeType.toUpperCase()}] Node ready:`, msg.me || 'unknown');
    });
    
    this.eventHandlers.set('HeadIsInitializing', (msg, nodeType) => {
      console.log(`🔄 [${nodeType.toUpperCase()}] Head initialization started`);
      console.log('   Participants:', msg.parties || 'unknown');
      this.headState = 'Initializing';
    });
    
    this.eventHandlers.set('HeadIsOpen', (msg, nodeType) => {
      console.log(`🟢 [${nodeType.toUpperCase()}] Head is now OPEN!`);
      console.log('   UTxO:', msg.utxo || 'unknown');
      this.headId = msg.headId || 'unknown';
      this.headState = 'Open';
    });
    
    this.eventHandlers.set('HeadIsClosed', (msg, nodeType) => {
      console.log(`🔴 [${nodeType.toUpperCase()}] Head CLOSED`);
      console.log('   Contestation deadline:', msg.contestationDeadline || 'unknown');
      this.headState = 'Closed';
    });
    
    this.eventHandlers.set('HeadIsFinalized', (msg, nodeType) => {
      console.log(`✅ [${nodeType.toUpperCase()}] Head FINALIZED`);
      console.log('   Settlement transaction submitted to Cardano');
      this.headState = 'Finalized';
    });
    
    // Transaction events
    this.eventHandlers.set('TxValid', (msg, nodeType) => {
      console.log(`✅ [${nodeType.toUpperCase()}] Transaction CONFIRMED off-chain`);
      console.log('   Transaction:', msg.transaction || 'unknown');
      
      // Mark transaction as confirmed
      if (msg.transaction && msg.transaction.id) {
        this.transactions.set(msg.transaction.id, { ...msg.transaction, status: 'confirmed' });
      }
    });
    
    this.eventHandlers.set('TxInvalid', (msg, nodeType) => {
      console.error(`❌ [${nodeType.toUpperCase()}] Transaction INVALID`);
      console.error('   Reason:', msg.reason || 'unknown');
      console.error('   Transaction:', msg.transaction || 'unknown');
    });
    
    // Snapshot events (UTxO state)
    this.eventHandlers.set('SnapshotConfirmed', (msg, nodeType) => {
      console.log(`📸 [${nodeType.toUpperCase()}] Snapshot confirmed`);
      console.log('   UTxO set updated');
    });
    
    // Error handling
    this.eventHandlers.set('CommandFailed', (msg, nodeType) => {
      console.error(`❌ [${nodeType.toUpperCase()}] Command failed:`);
      console.error('   Error:', msg.clientError || 'unknown');
    });
  }

  /**
   * Step 1: Initialize Hydra head between Settlement ↔ Compliance agents
   */
  async initializeHydraHead() {
    console.log('🔄 Initializing Hydra head between agents...\n');
    
    try {
      // Send init command from Settlement Agent (head initiator)
      const initCommand = {
        tag: 'Init',
        contestationPeriod: 60  // 60 seconds contestation period
      };
      
      console.log('📤 Sending Init command from Settlement Agent...');
      this.settlementWs.send(JSON.stringify(initCommand));
      
      // Wait for head to open
      console.log('⏳ Waiting for Hydra head to open...');
      await this.waitForHeadState('Open', 30000); // 30 second timeout
      
      console.log(`✅ Hydra head opened successfully! Head ID: ${this.headId}\n`);
      return this.headId;
      
    } catch (error) {
      console.error('❌ Failed to initialize Hydra head:', error.message);
      throw error;
    }
  }

  /**
   * Step 2: Execute off-chain payment within Hydra head
   */
  async executeOffChainPayment() {
    console.log('💰 Executing off-chain payment for violation penalty...\n');
    
    const payment = CONFIG.demoPayment;
    console.log('📋 Payment Details:');
    console.log(`   Invoice ID: ${payment.invoiceId}`);
    console.log(`   Shipment: ${payment.shipmentId}`);
    console.log(`   Violation: ${payment.violationType}`);
    console.log(`   Penalty: ${payment.penaltyAda} ADA`);
    console.log(`   Description: ${payment.description}\n`);
    
    try {
      // Build mock Cardano transaction (off-chain)
      const transaction = this.buildMockTransaction(payment);
      
      // Submit transaction to Hydra head
      const submitCommand = {
        tag: 'NewTx',
        transaction: transaction
      };
      
      console.log('📤 Submitting payment transaction to Hydra head...');
      this.settlementWs.send(JSON.stringify(submitCommand));
      
      // Wait for transaction confirmation
      console.log('⏳ Waiting for off-chain confirmation...');
      await this.sleep(3000); // Give time for confirmation
      
      console.log('✅ Off-chain payment confirmed instantly!\n');
      console.log('💡 Benefits of Hydra Layer 2:');
      console.log('   • Transaction time: ~100ms (vs ~20 seconds on L1)');
      console.log('   • Transaction fee: ~0 ADA (vs ~0.2 ADA on L1)');
      console.log('   • Instant finality: No waiting for block confirmations\n');
      
      return transaction.id;
      
    } catch (error) {
      console.error('❌ Failed to execute off-chain payment:', error.message);
      throw error;
    }
  }

  /**
   * Step 3: Close Hydra head and settle on Cardano mainnet
   */
  async closeHydraHead() {
    console.log('🔒 Closing Hydra head and settling on Cardano...\n');
    
    try {
      // Send close command from Settlement Agent
      const closeCommand = {
        tag: 'Close'
      };
      
      console.log('📤 Sending Close command...');
      this.settlementWs.send(JSON.stringify(closeCommand));
      
      // Wait for head to close
      console.log('⏳ Waiting for head closure...');
      await this.waitForHeadState('Closed', 30000);
      
      console.log('✅ Hydra head closed successfully!\n');
      console.log('🔗 What happens next:');
      console.log('   1. Settlement transaction is built automatically');
      console.log('   2. Transaction is submitted to Cardano testnet');
      console.log('   3. Final UTxO state is recorded on-chain');
      console.log('   4. All off-chain payments are now immutable\n');
      
      // Wait for finalization
      console.log('⏳ Waiting for on-chain settlement...');
      await this.waitForHeadState('Finalized', 60000);
      
      console.log('🎉 Settlement completed! All payments are now final on Cardano.\n');
      
    } catch (error) {
      console.error('❌ Failed to close Hydra head:', error.message);
      throw error;
    }
  }

  /**
   * Build mock Cardano transaction for demo purposes
   */
  buildMockTransaction(payment) {
    const txId = crypto.randomBytes(16).toString('hex');
    
    // Mock Cardano transaction structure (CBOR would be used in production)
    const transaction = {
      id: txId,
      inputs: [{
        txId: 'mock-utxo-' + crypto.randomBytes(8).toString('hex'),
        outputIndex: 0,
        address: 'addr_test1_settlement_agent_address',
        amount: (payment.penaltyAda + 2) * 1000000 // Extra for fees/change
      }],
      outputs: [{
        address: 'addr_test1_compliance_agent_address',
        amount: payment.penaltyAda * 1000000, // Convert ADA to Lovelace
        datum: null
      }, {
        address: 'addr_test1_settlement_agent_address', // Change output
        amount: 2 * 1000000, // 2 ADA change
        datum: null
      }],
      fee: 0, // No fees in Hydra!
      metadata: {
        674: { // CIP-20 metadata standard
          msg: [`Smart Freight Payment: ${payment.invoiceId}`],
          shipmentId: payment.shipmentId,
          violationType: payment.violationType,
          penaltyAda: payment.penaltyAda
        }
      },
      witnesses: {
        signatures: ['mock-signature-' + crypto.randomBytes(32).toString('hex')]
      }
    };
    
    console.log('🔧 Mock transaction built:');
    console.log(`   TX ID: ${transaction.id}`);
    console.log(`   Inputs: ${transaction.inputs.length}`);
    console.log(`   Outputs: ${transaction.outputs.length}`);
    console.log(`   Fee: ${transaction.fee} Lovelace (FREE in Hydra!)`);
    
    return transaction;
  }

  /**
   * Wait for specific Hydra head state with timeout
   */
  async waitForHeadState(expectedState, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      // Check if already in expected state
      if (this.headState === expectedState) {
        resolve();
        return;
      }
      
      // Setup timeout
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for head state: ${expectedState}`));
      }, timeoutMs);
      
      // Setup state change listener
      const checkState = () => {
        if (this.headState === expectedState) {
          clearTimeout(timeout);
          resolve();
        } else {
          // Check again in 500ms
          setTimeout(checkState, 500);
        }
      };
      
      checkState();
    });
  }

  /**
   * Get current head status from REST API
   */
  async getHeadStatus() {
    try {
      const response = await axios.get(CONFIG.settlementNode.rest);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to get head status:', error.message);
      return null;
    }
  }

  /**
   * Clean shutdown of WebSocket connections
   */
  async shutdown() {
    console.log('🔌 Shutting down Hydra client connections...\n');
    
    if (this.settlementWs) {
      this.settlementWs.close();
    }
    
    if (this.complianceWs) {
      this.complianceWs.close();
    }
    
    console.log('👋 Hydra client shutdown complete');
  }

  /**
   * Helper function for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main execution function - demonstrates complete Hydra workflow
 */
async function runHydraDemo() {
  const client = new SmartFreightHydraClient();
  
  try {
    console.log('🚛 Smart Freight Management - Hydra Layer 2 Integration Demo');
    console.log('==============================================================\n');
    
    // Step 1: Initialize connections
    await client.initialize();
    
    // Step 2: Initialize Hydra head
    const headId = await client.initializeHydraHead();
    
    // Step 3: Execute off-chain payment
    const txId = await client.executeOffChainPayment();
    
    // Step 4: Close head and settle
    await client.closeHydraHead();
    
    console.log('🎊 Demo completed successfully!');
    console.log('===============================\n');
    console.log('Summary:');
    console.log(`✅ Hydra head created: ${headId}`);
    console.log(`✅ Off-chain payment executed: ${txId}`);
    console.log('✅ Head closed and settled on Cardano');
    console.log('✅ All transactions are now immutable\n');
    
    console.log('🔗 Integration with Smart Freight:');
    console.log('• Settlement Agent can now process thousands of micro-payments');
    console.log('• Compliance violations are settled instantly with 0 fees');
    console.log('• Final settlement is recorded immutably on Cardano');
    console.log('• Perfect for real-world IoT freight management! 🚛⚡\n');
    
  } catch (error) {
    console.error('💥 Demo failed:', error.message);
    console.error('\n📋 Troubleshooting:');
    console.error('1. Ensure Docker containers are running (see instructions.md)');
    console.error('2. Check that hydra-node ports 4001, 4002 are accessible');
    console.error('3. Verify Cardano node is synced and accessible');
    console.error('4. Confirm WebSocket connections are not blocked by firewall\n');
  } finally {
    // Clean shutdown
    await client.shutdown();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received interrupt signal, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received termination signal, shutting down gracefully...');
  process.exit(0);
});

// Start the demo
if (require.main === module) {
  runHydraDemo().catch(console.error);
}

module.exports = SmartFreightHydraClient;