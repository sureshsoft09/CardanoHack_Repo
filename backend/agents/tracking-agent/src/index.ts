import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { EventEmitter } from 'events';
import Joi from 'joi';
import winston from 'winston';
import dotenv from 'dotenv';
import { TrackingAgent, Telemetry } from './TrackingAgent';

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

// Telemetry event emitter
class TelemetryEmitter extends EventEmitter {}
const telemetryEmitter = new TelemetryEmitter();

// Initialize Tracking Agent
const trackingAgent = new TrackingAgent(telemetryEmitter);

// Telemetry validation schema
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

// Types (using types from TrackingAgent)
type TelemetryData = Telemetry;

interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
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

// Digital Twin endpoints
app.get('/digital-twin/:shipmentId', (req: Request, res: Response) => {
  const { shipmentId } = req.params;
  const twin = trackingAgent.getDigitalTwin(shipmentId);
  
  if (!twin) {
    return res.status(404).json({
      error: 'Digital Twin Not Found',
      message: `No digital twin found for shipment ID: ${shipmentId}`,
      timestamp: new Date().toISOString()
    });
  }
  
  return res.json(twin);
});

app.get('/digital-twins', (_req: Request, res: Response) => {
  const twins = trackingAgent.getAllDigitalTwins();
  res.json({
    twins,
    count: twins.length,
    timestamp: new Date().toISOString()
  });
});

app.get('/digital-twin/:shipmentId/alerts', (req: Request, res: Response) => {
  const { shipmentId } = req.params;
  const activeOnly = req.query.active === 'true';
  
  const twin = trackingAgent.getDigitalTwin(shipmentId);
  if (!twin) {
    return res.status(404).json({
      error: 'Digital Twin Not Found',
      message: `No digital twin found for shipment ID: ${shipmentId}`,
      timestamp: new Date().toISOString()
    });
  }
  
  const alerts = activeOnly ? 
    trackingAgent.getActiveAlerts(shipmentId) : 
    twin.alerts;
    
  return res.json({
    shipmentId,
    alerts,
    count: alerts.length,
    timestamp: new Date().toISOString()
  });
});

app.post('/digital-twin/:shipmentId/geofence', (req: Request, res: Response) => {
  const { shipmentId } = req.params;
  const geofenceSchema = Joi.object({
    center: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required()
    }).required(),
    radius: Joi.number().positive().required(),
    allowedZones: Joi.array().items(
      Joi.object({
        latitude: Joi.number().min(-90).max(90).required(),
        longitude: Joi.number().min(-180).max(180).required(),
        radius: Joi.number().positive().required()
      })
    ).optional()
  });
  
  const { error, value } = geofenceSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.details.map(detail => detail.message).join('; '),
      timestamp: new Date().toISOString()
    });
  }
  
  trackingAgent.setGeofence(shipmentId, value);
  
  return res.status(201).json({
    message: 'Geofence set successfully',
    shipmentId,
    geofence: value,
    timestamp: new Date().toISOString()
  });
});

app.patch('/digital-twin/:shipmentId/alert/:alertId/resolve', (req: Request, res: Response) => {
  const { shipmentId, alertId } = req.params;
  
  trackingAgent.resolveAlert(shipmentId, alertId);
  
  res.json({
    message: 'Alert resolved successfully',
    shipmentId,
    alertId,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const digitalTwinsCount = trackingAgent.getAllDigitalTwins().length;
  const activeAlerts = trackingAgent.getAllDigitalTwins()
    .reduce((total, twin) => total + twin.alerts.filter(a => !a.resolved).length, 0);

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'tracking-agent',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    digitalTwins: digitalTwinsCount,
    activeAlerts
  });
});

// Telemetry ingestion endpoint
app.post('/telemetry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const { error, value } = telemetrySchema.validate(req.body, { 
      abortEarly: false,
      convert: true 
    });

    if (error) {
      const errorResponse: ErrorResponse = {
        error: 'Validation Error',
        message: error.details.map(detail => detail.message).join('; '),
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(errorResponse);
    }

    const telemetryData: TelemetryData = value;

    // Log received telemetry
    logger.info('Telemetry data received', {
      shipmentId: telemetryData.shipmentId,
      deviceId: telemetryData.deviceId,
      timestamp: telemetryData.timestamp,
      location: telemetryData.location
    });

    // Emit telemetry event
    telemetryEmitter.emit('telemetry:received', telemetryData);

    // Check for anomalies and emit specific events
    if (telemetryData.sensors) {
      const { temperature, humidity, vibration, shock } = telemetryData.sensors;
      
      // Temperature alerts
      if (temperature !== undefined && (temperature < -20 || temperature > 60)) {
        telemetryEmitter.emit('telemetry:temperature-alert', {
          ...telemetryData,
          alertType: 'temperature',
          alertValue: temperature,
          threshold: temperature < -20 ? 'below -20°C' : 'above 60°C'
        });
        logger.warn('Temperature alert triggered', {
          shipmentId: telemetryData.shipmentId,
          temperature,
          deviceId: telemetryData.deviceId
        });
      }

      // Humidity alerts
      if (humidity !== undefined && (humidity > 80)) {
        telemetryEmitter.emit('telemetry:humidity-alert', {
          ...telemetryData,
          alertType: 'humidity',
          alertValue: humidity,
          threshold: 'above 80%'
        });
      }

      // Vibration/shock alerts
      if (vibration !== undefined && vibration > 5) {
        telemetryEmitter.emit('telemetry:vibration-alert', {
          ...telemetryData,
          alertType: 'vibration',
          alertValue: vibration,
          threshold: 'above 5g'
        });
      }

      if (shock !== undefined && shock > 10) {
        telemetryEmitter.emit('telemetry:shock-alert', {
          ...telemetryData,
          alertType: 'shock',
          alertValue: shock,
          threshold: 'above 10g'
        });
      }
    }

    // Battery alerts
    if (telemetryData.battery !== undefined && telemetryData.battery < 20) {
      telemetryEmitter.emit('telemetry:battery-low', {
        ...telemetryData,
        alertType: 'battery',
        alertValue: telemetryData.battery,
        threshold: 'below 20%'
      });
    }

    // Respond with success
    return res.status(201).json({
      message: 'Telemetry data processed successfully',
      shipmentId: telemetryData.shipmentId,
      deviceId: telemetryData.deviceId,
      timestamp: telemetryData.timestamp,
      processed: new Date().toISOString()
    });

  } catch (error) {
    return next(error);
  }
});

// Global error handler
app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });

  const errorResponse: ErrorResponse = {
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong' 
      : error.message,
    timestamp: new Date().toISOString()
  };

  res.status(500).json(errorResponse);
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  const errorResponse: ErrorResponse = {
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  };
  res.status(404).json(errorResponse);
});

// Event listeners for telemetry processing
telemetryEmitter.on('telemetry:received', (data: TelemetryData) => {
  logger.debug('Processing telemetry data', { shipmentId: data.shipmentId });
  // Add your telemetry processing logic here
});

telemetryEmitter.on('telemetry:temperature-alert', (data: any) => {
  logger.warn('Temperature alert processed', { 
    shipmentId: data.shipmentId, 
    temperature: data.alertValue 
  });
  // Forward to compliance agent or alert system
});

telemetryEmitter.on('telemetry:humidity-alert', (data: any) => {
  logger.warn('Humidity alert processed', { 
    shipmentId: data.shipmentId, 
    humidity: data.alertValue 
  });
});

telemetryEmitter.on('telemetry:vibration-alert', (data: any) => {
  logger.warn('Vibration alert processed', { 
    shipmentId: data.shipmentId, 
    vibration: data.alertValue 
  });
});

telemetryEmitter.on('telemetry:shock-alert', (data: any) => {
  logger.warn('Shock alert processed', { 
    shipmentId: data.shipmentId, 
    shock: data.alertValue 
  });
});

telemetryEmitter.on('telemetry:battery-low', (data: any) => {
  logger.warn('Low battery alert processed', { 
    shipmentId: data.shipmentId, 
    battery: data.alertValue 
  });
});

// TrackingAgent event listeners
trackingAgent.on('digital-twin:updated', (data: any) => {
  logger.debug('Digital twin updated', {
    shipmentId: data.shipmentId,
    deviceId: data.twin.deviceId,
    location: data.twin.currentLocation
  });
});

trackingAgent.on('alert', (data: any) => {
  logger.warn('Alert triggered by TrackingAgent', {
    shipmentId: data.shipmentId,
    deviceId: data.deviceId,
    alertType: data.alert.type,
    severity: data.alert.severity,
    message: data.alert.message,
    value: data.alert.value,
    threshold: data.alert.threshold
  });
  
  // Forward to compliance agent or other systems
  // This could be a webhook, message queue, etc.
});

trackingAgent.on('geofence:set', (data: any) => {
  logger.info('Geofence configured', {
    shipmentId: data.shipmentId,
    center: data.geofence.center,
    radius: data.geofence.radius
  });
});

trackingAgent.on('alert:resolved', (data: any) => {
  logger.info('Alert resolved', {
    shipmentId: data.shipmentId,
    alertId: data.alertId,
    alertType: data.alert.type
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Tracking Agent started on port ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Export for testing
export { app, telemetryEmitter, trackingAgent };