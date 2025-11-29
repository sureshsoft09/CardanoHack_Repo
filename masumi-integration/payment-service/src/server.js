const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const dotenv = require('dotenv');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const crypto = require('crypto');

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

// Masumi Configuration
const MASUMI_CONFIG = {
  apiUrl: process.env.MASUMI_API_URL || 'https://api.masumi.example.com',
  apiKey: process.env.MASUMI_API_KEY || 'masumi_key_placeholder',
  webhookSecret: process.env.MASUMI_WEBHOOK_SECRET || 'webhook_secret_placeholder',
  network: process.env.CARDANO_NETWORK || 'testnet'
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Masumi-Signature']
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
  // TODO: Replace with actual Masumi SDK wallet generation
  // Example: const wallet = await MasumiSDK.createWallet();
  // return wallet.address;
  
  // Mock wallet address generation for testnet
  const prefix = MASUMI_CONFIG.network === 'mainnet' ? 'addr1' : 'addr_test1';
  const randomSuffix = crypto.randomBytes(20).toString('hex');
  return `${prefix}${randomSuffix}`;
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

// Masumi SDK integration stubs
async function callMasumiAPI(endpoint, method = 'GET', data = null) {
  try {
    logger.debug('Calling Masumi API', {
      endpoint: `${MASUMI_CONFIG.apiUrl}${endpoint}`,
      method
    });

    // TODO: Replace with actual Masumi SDK call
    // Example:
    // const masumi = new MasumiSDK({
    //   apiKey: MASUMI_CONFIG.apiKey,
    //   network: MASUMI_CONFIG.network
    // });
    // return await masumi.call(endpoint, method, data);

    // Mock API response for development
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay

    // Return mock successful response
    return {
      success: true,
      data: {
        transactionId: `tx_${uuidv4()}`,
        status: 'created',
        paymentAddress: generateWalletAddress(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    };

  } catch (error) {
    logger.error('Masumi API call failed', {
      endpoint,
      method,
      error: error.message
    });

    return {
      success: false,
      error: error.message
    };
  }
}

async function createMasumiPaymentRequest(invoiceData) {
  // TODO: Replace with actual Masumi SDK payment request creation
  // Example:
  // const paymentRequest = await MasumiSDK.createPaymentRequest({
  //   amount: invoiceData.amountLovelace,
  //   currency: 'LOVELACE',
  //   description: invoiceData.description,
  //   metadata: invoiceData.metadata,
  //   webhookUrl: process.env.WEBHOOK_BASE_URL + '/payment/webhook'
  // });
  // return paymentRequest;

  // Mock payment request creation
  const paymentRequest = {
    paymentId: uuidv4(),
    paymentAddress: generateWalletAddress(),
    amount: invoiceData.amountLovelace,
    currency: 'LOVELACE',
    description: invoiceData.description,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    qrCode: `cardano:${generateWalletAddress()}?amount=${invoiceData.amountLovelace}`,
    deepLink: `https://wallet.example.com/pay?address=${generateWalletAddress()}&amount=${invoiceData.amountLovelace}`
  };

  logger.info('Mock Masumi payment request created', {
    paymentId: paymentRequest.paymentId,
    amount: invoiceData.amount,
    currency: invoiceData.currency
  });

  return paymentRequest;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'masumi-payment-service',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    masumi: {
      apiUrl: MASUMI_CONFIG.apiUrl,
      network: MASUMI_CONFIG.network,
      connected: true // TODO: Implement actual Masumi connection check
    },
    stats: {
      totalInvoices: invoices.size,
      totalPayments: payments.size,
      activeInvoices: Array.from(invoices.values()).filter(inv => inv.status === 'pending').length
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

    // TODO: Create payment request with Masumi SDK
    const paymentRequest = await createMasumiPaymentRequest({
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
    const signature = req.get('X-Masumi-Signature');
    const payload = req.body;
    
    // Validate webhook signature
    if (!validateWebhookSignature(payload, signature, MASUMI_CONFIG.webhookSecret)) {
      logger.warn('Invalid webhook signature', {
        signature,
        expectedSecret: MASUMI_CONFIG.webhookSecret.substring(0, 8) + '...'
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
  // TODO: Close database connections and Masumi SDK connections
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Masumi Payment Service started on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    masumiApiUrl: MASUMI_CONFIG.apiUrl,
    cardanoNetwork: MASUMI_CONFIG.network
  });
});

module.exports = app;