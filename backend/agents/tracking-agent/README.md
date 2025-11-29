# Tracking Agent

A Node.js + TypeScript microservice for ingesting and processing IoT telemetry data in the Smart Freight Management System.

## Features

- **REST API**: POST /telemetry endpoint for telemetry data ingestion
- **Data Validation**: Comprehensive JSON schema validation using Joi
- **Event-Driven**: EventEmitter for real-time telemetry processing and alerts
- **Security**: CORS, Helmet, and input validation
- **Monitoring**: Health check endpoint and structured logging
- **Error Handling**: Comprehensive error handling with proper HTTP status codes

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   ```

3. **Development**:
   ```bash
   npm run dev
   ```

4. **Production build**:
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Health Check
```
GET /health
```

### Telemetry Ingestion
```
POST /telemetry
Content-Type: application/json

{
  "shipmentId": "SHIP-001",
  "deviceId": "DEV-001",
  "timestamp": "2025-11-29T10:00:00Z",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 5
  },
  "sensors": {
    "temperature": 22.5,
    "humidity": 65,
    "vibration": 2.1,
    "shock": 0.5,
    "tilt": 15
  },
  "battery": 85,
  "signal": {
    "strength": -70,
    "network": "4G"
  }
}
```

## Event System

The service emits the following events via EventEmitter:

- `telemetry:received` - All incoming telemetry data
- `telemetry:temperature-alert` - Temperature outside -20°C to 60°C range
- `telemetry:humidity-alert` - Humidity above 80%
- `telemetry:vibration-alert` - Vibration above 5g
- `telemetry:shock-alert` - Shock above 10g
- `telemetry:battery-low` - Battery below 20%

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| NODE_ENV | development | Environment mode |
| LOG_LEVEL | info | Logging level |
| ALLOWED_ORIGINS | * | CORS allowed origins |

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Architecture

This microservice is part of the Smart Freight Management System and integrates with:
- **Compliance Agent**: Receives alert events for rule processing
- **Settlement Agent**: Receives processed telemetry for billing
- **Digital Twin Service**: Real-time telemetry streaming
- **Frontend React**: WebSocket connections for live updates