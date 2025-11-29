# Digital Twin Service

A Node.js Express API service that provides centralized access to digital twin data and acts as a gateway to the Tracking Agent in the Smart Freight Management System.

## Features

- **REST API**: Complete CRUD operations for digital twins
- **Tracking Agent Integration**: Seamless forwarding of telemetry data
- **Caching Layer**: In-memory caching with production-ready database comments
- **Data Validation**: Comprehensive JSON schema validation
- **Error Handling**: Robust error handling and logging
- **Health Monitoring**: Health check endpoint with cache statistics

## API Endpoints

### Health Check
```
GET /health
```
Returns service status, uptime, and cache statistics.

### Digital Twin Operations

#### Get Digital Twin by ID
```
GET /digitalTwin/:id?includeHistory=true&historyLimit=100
```
Retrieves digital twin state with optional telemetry history.

#### Send Telemetry Data
```
POST /digitalTwin/:id/telemetry
Content-Type: application/json

{
  "shipmentId": "SHIP-001",
  "deviceId": "DEV-001",
  "timestamp": "2025-11-29T10:00:00Z",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "sensors": {
    "temperature": 22.5,
    "humidity": 65
  },
  "battery": 85
}
```
Forwards telemetry to Tracking Agent and updates digital twin.

#### Get All Digital Twins
```
GET /digitalTwins?page=1&limit=50&includeAlerts=true
```
Retrieves paginated list of all digital twins with optional alert filtering.

#### Get Telemetry History
```
GET /digitalTwin/:id/telemetry?limit=100
```
Retrieves cached telemetry history for a specific digital twin.

## Architecture

### Current Implementation (Development)
- **In-Memory Storage**: Map-based caching for fast development
- **Direct API Calls**: HTTP calls to Tracking Agent service

### Production Ready (With TODOs)
- **PostgreSQL**: Persistent storage with connection pooling
- **Redis**: High-performance caching and pub/sub messaging
- **Connection Management**: Proper database connection handling

## Database Migration Path

### PostgreSQL Integration
```javascript
// TODO: Replace in-memory store with PostgreSQL
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Example queries:
// SELECT * FROM digital_twins WHERE shipment_id = $1
// INSERT INTO telemetry_data (shipment_id, device_id, data, timestamp) VALUES ($1, $2, $3, $4)
```

### Redis Caching
```javascript
// TODO: Replace Map-based cache with Redis
const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

// Example operations:
// await client.setex(`digital-twin:${id}`, 300, JSON.stringify(twin));
// await client.lpush(`telemetry:${id}`, JSON.stringify(telemetry));
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3002 | Service port |
| TRACKING_AGENT_URL | http://localhost:3001 | Tracking Agent endpoint |
| LOG_LEVEL | info | Logging level |
| CACHE_TTL | 300 | Cache expiration (seconds) |

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment**:
   ```bash
   cp .env.example .env
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Start production**:
   ```bash
   npm start
   ```

## Integration

This service integrates with:
- **Tracking Agent** (port 3001): Forwards telemetry and fetches digital twin data
- **Frontend React**: Provides digital twin API for dashboard
- **Compliance Agent**: Receives processed telemetry data
- **IoT Simulator**: Receives telemetry from IoT devices

## Performance Features

- **Intelligent Caching**: Automatic cache invalidation on updates
- **Pagination**: Efficient handling of large digital twin collections  
- **Request Validation**: Early validation to prevent invalid API calls
- **Connection Pooling**: Ready for database connection pooling
- **Graceful Shutdown**: Proper cleanup on service termination

The service is designed to scale from development (in-memory) to production (PostgreSQL + Redis) with minimal code changes by following the TODO comments throughout the codebase.