const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const axios = require('axios');
const winston = require('winston');
const dotenv = require('dotenv');
const Joi = require('joi');

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
const PORT = process.env.PORT || 3002;

// Tracking Agent service configuration
const TRACKING_AGENT_URL = process.env.TRACKING_AGENT_URL || 'http://localhost:3001';

// In-memory store for digital twin cache
// TODO: Replace with PostgreSQL for persistent storage and better querying capabilities
// Example: Use pg library with connection pooling for production
// const { Pool } = require('pg');
// const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let digitalTwinCache = new Map();

// TODO: Replace with Redis for high-performance caching and pub/sub
// Example: Use redis library for production caching layer
// const redis = require('redis');
// const client = redis.createClient({ url: process.env.REDIS_URL });
let telemetryCache = new Map();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
const telemetrySchema = Joi.object({
  shipmentId: Joi.string().required(),
  deviceId: Joi.string().required(),
  timestamp: Joi.date().iso().required(),
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    accuracy: Joi.number().positive().optional()
  }).required(),
  sensors: Joi.object({
    temperature: Joi.number().optional(),
    humidity: Joi.number().min(0).max(100).optional(),
    vibration: Joi.number().min(0).optional(),
    shock: Joi.number().min(0).optional(),
    tilt: Joi.number().min(0).max(360).optional()
  }).optional(),
  battery: Joi.number().min(0).max(100).optional(),
  signal: Joi.object({
    strength: Joi.number().min(-120).max(0).optional(),
    network: Joi.string().optional()
  }).optional()
});

// Helper function to call Tracking Agent API
async function callTrackingAgent(endpoint, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url: `${TRACKING_AGENT_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    logger.error('Tracking Agent API call failed', {
      endpoint,
      method,
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    return {
      success: false,
      error: error.message,
      status: error.response?.status || 500,
      details: error.response?.data
    };
  }
}

// Cache management functions
function getCachedDigitalTwin(id) {
  // TODO: Replace with Redis GET operation
  // return await client.get(`digital-twin:${id}`);
  return digitalTwinCache.get(id);
}

function setCachedDigitalTwin(id, twin, ttl = 300) {
  // TODO: Replace with Redis SETEX operation for TTL support
  // await client.setex(`digital-twin:${id}`, ttl, JSON.stringify(twin));
  digitalTwinCache.set(id, {
    ...twin,
    cachedAt: new Date(),
    expiresAt: new Date(Date.now() + ttl * 1000)
  });
}

function getCachedTelemetry(id, limit = 100) {
  // TODO: Replace with Redis LRANGE operation for list operations
  // return await client.lrange(`telemetry:${id}`, 0, limit - 1);
  const cached = telemetryCache.get(id) || [];
  return cached.slice(-limit);
}

function setCachedTelemetry(id, telemetry, maxSize = 1000) {
  // TODO: Replace with Redis LPUSH + LTRIM operations
  // await client.lpush(`telemetry:${id}`, JSON.stringify(telemetry));
  // await client.ltrim(`telemetry:${id}`, 0, maxSize - 1);
  const cached = telemetryCache.get(id) || [];
  cached.push(telemetry);
  if (cached.length > maxSize) {
    cached.shift();
  }
  telemetryCache.set(id, cached);
}

// Health check endpoint
app.get('/health', (req, res) => {
  const cacheStats = {
    digitalTwins: digitalTwinCache.size,
    telemetryEntries: Array.from(telemetryCache.values())
      .reduce((total, arr) => total + arr.length, 0)
  };
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'digital-twin-service',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    cache: cacheStats,
    trackingAgentUrl: TRACKING_AGENT_URL
  });
});

// Get Digital Twin by ID
app.get('/digitalTwin/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const includeHistory = req.query.includeHistory === 'true';
    const historyLimit = parseInt(req.query.historyLimit) || 100;
    
    logger.info('Fetching digital twin', { id, includeHistory, historyLimit });
    
    // Check cache first
    const cached = getCachedDigitalTwin(id);
    if (cached && cached.expiresAt > new Date()) {
      logger.debug('Serving digital twin from cache', { id });
      
      const response = { ...cached };
      delete response.cachedAt;
      delete response.expiresAt;
      
      if (includeHistory) {
        response.telemetryHistory = getCachedTelemetry(id, historyLimit);
      }
      
      return res.json(response);
    }
    
    // Fetch from Tracking Agent
    const result = await callTrackingAgent(`/digital-twin/${id}`);
    
    if (!result.success) {
      if (result.status === 404) {
        return res.status(404).json({
          error: 'Digital Twin Not Found',
          message: `No digital twin found for ID: ${id}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(result.status || 500).json({
        error: 'Tracking Agent Error',
        message: result.error,
        timestamp: new Date().toISOString(),
        details: result.details
      });
    }
    
    const twin = result.data;
    
    // Cache the result
    setCachedDigitalTwin(id, twin);
    
    // Add telemetry history if requested
    if (includeHistory && twin.telemetryHistory) {
      // Cache telemetry history
      twin.telemetryHistory.forEach(telemetry => {
        setCachedTelemetry(id, telemetry);
      });
      
      // Limit history in response
      if (twin.telemetryHistory.length > historyLimit) {
        twin.telemetryHistory = twin.telemetryHistory.slice(-historyLimit);
      }
    } else if (!includeHistory) {
      // Remove history from response if not requested
      delete twin.telemetryHistory;
    }
    
    logger.info('Digital twin fetched successfully', { 
      id, 
      deviceId: twin.deviceId,
      lastUpdated: twin.lastUpdated 
    });
    
    res.json(twin);
    
  } catch (error) {
    next(error);
  }
});

// Forward telemetry to Tracking Agent
app.post('/digitalTwin/:id/telemetry', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate telemetry data
    const { error, value } = telemetrySchema.validate(req.body, {
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
    
    const telemetryData = value;
    
    // Ensure shipmentId matches URL parameter
    if (telemetryData.shipmentId !== id) {
      return res.status(400).json({
        error: 'ID Mismatch',
        message: `Shipment ID in URL (${id}) does not match shipment ID in payload (${telemetryData.shipmentId})`,
        timestamp: new Date().toISOString()
      });
    }
    
    logger.info('Forwarding telemetry to Tracking Agent', {
      shipmentId: id,
      deviceId: telemetryData.deviceId,
      timestamp: telemetryData.timestamp
    });
    
    // Forward to Tracking Agent
    const result = await callTrackingAgent('/telemetry', 'POST', telemetryData);
    
    if (!result.success) {
      return res.status(result.status || 500).json({
        error: 'Tracking Agent Error',
        message: result.error,
        timestamp: new Date().toISOString(),
        details: result.details
      });
    }
    
    // Cache the telemetry data
    setCachedTelemetry(id, telemetryData);
    
    // Invalidate digital twin cache to ensure fresh data on next request
    digitalTwinCache.delete(id);
    
    logger.info('Telemetry forwarded successfully', {
      shipmentId: id,
      deviceId: telemetryData.deviceId,
      processed: result.data.processed
    });
    
    // Return Tracking Agent response
    res.status(201).json({
      message: 'Telemetry processed successfully',
      shipmentId: id,
      deviceId: telemetryData.deviceId,
      timestamp: telemetryData.timestamp,
      processed: new Date().toISOString(),
      trackingAgentResponse: result.data
    });
    
  } catch (error) {
    next(error);
  }
});

// Get all Digital Twins (with pagination)
app.get('/digitalTwins', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const includeAlerts = req.query.includeAlerts === 'true';
    
    logger.info('Fetching all digital twins', { page, limit, includeAlerts });
    
    // Fetch from Tracking Agent
    const result = await callTrackingAgent('/digital-twins');
    
    if (!result.success) {
      return res.status(result.status || 500).json({
        error: 'Tracking Agent Error',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }
    
    let twins = result.data.twins || [];
    
    // Filter active alerts if requested
    if (includeAlerts) {
      twins = twins.map(twin => ({
        ...twin,
        activeAlerts: twin.alerts ? twin.alerts.filter(alert => !alert.resolved) : []
      }));
    }
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTwins = twins.slice(startIndex, endIndex);
    
    // Cache results
    twins.forEach(twin => {
      setCachedDigitalTwin(twin.shipmentId, twin);
    });
    
    res.json({
      twins: paginatedTwins,
      pagination: {
        page,
        limit,
        total: twins.length,
        totalPages: Math.ceil(twins.length / limit),
        hasNext: endIndex < twins.length,
        hasPrev: page > 1
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
});

// Get telemetry history for a Digital Twin
app.get('/digitalTwin/:id/telemetry', async (req, res, next) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    logger.info('Fetching telemetry history', { id, limit });
    
    // Try cache first
    const cached = getCachedTelemetry(id, limit);
    if (cached.length > 0) {
      logger.debug('Serving telemetry from cache', { id, count: cached.length });
      return res.json({
        shipmentId: id,
        telemetry: cached,
        count: cached.length,
        source: 'cache',
        timestamp: new Date().toISOString()
      });
    }
    
    // Fetch digital twin to get history
    const result = await callTrackingAgent(`/digital-twin/${id}`);
    
    if (!result.success) {
      if (result.status === 404) {
        return res.status(404).json({
          error: 'Digital Twin Not Found',
          message: `No digital twin found for ID: ${id}`,
          timestamp: new Date().toISOString()
        });
      }
      
      return res.status(result.status || 500).json({
        error: 'Tracking Agent Error',
        message: result.error,
        timestamp: new Date().toISOString()
      });
    }
    
    const history = result.data.telemetryHistory || [];
    const limitedHistory = history.slice(-limit);
    
    // Cache the history
    history.forEach(telemetry => {
      setCachedTelemetry(id, telemetry);
    });
    
    res.json({
      shipmentId: id,
      telemetry: limitedHistory,
      count: limitedHistory.length,
      source: 'tracking-agent',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    next(error);
  }
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
  // TODO: Close database connections
  // await pool.end();
  // await client.quit();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Digital Twin Service started on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    trackingAgentUrl: TRACKING_AGENT_URL
  });
});

// Export for testing
module.exports = app;