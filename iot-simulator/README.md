# IoT Simulator

A comprehensive Node.js IoT telemetry simulator for the Smart Freight Management System that generates realistic sensor data and GPS tracking for multiple shipments.

## Features

- **Multi-Shipment Simulation**: Simulate multiple shipments simultaneously
- **Realistic Data**: GPS random walk, sensor noise, and event simulation
- **CLI Configuration**: Flexible command-line options
- **Event Simulation**: Temperature spikes, vibration events, shock detection
- **Real-time Monitoring**: Live status updates and statistics
- **Graceful Shutdown**: Proper cleanup and final statistics

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Basic simulation** (3 shipments, 5-second intervals):
   ```bash
   npm start
   ```

3. **Custom simulation**:
   ```bash
   npm run simulate
   # or
   node src/iotSimulator.js --shipments=5 --rate=3000
   ```

## CLI Options

```bash
iot-simulator [options]

Options:
  -s, --shipments <number>     number of shipments to simulate (default: 3)
  -r, --rate <number>          telemetry transmission rate in milliseconds (default: 5000)
  -e, --endpoint <url>         digital twin service endpoint (default: http://localhost:3002)
  -d, --duration <number>      simulation duration in seconds (0 = infinite) (default: 0)
  --lat-center <number>        starting latitude center (default: 40.7128)
  --lon-center <number>        starting longitude center (default: -74.0060)
  --temp-base <number>         base temperature in Celsius (default: 20)
  --humidity-base <number>     base humidity percentage (default: 50)
  --verbose                    enable verbose logging
  -h, --help                   display help for command
```

## Usage Examples

### Basic Simulation
```bash
# Simulate 3 shipments every 5 seconds
npm start
```

### High-Frequency Testing
```bash
# 10 shipments every 2 seconds for 5 minutes
node src/iotSimulator.js --shipments=10 --rate=2000 --duration=300
```

### Custom Location
```bash
# Start simulation in London
node src/iotSimulator.js --lat-center=51.5074 --lon-center=-0.1278
```

### Cold Chain Monitoring
```bash
# Simulate refrigerated transport
node src/iotSimulator.js --temp-base=-18 --humidity-base=85 --shipments=5
```

## Generated Telemetry Data

Each transmission includes:

```json
{
  "shipmentId": "SHIP-001",
  "deviceId": "DEV-SHIP-001", 
  "timestamp": "2025-11-29T10:00:00.000Z",
  "location": {
    "latitude": 40.712845,
    "longitude": -74.006123,
    "accuracy": 5.2
  },
  "sensors": {
    "temperature": 22.5,
    "humidity": 65.3,
    "vibration": 1.2,
    "shock": 0.3,
    "tilt": 12.5
  },
  "battery": 87.2,
  "signal": {
    "strength": -72,
    "network": "4G"
  }
}
```

## Simulation Features

### GPS Random Walk
- Realistic movement patterns with momentum
- Configurable speed and direction changes
- Boundary constraints for realistic coordinates

### Sensor Simulation
- **Temperature**: Gradual changes with occasional hot/cold events
- **Humidity**: Slower variations within realistic ranges
- **Vibration**: Low baseline with periodic spikes during transport
- **Shock**: Rare events simulating handling incidents
- **Battery**: Gradual discharge over time
- **Signal**: Variable strength based on movement

### Event Simulation
- **Temperature Alerts**: 5% chance per transmission
  - Cold events: -25°C to -15°C
  - Hot events: 65°C to 80°C
- **Vibration Spikes**: 10% chance (3-8g)
- **Shock Events**: 2% chance (8-15g)
- **Network Changes**: 4G/3G switching

## Real-time Monitoring

The simulator provides live updates:
```
📊 SHIP-001: T=23.4°C, H=67.2%, Bat=85.3%
📊 SHIP-002: T=19.8°C, H=52.1%, Bat=91.7%
📊 SHIP-003: T=25.1°C, H=71.5%, Bat=88.9%

📈 Status: 120s runtime, 72 transmissions, 98.6% success rate
   SHIP-001: 24 sent, Battery: 85.3%
   SHIP-002: 24 sent, Battery: 91.7%
   SHIP-003: 24 sent, Battery: 88.9%
```

## Integration

Sends telemetry to:
- **Digital Twin Service** (port 3002): `POST /digitalTwin/:id/telemetry`
- **Tracking Agent** (via Digital Twin Service): Updates digital twin state
- **Alert System**: Triggers compliance and settlement workflows

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DIGITAL_TWIN_URL | http://localhost:3002 | Digital Twin Service endpoint |
| LOG_LEVEL | info | Winston logging level |
| DEFAULT_SHIPMENTS | 3 | Default number of shipments |
| DEFAULT_RATE | 5000 | Default transmission rate (ms) |

## Error Handling

- **Network Failures**: Automatic retry and error logging
- **Service Unavailable**: Continues simulation with failure tracking
- **Invalid Responses**: Detailed error reporting
- **Graceful Shutdown**: Ctrl+C handling with final statistics

## Statistics and Monitoring

Final report includes:
- Total runtime
- Transmission counts (total/successful/failed)
- Success rates per shipment
- Battery levels and sensor states

Perfect for:
- **Development Testing**: Realistic data flow testing
- **Load Testing**: High-frequency telemetry simulation  
- **Demo Scenarios**: Event-driven alert demonstrations
- **Integration Testing**: End-to-end system validation