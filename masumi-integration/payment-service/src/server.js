const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const dotenv = require('dotenv');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const crypto = require('crypto');
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4001;

// Cardano Blockchain Configuration
const CARDANO_CONFIG = {
  blockfrostUrl: process.env.CARDANO_NETWORK === 'mainnet' 
    ? 'https://cardano-mainnet.blockfrost.io/api/v0'
    : 'https://cardano-preprod.blockfrost.io/api/v0',
  blockfrostApiKey: process.env.BLOCKFROST_API_KEY || 'preprodYourBlockfrostKeyHere',
  webhookSecret: process.env.WEBHOOK_SECRET || 'webhook_secret_placeholder',
  network: process.env.CARDANO_NETWORK || 'testnet',
  minConfirmations: parseInt(process.env.MIN_CONFIRMATIONS) || 1
};

// In-memory storage for invoices and payments
// TODO: Replace with PostgreSQL or MongoDB for production
// Example: Use mongoose or pg for persistent storage
const invoices = new Map();
const payments = new Map();
const wallets = new Map(); // Store wallet addresses for invoices

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Webhook-Signature']
}));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
});

// Validation schemas
const createInvoiceSchema = Joi.object({
  recipientAddress: Joi.string().required(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().valid('ADA', 'LOVELACE').default('ADA'),
  description: Joi.string().required(),
  dueDate: Joi.date().iso().optional(),
  metadata: Joi.object({
    shipmentId: Joi.string().optional(),
    violationId: Joi.string().optional(),
    invoiceId: Joi.string().optional(),
    complianceAgentId: Joi.string().optional()
  }).optional(),
  webhookUrl: Joi.string().uri().optional()
});

const webhookSchema = Joi.object({
  event: Joi.string().valid('payment.confirmed', 'payment.failed', 'payment.pending').required(),
  invoiceId: Joi.string().required(),
  transactionHash: Joi.string().optional(),
  amount: Joi.number().positive().required(),
  currency: Joi.string().required(),
  timestamp: Joi.date().iso().required(),
  blockHeight: Joi.number().positive().optional(),
  confirmations: Joi.number().min(0).optional(),
  metadata: Joi.object().optional()
});

// Utility functions
function generateWalletAddress() {
  try {
    // Generate a new private key
    const privateKey = CardanoWasm.PrivateKey.generate_ed25519();
    const publicKey = privateKey.to_public();
    
    // Create stake key
    const stakePrivateKey = CardanoWasm.PrivateKey.generate_ed25519();
    const stakePublicKey = stakePrivateKey.to_public();
    
    // Build payment and stake credentials
    const paymentKeyHash = publicKey.hash();
    const stakeKeyHash = stakePublicKey.hash();
    
    const paymentCredential = CardanoWasm.Credential.from_keyhash(paymentKeyHash);
    const stakeCredential = CardanoWasm.Credential.from_keyhash(stakeKeyHash);
    
    // Create base address
    const networkId = CARDANO_CONFIG.network === 'mainnet' 
      ? CardanoWasm.NetworkInfo.mainnet().network_id()
      : CardanoWasm.NetworkInfo.testnet_preprod().network_id();
    
    const baseAddress = CardanoWasm.BaseAddress.new(
      networkId,
      paymentCredential,
      stakeCredential
    );
    
    const address = baseAddress.to_address().to_bech32();
    
    // Store private keys (in production, use secure key management)
    wallets.set(address, {
      address,
      privateKey: Buffer.from(privateKey.as_bytes()).toString('hex'),
      stakePrivateKey: Buffer.from(stakePrivateKey.as_bytes()).toString('hex'),
      createdAt: new Date()
    });
    
    return address;
  } catch (error) {
    logger.error('Failed to generate wallet address', { error: error.message });
    throw error;
  }
}

function convertAdaToLovelace(ada) {
  return Math.floor(ada * 1000000); // 1 ADA = 1,000,000 Lovelace
}

function convertLovelaceToAda(lovelace) {
  return lovelace / 1000000;
}

function validateWebhookSignature(payload, signature, secret) {
  // TODO: Implement actual Masumi webhook signature validation
  // Example: return MasumiSDK.validateWebhook(payload, signature, secret);
  
  // Mock validation for now
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}

// Cardano Blockfrost API integration
async function callBlockfrostAPI(endpoint, method = 'GET', data = null) {
  try {
    const url = `${CARDANO_CONFIG.blockfrostUrl}${endpoint}`;
    
    logger.debug('Calling Blockfrost API', {
      endpoint: url,
      method
    });

    const config = {
      method,
      url,
      headers: {
        'project_id': CARDANO_CONFIG.blockfrostApiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    logger.error('Blockfrost API call failed', {
      endpoint,
      method,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });

    return {
      success: false,
      error: error.response?.data?.message || error.message,
      status: error.response?.status
    };
  }
}

// Check transaction status on blockchain
async function checkTransactionStatus(txHash) {
  try {
    const result = await callBlockfrostAPI(`/txs/${txHash}`);
    
    if (!result.success) {
      return { found: false, error: result.error };
    }
    
    const tx = result.data;
    
    // Get latest block for confirmations
    const blockResult = await callBlockfrostAPI('/blocks/latest');
    const currentBlock = blockResult.success ? blockResult.data.height : 0;
    
    const confirmations = tx.block_height ? currentBlock - tx.block_height : 0;
    
    return {
      found: true,
      hash: tx.hash,
      blockHeight: tx.block_height,
      blockTime: tx.block_time,
      confirmations,
      outputAmount: tx.output_amount,
      fees: tx.fees,
      slot: tx.slot
    };
  } catch (error) {
    logger.error('Failed to check transaction status', {
      txHash,
      error: error.message
    });
    return { found: false, error: error.message };
  }
}

// Monitor address for incoming payments
async function checkAddressBalance(address) {
  try {
    const result = await callBlockfrostAPI(`/addresses/${address}`);
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    const addressData = result.data;
    const totalReceived = addressData.amount.reduce((sum, asset) => {
      if (asset.unit === 'lovelace') {
        return sum + parseInt(asset.quantity);
      }
      return sum;
    }, 0);
    
    // Get transaction history
    const txResult = await callBlockfrostAPI(`/addresses/${address}/transactions?order=desc`);
    const transactions = txResult.success ? txResult.data : [];
    
    return {
      success: true,
      address,
      totalReceived,
      transactions: transactions.slice(0, 10) // Last 10 transactions
    };
  } catch (error) {
    logger.error('Failed to check address balance', {
      address,
      error: error.message
    });
    return { success: false, error: error.message };
  }
}

async function createCardanoPaymentRequest(invoiceData) {
  // Generate a unique payment address for this invoice
  const paymentAddress = generateWalletAddress();
  
  const paymentRequest = {
    paymentId: uuidv4(),
    paymentAddress,
    amount: invoiceData.amountLovelace,
    currency: 'LOVELACE',
    description: invoiceData.description,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    qrCode: `web+cardano:${paymentAddress}?amount=${invoiceData.amountLovelace}`,
    deepLink: `https://wallet.cardano.org/pay?address=${paymentAddress}&amount=${invoiceData.amountLovelace}`
  };

  logger.info('Cardano payment request created', {
    paymentId: paymentRequest.paymentId,
    paymentAddress,
    amountLovelace: invoiceData.amountLovelace,
    amountAda: convertLovelaceToAda(invoiceData.amountLovelace)
  });
  
  // Start monitoring this address for payments (in background)
  startPaymentMonitoring(paymentRequest.paymentId, paymentAddress, invoiceData.amountLovelace, invoiceData.invoiceId);

  return paymentRequest;
}

// Background payment monitoring
const monitoringIntervals = new Map();

function startPaymentMonitoring(paymentId, address, expectedAmount, invoiceId) {
  // Check every 20 seconds for new transactions
  const intervalId = setInterval(async () => {
    try {
      const invoice = invoices.get(invoiceId);
      
      // Stop monitoring if invoice is paid, failed, or expired
      if (!invoice || invoice.status !== 'pending') {
        clearInterval(intervalId);
        monitoringIntervals.delete(paymentId);
        logger.info('Stopped payment monitoring', { paymentId, invoiceId, status: invoice?.status });
        return;
      }
      
      // Check if invoice expired
      if (invoice.expiresAt && new Date() > new Date(invoice.expiresAt)) {
        invoice.status = 'expired';
        invoice.updatedAt = new Date();
        clearInterval(intervalId);
        monitoringIntervals.delete(paymentId);
        logger.info('Invoice expired', { invoiceId, paymentId });
        return;
      }
      
      // Check address for payments
      const balanceCheck = await checkAddressBalance(address);
      
      if (balanceCheck.success && balanceCheck.totalReceived >= expectedAmount) {
        // Payment received! Get transaction details
        if (balanceCheck.transactions && balanceCheck.transactions.length > 0) {
          const latestTx = balanceCheck.transactions[0];
          const txDetails = await checkTransactionStatus(latestTx.tx_hash);
          
          if (txDetails.found && txDetails.confirmations >= CARDANO_CONFIG.minConfirmations) {
            // Update invoice to paid
            invoice.status = 'paid';
            invoice.transactionHash = latestTx.tx_hash;
            invoice.blockHeight = txDetails.blockHeight;
            invoice.confirmations = txDetails.confirmations;
            invoice.paidAt = new Date(txDetails.blockTime * 1000);
            invoice.updatedAt = new Date();
            
            logger.info('Payment confirmed on blockchain', {
              invoiceId,
              paymentId,
              txHash: latestTx.tx_hash,
              confirmations: txDetails.confirmations,
              amount: balanceCheck.totalReceived
            });
            
            // Stop monitoring
            clearInterval(intervalId);
            monitoringIntervals.delete(paymentId);
            
            // Trigger webhook if configured
            if (invoice.webhookUrl) {
              triggerPaymentWebhook(invoice, 'payment.confirmed', latestTx.tx_hash);
            }
          } else {
            logger.debug('Payment received but waiting for confirmations', {
              invoiceId,
              txHash: latestTx.tx_hash,
              confirmations: txDetails.confirmations,
              required: CARDANO_CONFIG.minConfirmations
            });
          }
        }
      }
    } catch (error) {
      logger.error('Payment monitoring error', {
        paymentId,
        invoiceId,
        error: error.message
      });
    }
  }, 20000); // Check every 20 seconds
  
  monitoringIntervals.set(paymentId, intervalId);
  logger.info('Started payment monitoring', { paymentId, address, expectedAmount });
}

// Trigger webhook notification
async function triggerPaymentWebhook(invoice, event, transactionHash) {
  try {
    await axios.post(invoice.webhookUrl, {
      event,
      invoice: {
        invoiceId: invoice.invoiceId,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status
      },
      payment: {
        transactionHash,
        blockHeight: invoice.blockHeight,
        confirmations: invoice.confirmations,
        paidAt: invoice.paidAt
      },
      timestamp: new Date().toISOString()
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Cardano-Payment-Service/1.0'
      }
    });
    
    logger.info('Webhook notification sent', {
      invoiceId: invoice.invoiceId,
      webhookUrl: invoice.webhookUrl,
      event
    });
  } catch (error) {
    logger.error('Failed to send webhook notification', {
      invoiceId: invoice.invoiceId,
      webhookUrl: invoice.webhookUrl,
      error: error.message
    });
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  // Test Blockfrost connection
  const blockfrostHealth = await callBlockfrostAPI('/health');
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'cardano-payment-service',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    cardano: {
      blockfrostUrl: CARDANO_CONFIG.blockfrostUrl,
      network: CARDANO_CONFIG.network,
      connected: blockfrostHealth.success,
      minConfirmations: CARDANO_CONFIG.minConfirmations
    },
    stats: {
      totalInvoices: invoices.size,
      totalPayments: payments.size,
      activeInvoices: Array.from(invoices.values()).filter(inv => inv.status === 'pending').length,
      activeMonitors: monitoringIntervals.size
    }
  });
});

// Create invoice endpoint
app.post('/invoice/create', async (req, res, next) => {
  try {
    // Validate request body
    const { error, value } = createInvoiceSchema.validate(req.body, {
      abortEarly: false,
      convert: true
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details.map(detail => detail.message).join('; '),
        timestamp: new Date().toISOString()
      });
    }

    const invoiceData = value;
    const invoiceId = uuidv4();
    
    // Convert ADA to Lovelace if needed
    const amountLovelace = invoiceData.currency === 'ADA' 
      ? convertAdaToLovelace(invoiceData.amount)
      : invoiceData.amount;

    logger.info('Creating invoice', {
      invoiceId,
      amount: invoiceData.amount,
      currency: invoiceData.currency,
      recipient: invoiceData.recipientAddress,
      description: invoiceData.description
    });

    // Create Cardano payment request and start monitoring
    const paymentRequest = await createCardanoPaymentRequest({
      ...invoiceData,
      amountLovelace,
      invoiceId
    });

    // Create invoice object
    const invoice = {
      invoiceId,
      recipientAddress: invoiceData.recipientAddress,
      amount: invoiceData.amount,
      amountLovelace,
      currency: invoiceData.currency,
      description: invoiceData.description,
      dueDate: invoiceData.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      metadata: invoiceData.metadata || {},
      webhookUrl: invoiceData.webhookUrl,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Masumi payment details
      paymentId: paymentRequest.paymentId,
      paymentAddress: paymentRequest.paymentAddress,
      expiresAt: paymentRequest.expiresAt,
      qrCode: paymentRequest.qrCode,
      deepLink: paymentRequest.deepLink,
      
      // Payment tracking
      transactionHash: null,
      blockHeight: null,
      confirmations: 0,
      paidAt: null
    };

    // Store invoice
    invoices.set(invoiceId, invoice);

    logger.info('Invoice created successfully', {
      invoiceId,
      paymentId: paymentRequest.paymentId,
      paymentAddress: paymentRequest.paymentAddress
    });

    // Return invoice response (excluding sensitive data)
    res.status(201).json({
      invoiceId: invoice.invoiceId,
      amount: invoice.amount,
      currency: invoice.currency,
      description: invoice.description,
      status: invoice.status,
      dueDate: invoice.dueDate,
      createdAt: invoice.createdAt,
      
      // Payment information for client
      payment: {
        paymentId: invoice.paymentId,
        paymentAddress: invoice.paymentAddress,
        amountLovelace: invoice.amountLovelace,
        expiresAt: invoice.expiresAt,
        qrCode: invoice.qrCode,
        deepLink: invoice.deepLink
      },
      
      metadata: invoice.metadata
    });

  } catch (error) {
    next(error);
  }
});

// Get invoice by ID
app.get('/invoices/:id', (req, res) => {
  const { id } = req.params;
  const invoice = invoices.get(id);
  
  if (!invoice) {
    return res.status(404).json({
      error: 'Invoice Not Found',
      message: `No invoice found with ID: ${id}`,
      timestamp: new Date().toISOString()
    });
  }
  
  logger.info('Invoice retrieved', {
    invoiceId: id,
    status: invoice.status,
    amount: invoice.amount
  });
  
  // Return full invoice details
  res.json(invoice);
});

// List all invoices (with pagination)
app.get('/invoices', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const status = req.query.status;
  
  let allInvoices = Array.from(invoices.values());
  
  // Filter by status if provided
  if (status) {
    allInvoices = allInvoices.filter(invoice => invoice.status === status);
  }
  
  // Sort by creation date (newest first)
  allInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Apply pagination
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedInvoices = allInvoices.slice(startIndex, endIndex);
  
  res.json({
    invoices: paginatedInvoices,
    pagination: {
      page,
      limit,
      total: allInvoices.length,
      totalPages: Math.ceil(allInvoices.length / limit),
      hasNext: endIndex < allInvoices.length,
      hasPrev: page > 1
    },
    timestamp: new Date().toISOString()
  });
});

// Payment webhook endpoint
app.post('/payment/webhook', async (req, res, next) => {
  try {
    const signature = req.get('X-Webhook-Signature');
    const payload = req.body;
    
    // Validate webhook signature
    if (!validateWebhookSignature(payload, signature, CARDANO_CONFIG.webhookSecret)) {
      logger.warn('Invalid webhook signature', {
        signature,
        expectedSecret: CARDANO_CONFIG.webhookSecret.substring(0, 8) + '...'
      });
      
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook signature',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate webhook payload
    const { error, value } = webhookSchema.validate(payload, {
      abortEarly: false,
      convert: true
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.details.map(detail => detail.message).join('; '),
        timestamp: new Date().toISOString()
      });
    }

    const webhookData = value;
    const { event, invoiceId, transactionHash, amount, currency, timestamp, blockHeight, confirmations } = webhookData;

    logger.info('Webhook received', {
      event,
      invoiceId,
      transactionHash,
      amount,
      confirmations
    });

    // Find the invoice
    const invoice = invoices.get(invoiceId);
    if (!invoice) {
      logger.warn('Webhook for unknown invoice', { invoiceId });
      return res.status(404).json({
        error: 'Invoice Not Found',
        message: `No invoice found with ID: ${invoiceId}`,
        timestamp: new Date().toISOString()
      });
    }

    // Process webhook event
    switch (event) {
      case 'payment.confirmed':
        invoice.status = 'paid';
        invoice.transactionHash = transactionHash;
        invoice.blockHeight = blockHeight;
        invoice.confirmations = confirmations || 0;
        invoice.paidAt = new Date(timestamp);
        invoice.updatedAt = new Date();
        
        logger.info('Payment confirmed', {
          invoiceId,
          transactionHash,
          amount,
          blockHeight
        });
        
        // TODO: Notify compliance agent or settlement agent
        // await notifyComplianceAgent(invoice);
        
        break;
        
      case 'payment.failed':
        invoice.status = 'failed';
        invoice.updatedAt = new Date();
        
        logger.warn('Payment failed', {
          invoiceId,
          reason: webhookData.metadata?.reason || 'Unknown'
        });
        
        break;
        
      case 'payment.pending':
        invoice.status = 'pending';
        invoice.transactionHash = transactionHash;
        invoice.confirmations = confirmations || 0;
        invoice.updatedAt = new Date();
        
        logger.info('Payment pending confirmation', {
          invoiceId,
          transactionHash,
          confirmations
        });
        
        break;
        
      default:
        logger.warn('Unknown webhook event', { event });
        return res.status(400).json({
          error: 'Unknown Event',
          message: `Unknown webhook event: ${event}`,
          timestamp: new Date().toISOString()
        });
    }

    // Store payment record
    const paymentRecord = {
      paymentId: uuidv4(),
      invoiceId,
      event,
      transactionHash,
      amount,
      currency,
      timestamp: new Date(timestamp),
      blockHeight,
      confirmations,
      metadata: webhookData.metadata || {},
      processedAt: new Date()
    };
    
    payments.set(paymentRecord.paymentId, paymentRecord);

    // Call webhook URL if configured
    if (invoice.webhookUrl && (event === 'payment.confirmed' || event === 'payment.failed')) {
      try {
        await axios.post(invoice.webhookUrl, {
          event,
          invoice: {
            invoiceId: invoice.invoiceId,
            amount: invoice.amount,
            currency: invoice.currency,
            status: invoice.status
          },
          payment: paymentRecord,
          timestamp: new Date().toISOString()
        }, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Masumi-Payment-Service/1.0'
          }
        });
        
        logger.info('Webhook notification sent', {
          invoiceId,
          webhookUrl: invoice.webhookUrl,
          event
        });
        
      } catch (webhookError) {
        logger.error('Failed to send webhook notification', {
          invoiceId,
          webhookUrl: invoice.webhookUrl,
          error: webhookError.message
        });
      }
    }

    res.status(200).json({
      message: 'Webhook processed successfully',
      invoiceId,
      event,
      status: invoice.status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
});

// Update invoice status (for manual testing)
app.put('/invoices/:id/status', (req, res) => {
  const { id } = req.params;
  const { status, transactionHash } = req.body;
  
  const invoice = invoices.get(id);
  if (!invoice) {
    return res.status(404).json({
      error: 'Invoice Not Found',
      message: `No invoice found with ID: ${id}`,
      timestamp: new Date().toISOString()
    });
  }
  
  const validStatuses = ['pending', 'paid', 'failed', 'expired', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      error: 'Invalid Status',
      message: `Status must be one of: ${validStatuses.join(', ')}`,
      timestamp: new Date().toISOString()
    });
  }
  
  invoice.status = status;
  invoice.updatedAt = new Date();
  
  if (status === 'paid' && transactionHash) {
    invoice.transactionHash = transactionHash;
    invoice.paidAt = new Date();
  }
  
  logger.info('Invoice status updated', {
    invoiceId: id,
    newStatus: status,
    transactionHash
  });
  
  res.json({
    message: 'Invoice status updated successfully',
    invoice
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Stop all payment monitoring intervals
  for (const [paymentId, intervalId] of monitoringIntervals.entries()) {
    clearInterval(intervalId);
    logger.info('Stopped monitoring', { paymentId });
  }
  monitoringIntervals.clear();
  
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Stop all payment monitoring intervals
  for (const [paymentId, intervalId] of monitoringIntervals.entries()) {
    clearInterval(intervalId);
  }
  monitoringIntervals.clear();
  
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Cardano Payment Service started on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    blockfrostUrl: CARDANO_CONFIG.blockfrostUrl,
    cardanoNetwork: CARDANO_CONFIG.network,
    minConfirmations: CARDANO_CONFIG.minConfirmations
  });
});

module.exports = app;