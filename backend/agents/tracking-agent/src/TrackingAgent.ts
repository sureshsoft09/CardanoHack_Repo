import { EventEmitter } from 'events';

// Types
export interface Telemetry {
  shipmentId: string;
  deviceId: string;
  timestamp: Date;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  sensors?: {
    temperature?: number;
    humidity?: number;
    vibration?: number;
    shock?: number;
    tilt?: number;
  };
  battery?: number;
  signal?: {
    strength?: number;
    network?: string;
  };
}

export interface DigitalTwin {
  shipmentId: string;
  deviceId: string;
  createdAt: Date;
  lastUpdated: Date;
  currentLocation: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  telemetryHistory: Telemetry[];
  currentSensors?: {
    temperature?: number;
    humidity?: number;
    vibration?: number;
    shock?: number;
    tilt?: number;
  };
  batteryLevel?: number;
  signalInfo?: {
    strength?: number;
    network?: string;
  };
  alerts: Alert[];
  geofence?: Geofence;
  thresholds: SensorThresholds;
}

export interface Alert {
  id: string;
  type: 'temperature' | 'humidity' | 'vibration' | 'shock' | 'battery' | 'geofence' | 'signal';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value?: number;
  threshold?: number | string;
  timestamp: Date;
  resolved: boolean;
}

export interface Geofence {
  center: {
    latitude: number;
    longitude: number;
  };
  radius: number; // in meters
  allowedZones?: Array<{
    latitude: number;
    longitude: number;
    radius: number;
  }>;
}

export interface SensorThresholds {
  temperature: {
    min: number;
    max: number;
  };
  humidity: {
    max: number;
  };
  vibration: {
    max: number;
  };
  shock: {
    max: number;
  };
  battery: {
    min: number;
  };
  signal: {
    min: number;
  };
}

// Default thresholds
const DEFAULT_THRESHOLDS: SensorThresholds = {
  temperature: { min: -20, max: 60 },
  humidity: { max: 80 },
  vibration: { max: 5 },
  shock: { max: 10 },
  battery: { min: 20 },
  signal: { min: -90 }
};

export class TrackingAgent extends EventEmitter {
  private digitalTwins: Map<string, DigitalTwin>;
  private telemetryEmitter: EventEmitter;
  private maxHistorySize: number;

  constructor(telemetryEmitter: EventEmitter, maxHistorySize: number = 1000) {
    super();
    this.digitalTwins = new Map();
    this.telemetryEmitter = telemetryEmitter;
    this.maxHistorySize = maxHistorySize;
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Subscribe to telemetry events
    this.telemetryEmitter.on('telemetry:received', (telemetry: Telemetry) => {
      this.updateTelemetry(telemetry.shipmentId, telemetry);
    });

    // Subscribe to existing alert events and process them
    this.telemetryEmitter.on('telemetry:temperature-alert', (data: any) => {
      this.handleAlert(data.shipmentId, 'temperature', data.alertValue, data.threshold);
    });

    this.telemetryEmitter.on('telemetry:humidity-alert', (data: any) => {
      this.handleAlert(data.shipmentId, 'humidity', data.alertValue, data.threshold);
    });

    this.telemetryEmitter.on('telemetry:vibration-alert', (data: any) => {
      this.handleAlert(data.shipmentId, 'vibration', data.alertValue, data.threshold);
    });

    this.telemetryEmitter.on('telemetry:shock-alert', (data: any) => {
      this.handleAlert(data.shipmentId, 'shock', data.alertValue, data.threshold);
    });

    this.telemetryEmitter.on('telemetry:battery-low', (data: any) => {
      this.handleAlert(data.shipmentId, 'battery', data.alertValue, data.threshold);
    });
  }

  public updateTelemetry(shipmentId: string, telemetry: Telemetry): void {
    let twin = this.digitalTwins.get(shipmentId);
    
    if (!twin) {
      // Create new digital twin
      twin = this.createDigitalTwin(telemetry);
      this.digitalTwins.set(shipmentId, twin);
    } else {
      // Update existing twin
      twin.lastUpdated = new Date();
      twin.currentLocation = telemetry.location;
      twin.currentSensors = telemetry.sensors;
      twin.batteryLevel = telemetry.battery;
      twin.signalInfo = telemetry.signal;

      // Add to history and maintain size limit
      twin.telemetryHistory.push(telemetry);
      if (twin.telemetryHistory.length > this.maxHistorySize) {
        twin.telemetryHistory.shift(); // Remove oldest entry
      }
    }

    // Check for rule violations
    this.checkRules(twin, telemetry);

    // Emit update event
    this.emit('digital-twin:updated', {
      shipmentId,
      twin,
      telemetry
    });
  }

  public getDigitalTwin(shipmentId: string): DigitalTwin | undefined {
    return this.digitalTwins.get(shipmentId);
  }

  public getAllDigitalTwins(): DigitalTwin[] {
    return Array.from(this.digitalTwins.values());
  }

  public setGeofence(shipmentId: string, geofence: Geofence): void {
    const twin = this.digitalTwins.get(shipmentId);
    if (twin) {
      twin.geofence = geofence;
      this.emit('geofence:set', { shipmentId, geofence });
    }
  }

  public setThresholds(shipmentId: string, thresholds: Partial<SensorThresholds>): void {
    const twin = this.digitalTwins.get(shipmentId);
    if (twin) {
      twin.thresholds = { ...twin.thresholds, ...thresholds };
      this.emit('thresholds:updated', { shipmentId, thresholds: twin.thresholds });
    }
  }

  private createDigitalTwin(telemetry: Telemetry): DigitalTwin {
    return {
      shipmentId: telemetry.shipmentId,
      deviceId: telemetry.deviceId,
      createdAt: new Date(),
      lastUpdated: new Date(),
      currentLocation: telemetry.location,
      telemetryHistory: [telemetry],
      currentSensors: telemetry.sensors,
      batteryLevel: telemetry.battery,
      signalInfo: telemetry.signal,
      alerts: [],
      thresholds: { ...DEFAULT_THRESHOLDS }
    };
  }

  private checkRules(twin: DigitalTwin, telemetry: Telemetry): void {
    const alerts: Alert[] = [];

    // Check sensor thresholds
    if (telemetry.sensors) {
      const { temperature, humidity, vibration, shock } = telemetry.sensors;

      // Temperature check
      if (temperature !== undefined) {
        if (temperature < twin.thresholds.temperature.min || temperature > twin.thresholds.temperature.max) {
          alerts.push(this.createAlert(
            'temperature',
            temperature < twin.thresholds.temperature.min ? 'critical' : 'high',
            `Temperature ${temperature}°C is outside safe range (${twin.thresholds.temperature.min}°C to ${twin.thresholds.temperature.max}°C)`,
            temperature,
            `${twin.thresholds.temperature.min}°C to ${twin.thresholds.temperature.max}°C`
          ));
        }
      }

      // Humidity check
      if (humidity !== undefined && humidity > twin.thresholds.humidity.max) {
        alerts.push(this.createAlert(
          'humidity',
          'medium',
          `Humidity ${humidity}% exceeds maximum threshold of ${twin.thresholds.humidity.max}%`,
          humidity,
          twin.thresholds.humidity.max
        ));
      }

      // Vibration check
      if (vibration !== undefined && vibration > twin.thresholds.vibration.max) {
        alerts.push(this.createAlert(
          'vibration',
          'high',
          `Vibration ${vibration}g exceeds maximum threshold of ${twin.thresholds.vibration.max}g`,
          vibration,
          twin.thresholds.vibration.max
        ));
      }

      // Shock check
      if (shock !== undefined && shock > twin.thresholds.shock.max) {
        alerts.push(this.createAlert(
          'shock',
          'critical',
          `Shock ${shock}g exceeds maximum threshold of ${twin.thresholds.shock.max}g`,
          shock,
          twin.thresholds.shock.max
        ));
      }
    }

    // Battery check
    if (telemetry.battery !== undefined && telemetry.battery < twin.thresholds.battery.min) {
      alerts.push(this.createAlert(
        'battery',
        telemetry.battery < 10 ? 'critical' : 'medium',
        `Battery level ${telemetry.battery}% is below minimum threshold of ${twin.thresholds.battery.min}%`,
        telemetry.battery,
        twin.thresholds.battery.min
      ));
    }

    // Signal strength check
    if (telemetry.signal?.strength !== undefined && telemetry.signal.strength < twin.thresholds.signal.min) {
      alerts.push(this.createAlert(
        'signal',
        'low',
        `Signal strength ${telemetry.signal.strength}dBm is below minimum threshold of ${twin.thresholds.signal.min}dBm`,
        telemetry.signal.strength,
        twin.thresholds.signal.min
      ));
    }

    // Geofence check
    if (twin.geofence) {
      const isInGeofence = this.checkGeofence(telemetry.location, twin.geofence);
      if (!isInGeofence) {
        alerts.push(this.createAlert(
          'geofence',
          'high',
          `Shipment has left the designated geofence area`,
          undefined,
          'geofence boundary'
        ));
      }
    }

    // Add new alerts to twin and emit events
    if (alerts.length > 0) {
      twin.alerts.push(...alerts);
      
      alerts.forEach(alert => {
        this.emit('alert', {
          shipmentId: twin.shipmentId,
          deviceId: twin.deviceId,
          alert,
          telemetry,
          twin
        });
      });
    }
  }

  private createAlert(
    type: Alert['type'],
    severity: Alert['severity'],
    message: string,
    value?: number,
    threshold?: number | string
  ): Alert {
    return {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: new Date(),
      resolved: false
    };
  }

  private checkGeofence(location: { latitude: number; longitude: number }, geofence: Geofence): boolean {
    const distance = this.calculateDistance(
      location.latitude,
      location.longitude,
      geofence.center.latitude,
      geofence.center.longitude
    );

    // Check main geofence
    if (distance <= geofence.radius) {
      return true;
    }

    // Check allowed zones if any
    if (geofence.allowedZones) {
      return geofence.allowedZones.some(zone => {
        const zoneDistance = this.calculateDistance(
          location.latitude,
          location.longitude,
          zone.latitude,
          zone.longitude
        );
        return zoneDistance <= zone.radius;
      });
    }

    return false;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private handleAlert(shipmentId: string, type: string, value: number, threshold: string): void {
    const twin = this.digitalTwins.get(shipmentId);
    if (twin) {
      // This method can be used to sync with existing alert system
      // The main rule checking is done in checkRules method
    }
  }

  public resolveAlert(shipmentId: string, alertId: string): void {
    const twin = this.digitalTwins.get(shipmentId);
    if (twin) {
      const alert = twin.alerts.find(a => a.id === alertId);
      if (alert) {
        alert.resolved = true;
        this.emit('alert:resolved', { shipmentId, alertId, alert });
      }
    }
  }

  public getActiveAlerts(shipmentId: string): Alert[] {
    const twin = this.digitalTwins.get(shipmentId);
    return twin ? twin.alerts.filter(alert => !alert.resolved) : [];
  }

  public getTelemetryHistory(shipmentId: string, limit?: number): Telemetry[] {
    const twin = this.digitalTwins.get(shipmentId);
    if (!twin) return [];
    
    const history = twin.telemetryHistory;
    return limit ? history.slice(-limit) : history;
  }
}