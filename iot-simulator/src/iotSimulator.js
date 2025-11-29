#!/usr/bin/env node

const axios = require('axios');
const { Command } = require('commander');
const winston = require('winston');
const dotenv = require('dotenv');
const chalk = require('chalk');

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
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      )
    })
  ]
});

// CLI Configuration
const program = new Command();
program
  .name('iot-simulator')
  .description('IoT Telemetry Simulator for Smart Freight Management System')
  .version('1.0.0')
  .option('-s, --shipments <number>', 'number of shipments to simulate', '3')
  .option('-r, --rate <number>', 'telemetry transmission rate in milliseconds', '5000')
  .option('-e, --endpoint <url>', 'digital twin service endpoint', process.env.DIGITAL_TWIN_URL || 'http://localhost:3002')
  .option('-d, --duration <number>', 'simulation duration in seconds (0 = infinite)', '0')
  .option('--lat-center <number>', 'starting latitude center', '40.7128')
  .option('--lon-center <number>', 'starting longitude center', '-74.0060')
  .option('--temp-base <number>', 'base temperature in Celsius', '20')
  .option('--humidity-base <number>', 'base humidity percentage', '50')
  .option('--verbose', 'enable verbose logging')
  .parse();

const options = program.opts();

// Simulator Configuration
const CONFIG = {
  shipmentCount: parseInt(options.shipments),
  transmissionRate: parseInt(options.rate),
  endpoint: options.endpoint,
  duration: parseInt(options.duration) * 1000, // Convert to milliseconds
  startLocation: {
    lat: parseFloat(options.latCenter),
    lon: parseFloat(options.lonCenter)
  },
  baseSensors: {
    temperature: parseFloat(options.tempBase),
    humidity: parseFloat(options.humidityBase)
  },
  verbose: options.verbose
};

if (CONFIG.verbose) {
  logger.level = 'debug';
}

// Shipment class for managing individual shipment simulation
class ShipmentSimulator {
  constructor(shipmentId, startLat, startLon) {
    this.shipmentId = shipmentId;
    this.deviceId = `DEV-${shipmentId}`;
    this.currentLocation = {
      lat: startLat,
      lon: startLon
    };
    this.currentSensors = {
      temperature: CONFIG.baseSensors.temperature + this.randomNoise(-5, 5),
      humidity: CONFIG.baseSensors.humidity + this.randomNoise(-10, 10),
      vibration: this.randomNoise(0, 2),
      shock: this.randomNoise(0, 1),
      tilt: this.randomNoise(0, 15)
    };
    this.battery = 100;
    this.signalStrength = this.randomNoise(-80, -60);
    this.isActive = true;
    this.telemetryCount = 0;
    this.lastTransmission = null;
    
    // Movement parameters for random walk
    this.speed = this.randomNoise(0.0001, 0.0005); // degrees per transmission
    this.direction = Math.random() * 2 * Math.PI; // Random initial direction
    
    logger.info(`Initialized shipment simulator`, {
      shipmentId: this.shipmentId,
      deviceId: this.deviceId,
      startLocation: this.currentLocation,
      initialSensors: this.currentSensors
    });
  }
  
  // Generate random noise within range
  randomNoise(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  // Clamp value within bounds
  clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
  
  // Update GPS location using random walk
  updateLocation() {
    // Random walk with slight momentum
    this.direction += this.randomNoise(-0.3, 0.3); // Small direction changes
    
    // Move in current direction
    const deltaLat = Math.cos(this.direction) * this.speed;
    const deltaLon = Math.sin(this.direction) * this.speed;
    
    this.currentLocation.lat += deltaLat;
    this.currentLocation.lon += deltaLon;
    
    // Ensure coordinates stay within reasonable bounds
    this.currentLocation.lat = this.clamp(this.currentLocation.lat, -90, 90);
    this.currentLocation.lon = this.clamp(this.currentLocation.lon, -180, 180);
    
    logger.debug(`Updated location for ${this.shipmentId}`, {
      location: this.currentLocation,
      direction: this.direction,
      speed: this.speed
    });
  }
  
  // Update sensor readings with realistic variations
  updateSensors() {
    // Temperature: gradual changes with occasional spikes
    const tempChange = this.randomNoise(-1, 1);
    this.currentSensors.temperature += tempChange;
    
    // Occasionally simulate temperature events
    if (Math.random() < 0.05) { // 5% chance per transmission
      const eventType = Math.random();
      if (eventType < 0.5) {
        // Cold event
        this.currentSensors.temperature = this.randomNoise(-25, -15);
        logger.warn(`Cold temperature event for ${this.shipmentId}`, {
          temperature: this.currentSensors.temperature
        });
      } else {
        // Hot event
        this.currentSensors.temperature = this.randomNoise(65, 80);
        logger.warn(`Hot temperature event for ${this.shipmentId}`, {
          temperature: this.currentSensors.temperature
        });
      }
    }
    
    // Humidity: slower changes
    const humidityChange = this.randomNoise(-2, 2);
    this.currentSensors.humidity += humidityChange;
    this.currentSensors.humidity = this.clamp(this.currentSensors.humidity, 0, 100);
    
    // Vibration: mostly low with occasional spikes
    if (Math.random() < 0.1) { // 10% chance of vibration spike
      this.currentSensors.vibration = this.randomNoise(3, 8);
    } else {
      this.currentSensors.vibration = this.randomNoise(0, 2);
    }
    
    // Shock: rare events
    if (Math.random() < 0.02) { // 2% chance of shock event
      this.currentSensors.shock = this.randomNoise(8, 15);
      logger.warn(`Shock event for ${this.shipmentId}`, {
        shock: this.currentSensors.shock
      });
    } else {
      this.currentSensors.shock = this.randomNoise(0, 1);
    }
    
    // Tilt: small variations
    this.currentSensors.tilt += this.randomNoise(-2, 2);
    this.currentSensors.tilt = this.clamp(this.currentSensors.tilt, 0, 360);
    
    // Battery: gradual decrease
    this.battery -= this.randomNoise(0.01, 0.05);
    this.battery = Math.max(this.battery, 0);
    
    // Signal strength: varies with movement
    this.signalStrength += this.randomNoise(-5, 5);
    this.signalStrength = this.clamp(this.signalStrength, -120, -30);
  }
  
  // Generate telemetry payload
  generateTelemetry() {
    this.updateLocation();
    this.updateSensors();
    this.telemetryCount++;
    
    const telemetry = {
      shipmentId: this.shipmentId,
      deviceId: this.deviceId,
      timestamp: new Date().toISOString(),
      location: {
        latitude: parseFloat(this.currentLocation.lat.toFixed(6)),
        longitude: parseFloat(this.currentLocation.lon.toFixed(6)),
        accuracy: this.randomNoise(2, 10)
      },
      sensors: {
        temperature: parseFloat(this.currentSensors.temperature.toFixed(1)),
        humidity: parseFloat(this.currentSensors.humidity.toFixed(1)),
        vibration: parseFloat(this.currentSensors.vibration.toFixed(2)),
        shock: parseFloat(this.currentSensors.shock.toFixed(2)),
        tilt: parseFloat(this.currentSensors.tilt.toFixed(1))
      },
      battery: parseFloat(this.battery.toFixed(1)),
      signal: {
        strength: parseFloat(this.signalStrength.toFixed(0)),
        network: Math.random() < 0.8 ? '4G' : '3G'
      }
    };
    
    this.lastTransmission = new Date();
    
    return telemetry;
  }
  
  // Get shipment status for monitoring
  getStatus() {
    return {
      shipmentId: this.shipmentId,
      deviceId: this.deviceId,
      isActive: this.isActive,
      telemetryCount: this.telemetryCount,
      lastTransmission: this.lastTransmission,
      currentLocation: this.currentLocation,
      battery: this.battery,
      temperature: this.currentSensors.temperature
    };
  }
}

// Main Simulator Class
class IoTSimulator {
  constructor() {
    this.shipments = [];
    this.isRunning = false;
    this.startTime = null;
    this.totalTransmissions = 0;
    this.successfulTransmissions = 0;
    this.failedTransmissions = 0;
    this.intervals = [];
  }
  
  // Initialize shipment simulators
  initialize() {
    console.log(chalk.blue.bold('\n🚛 IoT Simulator Starting...\n'));
    
    logger.info('Initializing IoT Simulator', CONFIG);
    
    // Create shipment simulators
    for (let i = 1; i <= CONFIG.shipmentCount; i++) {
      const shipmentId = `SHIP-${String(i).padStart(3, '0')}`;
      
      // Distribute starting locations around the center point
      const offsetLat = this.randomNoise(-0.1, 0.1);
      const offsetLon = this.randomNoise(-0.1, 0.1);
      const startLat = CONFIG.startLocation.lat + offsetLat;
      const startLon = CONFIG.startLocation.lon + offsetLon;
      
      const simulator = new ShipmentSimulator(shipmentId, startLat, startLon);
      this.shipments.push(simulator);
      
      console.log(chalk.green(`✓ Created shipment ${shipmentId} at (${startLat.toFixed(4)}, ${startLon.toFixed(4)})`));
    }
    
    console.log(chalk.yellow(`\n📡 Transmitting every ${CONFIG.transmissionRate}ms to ${CONFIG.endpoint}`));
    
    if (CONFIG.duration > 0) {
      console.log(chalk.yellow(`⏱️  Simulation will run for ${CONFIG.duration / 1000} seconds\n`));
    } else {
      console.log(chalk.yellow(`♾️  Simulation will run indefinitely (Ctrl+C to stop)\n`));
    }
  }
  
  // Generate random noise
  randomNoise(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  // Send telemetry to Digital Twin Service
  async sendTelemetry(telemetry) {
    try {
      const url = `${CONFIG.endpoint}/digitalTwin/${telemetry.shipmentId}/telemetry`;
      
      logger.debug('Sending telemetry', {
        shipmentId: telemetry.shipmentId,
        url,
        telemetry
      });
      
      const response = await axios.post(url, telemetry, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      this.successfulTransmissions++;
      this.totalTransmissions++;
      
      logger.info('Telemetry sent successfully', {
        shipmentId: telemetry.shipmentId,
        status: response.status,
        temperature: telemetry.sensors.temperature,
        location: telemetry.location
      });
      
      return true;
      
    } catch (error) {
      this.failedTransmissions++;
      this.totalTransmissions++;
      
      const errorInfo = {
        shipmentId: telemetry.shipmentId,
        error: error.message,
        status: error.response?.status,
        url: `${CONFIG.endpoint}/digitalTwin/${telemetry.shipmentId}/telemetry`
      };
      
      logger.error('Failed to send telemetry', errorInfo);
      
      console.log(chalk.red(`❌ Failed to send telemetry for ${telemetry.shipmentId}: ${error.message}`));
      
      return false;
    }
  }
  
  // Start simulation for a single shipment
  startShipmentSimulation(shipment) {
    const interval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      
      try {
        const telemetry = shipment.generateTelemetry();
        const success = await this.sendTelemetry(telemetry);
        
        if (success) {
          console.log(chalk.cyan(`📊 ${shipment.shipmentId}: T=${telemetry.sensors.temperature.toFixed(1)}°C, H=${telemetry.sensors.humidity.toFixed(1)}%, Bat=${telemetry.battery.toFixed(1)}%`));
        }
        
      } catch (error) {
        logger.error('Error in shipment simulation', {
          shipmentId: shipment.shipmentId,
          error: error.message
        });
      }
    }, CONFIG.transmissionRate);
    
    this.intervals.push(interval);
  }
  
  // Start the simulation
  start() {
    this.isRunning = true;
    this.startTime = new Date();
    
    // Start simulation for each shipment
    this.shipments.forEach(shipment => {
      this.startShipmentSimulation(shipment);
    });
    
    // Status reporting
    const statusInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(statusInterval);
        return;
      }
      
      const runtime = Math.floor((Date.now() - this.startTime) / 1000);
      const successRate = this.totalTransmissions > 0 ? 
        ((this.successfulTransmissions / this.totalTransmissions) * 100).toFixed(1) : '0.0';
      
      console.log(chalk.blue(`\n📈 Status: ${runtime}s runtime, ${this.totalTransmissions} transmissions, ${successRate}% success rate`));
      
      // Show individual shipment status
      this.shipments.forEach(shipment => {
        const status = shipment.getStatus();
        console.log(chalk.gray(`   ${status.shipmentId}: ${status.telemetryCount} sent, Battery: ${status.battery.toFixed(1)}%`));
      });
      
    }, 30000); // Status update every 30 seconds
    
    this.intervals.push(statusInterval);
    
    // Duration timeout
    if (CONFIG.duration > 0) {
      setTimeout(() => {
        this.stop();
      }, CONFIG.duration);
    }
    
    logger.info('IoT Simulator started', {
      shipmentCount: CONFIG.shipmentCount,
      transmissionRate: CONFIG.transmissionRate,
      duration: CONFIG.duration
    });
  }
  
  // Stop the simulation
  stop() {
    console.log(chalk.yellow('\n🛑 Stopping IoT Simulator...\n'));
    
    this.isRunning = false;
    
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    
    // Final statistics
    const runtime = Math.floor((Date.now() - this.startTime) / 1000);
    const successRate = this.totalTransmissions > 0 ? 
      ((this.successfulTransmissions / this.totalTransmissions) * 100).toFixed(1) : '0.0';
    
    console.log(chalk.green.bold('📊 Final Statistics:'));
    console.log(chalk.green(`   Runtime: ${runtime} seconds`));
    console.log(chalk.green(`   Total Transmissions: ${this.totalTransmissions}`));
    console.log(chalk.green(`   Successful: ${this.successfulTransmissions}`));
    console.log(chalk.green(`   Failed: ${this.failedTransmissions}`));
    console.log(chalk.green(`   Success Rate: ${successRate}%`));
    
    this.shipments.forEach(shipment => {
      const status = shipment.getStatus();
      console.log(chalk.cyan(`   ${status.shipmentId}: ${status.telemetryCount} transmissions`));
    });
    
    logger.info('IoT Simulator stopped', {
      runtime,
      totalTransmissions: this.totalTransmissions,
      successfulTransmissions: this.successfulTransmissions,
      failedTransmissions: this.failedTransmissions,
      successRate: parseFloat(successRate)
    });
    
    process.exit(0);
  }
}

// Main execution
async function main() {
  const simulator = new IoTSimulator();
  
  // Graceful shutdown handling
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n📥 Received SIGINT, shutting down gracefully...'));
    simulator.stop();
  });
  
  process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n\n📥 Received SIGTERM, shutting down gracefully...'));
    simulator.stop();
  });
  
  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    console.log(chalk.red(`💥 Uncaught exception: ${error.message}`));
    simulator.stop();
  });
  
  try {
    simulator.initialize();
    simulator.start();
    
  } catch (error) {
    logger.error('Failed to start simulator', { error: error.message });
    console.log(chalk.red(`💥 Failed to start simulator: ${error.message}`));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { IoTSimulator, ShipmentSimulator };