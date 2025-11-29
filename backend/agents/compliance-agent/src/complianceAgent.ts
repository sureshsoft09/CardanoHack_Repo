import { EventEmitter } from 'events';
import axios, { AxiosResponse } from 'axios';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import * as fs from 'fs';
import * as path from 'path';

// Types and Interfaces
export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'temperature' | 'location' | 'timing' | 'handling' | 'security';
  parameters: {
    tempThreshold?: {
      min: number;
      max: number;
    };
    maxDeviationMeters?: number;
    maxDelayMins?: number;
    vibrationThreshold?: number;
    shockThreshold?: number;
    humidityThreshold?: {
      max: number;
    };
  };
  action: 'warn' | 'alert' | 'invoice' | 'suspend';
  invoiceAmount?: number; // in ADA
}

export interface ComplianceRuleSet {
  version: string;
  lastUpdated: string;
  rules: ComplianceRule[];
  globalSettings: {
    defaultCurrency: string;
    baseInvoiceAmount: number;
    severityMultipliers: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
  };
}

export interface TelemetryEvent {
  shipmentId: string;
  deviceId: string;
  timestamp: Date;
  eventType: 'telemetry:received' | 'alert' | 'digital-twin:updated';
  data: any;
  alert?: {
    id: string;
    type: string;
    severity: string;
    message: string;
    value?: number;
    threshold?: number | string;
  };
}

export interface ComplianceViolation {
  id: string;
  shipmentId: string;
  deviceId: string;
  ruleId: string;
  ruleName: string;
  severity: string;
  category: string;
  timestamp: Date;
  description: string;
  evidence: any;
  status: 'detected' | 'processing' | 'invoiced' | 'resolved' | 'dismissed';
  invoiceId?: string;
}

export interface Invoice {
  invoiceId: string;
  amountAda: number;
  description: string;
  shipmentId: string;
  violationId: string;
  currency: string;
  dueDate: Date;
  createdAt: Date;
  status: 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentAddress?: string;
  transactionHash?: string;
  metadata: {
    ruleViolated: string;
    severity: string;
    evidenceHash?: string;
  };
}

export interface MasumiPaymentRequest {
  recipientAddress: string;
  amount: number;
  currency: string;
  description: string;
  metadata: {
    invoiceId: string;
    shipmentId: string;
    violationId: string;
  };
}

export interface MasumiAgentRegistration {
  agentId: string;
  name: string;
  type: 'compliance' | 'tracking' | 'settlement';
  capabilities: string[];
  endpoint: string;
  publicKey?: string;
}

// Compliance Agent Implementation
export class ComplianceAgent extends EventEmitter {
  private logger: winston.Logger;
  private rules: ComplianceRuleSet;
  private violations: Map<string, ComplianceViolation>;
  private invoices: Map<string, Invoice>;
  private trackingAgentUrl: string;
  private masumiPaymentUrl: string;
  private masumiAgentUrl: string;
  private isActive: boolean;
  private rulesFilePath: string;

  constructor(config: {
    trackingAgentUrl?: string;
    masumiPaymentUrl?: string;
    masumiAgentUrl?: string;
    rulesFilePath?: string;
    logLevel?: string;
  } = {}) {
    super();
    
    this.trackingAgentUrl = config.trackingAgentUrl || process.env.TRACKING_AGENT_URL || 'http://localhost:3001';
    this.masumiPaymentUrl = config.masumiPaymentUrl || process.env.MASUMI_PAYMENT_URL || 'http://localhost:4001';
    this.masumiAgentUrl = config.masumiAgentUrl || process.env.MASUMI_AGENT_URL || 'http://localhost:4002';
    this.rulesFilePath = config.rulesFilePath || path.join(__dirname, '../config/compliance-rules.json');
    
    this.violations = new Map();
    this.invoices = new Map();
    this.isActive = false;
    
    // Initialize logger
    this.logger = winston.createLogger({
      level: config.logLevel || process.env.LOG_LEVEL || 'info',
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

    // Load default rules
    this.rules = this.getDefaultRules();
  }

  // Initialize the compliance agent
  public async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Compliance Agent', {
        trackingAgentUrl: this.trackingAgentUrl,
        masumiPaymentUrl: this.masumiPaymentUrl,
        rulesFilePath: this.rulesFilePath
      });

      // Load rules from file if exists
      await this.loadRules();

      // Register with Masumi agent registry
      await this.registerWithMasumi();

      // Subscribe to tracking agent events
      this.subscribeToTrackingEvents();

      this.isActive = true;
      this.logger.info('Compliance Agent initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize Compliance Agent', { error });
      throw error;
    }
  }

  // Load compliance rules from JSON file
  private async loadRules(): Promise<void> {
    try {
      if (fs.existsSync(this.rulesFilePath)) {
        const rulesData = fs.readFileSync(this.rulesFilePath, 'utf8');
        const loadedRules = JSON.parse(rulesData);
        
        // Validate rules format
        const validationResult = this.validateRules(loadedRules);
        if (validationResult.isValid) {
          this.rules = loadedRules;
          this.logger.info('Rules loaded successfully', {
            version: this.rules.version,
            ruleCount: this.rules.rules.length
          });
        } else {
          this.logger.warn('Invalid rules file format, using defaults', {
            errors: validationResult.errors
          });
        }
      } else {
        this.logger.info('Rules file not found, creating default rules file');
        await this.saveRules();
      }
    } catch (error) {
      this.logger.error('Error loading rules', { error });
      // Fall back to default rules
      this.rules = this.getDefaultRules();
    }
  }

  // Save rules to JSON file
  private async saveRules(): Promise<void> {
    try {
      const rulesDir = path.dirname(this.rulesFilePath);
      if (!fs.existsSync(rulesDir)) {
        fs.mkdirSync(rulesDir, { recursive: true });
      }
      
      fs.writeFileSync(this.rulesFilePath, JSON.stringify(this.rules, null, 2));
      this.logger.info('Rules saved successfully', { path: this.rulesFilePath });
    } catch (error) {
      this.logger.error('Error saving rules', { error });
    }
  }

  // Get default compliance rules
  private getDefaultRules(): ComplianceRuleSet {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      globalSettings: {
        defaultCurrency: 'ADA',
        baseInvoiceAmount: 10,
        severityMultipliers: {
          low: 1,
          medium: 2,
          high: 5,
          critical: 10
        }
      },
      rules: [
        {
          id: 'TEMP_COLD_CHAIN',
          name: 'Cold Chain Temperature Violation',
          description: 'Temperature outside acceptable range for cold chain cargo',
          enabled: true,
          severity: 'critical',
          category: 'temperature',
          parameters: {
            tempThreshold: {
              min: -20,
              max: 5
            }
          },
          action: 'invoice',
          invoiceAmount: 50
        },
        {
          id: 'TEMP_AMBIENT',
          name: 'Ambient Temperature Violation',
          description: 'Temperature outside safe range for standard cargo',
          enabled: true,
          severity: 'high',
          category: 'temperature',
          parameters: {
            tempThreshold: {
              min: -10,
              max: 60
            }
          },
          action: 'invoice',
          invoiceAmount: 25
        },
        {
          id: 'LOCATION_DEVIATION',
          name: 'Route Deviation',
          description: 'Shipment deviated from planned route',
          enabled: true,
          severity: 'medium',
          category: 'location',
          parameters: {
            maxDeviationMeters: 5000
          },
          action: 'invoice',
          invoiceAmount: 15
        },
        {
          id: 'DELIVERY_DELAY',
          name: 'Delivery Delay',
          description: 'Shipment arrival delayed beyond acceptable threshold',
          enabled: true,
          severity: 'medium',
          category: 'timing',
          parameters: {
            maxDelayMins: 60
          },
          action: 'alert'
        },
        {
          id: 'ROUGH_HANDLING',
          name: 'Rough Handling',
          description: 'Excessive vibration or shock detected',
          enabled: true,
          severity: 'high',
          category: 'handling',
          parameters: {
            vibrationThreshold: 8,
            shockThreshold: 12
          },
          action: 'invoice',
          invoiceAmount: 30
        },
        {
          id: 'HUMIDITY_EXCESS',
          name: 'Excessive Humidity',
          description: 'Humidity levels exceeded safe limits',
          enabled: true,
          severity: 'medium',
          category: 'temperature',
          parameters: {
            humidityThreshold: {
              max: 85
            }
          },
          action: 'warn'
        }
      ]
    };
  }

  // Validate rules format
  private validateRules(rules: any): { isValid: boolean; errors?: string[] } {
    const schema = Joi.object({
      version: Joi.string().required(),
      lastUpdated: Joi.string().isoDate().required(),
      globalSettings: Joi.object({
        defaultCurrency: Joi.string().required(),
        baseInvoiceAmount: Joi.number().positive().required(),
        severityMultipliers: Joi.object({
          low: Joi.number().positive().required(),
          medium: Joi.number().positive().required(),
          high: Joi.number().positive().required(),
          critical: Joi.number().positive().required()
        }).required()
      }).required(),
      rules: Joi.array().items(
        Joi.object({
          id: Joi.string().required(),
          name: Joi.string().required(),
          description: Joi.string().required(),
          enabled: Joi.boolean().required(),
          severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
          category: Joi.string().valid('temperature', 'location', 'timing', 'handling', 'security').required(),
          action: Joi.string().valid('warn', 'alert', 'invoice', 'suspend').required(),
          parameters: Joi.object().optional(),
          invoiceAmount: Joi.number().positive().optional()
        })
      ).required()
    });

    const { error } = schema.validate(rules);
    
    if (error) {
      return {
        isValid: false,
        errors: error.details.map(detail => detail.message)
      };
    }

    return { isValid: true };
  }

  // Subscribe to tracking agent events
  private subscribeToTrackingEvents(): void {
    // TODO: Implement WebSocket or HTTP polling to tracking agent events
    // For now, simulate event subscription
    this.logger.info('Subscribing to Tracking Agent events', {
      url: this.trackingAgentUrl
    });

    // Simulate periodic event polling
    setInterval(() => {
      if (this.isActive) {
        this.pollTrackingEvents();
      }
    }, 5000); // Poll every 5 seconds
  }

  // Poll tracking agent for new events (stub implementation)
  private async pollTrackingEvents(): Promise<void> {
    try {
      // TODO: Replace with actual WebSocket or Server-Sent Events
      // This is a placeholder for demonstration
      this.logger.debug('Polling tracking agent for events');
      
      // In real implementation, this would be event-driven
      // For now, we'll process events when they come through handleTelemetryEvent
      
    } catch (error) {
      this.logger.error('Error polling tracking events', { error });
    }
  }

  // Handle telemetry events from tracking agent
  public async handleTelemetryEvent(event: TelemetryEvent): Promise<void> {
    try {
      this.logger.debug('Processing telemetry event', {
        shipmentId: event.shipmentId,
        eventType: event.eventType,
        hasAlert: !!event.alert
      });

      // Process alerts from tracking agent
      if (event.alert) {
        await this.processAlert(event);
      }

      // Evaluate compliance rules
      await this.evaluateCompliance(event);

    } catch (error) {
      this.logger.error('Error handling telemetry event', {
        shipmentId: event.shipmentId,
        error
      });
    }
  }

  // Process alerts from tracking agent
  private async processAlert(event: TelemetryEvent): Promise<void> {
    const alert = event.alert!;
    
    this.logger.info('Processing alert from tracking agent', {
      shipmentId: event.shipmentId,
      alertType: alert.type,
      severity: alert.severity,
      value: alert.value
    });

    // Find applicable rules
    const applicableRules = this.rules.rules.filter(rule => 
      rule.enabled && this.isRuleApplicable(rule, alert)
    );

    for (const rule of applicableRules) {
      const violation = await this.createViolation(event, rule, alert);
      
      if (rule.action === 'invoice' && rule.severity === 'critical' || rule.severity === 'high') {
        await this.processViolationForInvoice(violation);
      }
    }
  }

  // Check if rule is applicable to alert
  private isRuleApplicable(rule: ComplianceRule, alert: any): boolean {
    switch (rule.category) {
      case 'temperature':
        return alert.type === 'temperature';
      case 'handling':
        return alert.type === 'vibration' || alert.type === 'shock';
      case 'location':
        return alert.type === 'geofence';
      default:
        return false;
    }
  }

  // Evaluate compliance rules against telemetry data
  private async evaluateCompliance(event: TelemetryEvent): Promise<void> {
    // Additional custom compliance logic beyond tracking agent alerts
    this.logger.debug('Evaluating custom compliance rules', {
      shipmentId: event.shipmentId
    });

    // Example: Check for patterns that might not trigger immediate alerts
    // but still constitute compliance violations
  }

  // Create compliance violation record
  private async createViolation(
    event: TelemetryEvent, 
    rule: ComplianceRule, 
    alert: any
  ): Promise<ComplianceViolation> {
    const violation: ComplianceViolation = {
      id: uuidv4(),
      shipmentId: event.shipmentId,
      deviceId: event.deviceId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      category: rule.category,
      timestamp: new Date(),
      description: `${rule.description}: ${alert.message}`,
      evidence: {
        originalEvent: event,
        alert,
        telemetrySnapshot: event.data
      },
      status: 'detected'
    };

    this.violations.set(violation.id, violation);
    
    this.logger.warn('Compliance violation detected', {
      violationId: violation.id,
      shipmentId: violation.shipmentId,
      rule: rule.name,
      severity: rule.severity
    });

    // Emit violation event
    this.emit('violation:detected', violation);

    return violation;
  }

  // Process violation for invoice generation
  private async processViolationForInvoice(violation: ComplianceViolation): Promise<void> {
    try {
      this.logger.info('Processing violation for invoice generation', {
        violationId: violation.id,
        shipmentId: violation.shipmentId
      });

      // Generate invoice
      const invoice = this.generateInvoice(violation);
      this.invoices.set(invoice.invoiceId, invoice);

      // Update violation status
      violation.status = 'invoiced';
      violation.invoiceId = invoice.invoiceId;

      // Emit paid verification required event
      this.emit('paidVerificationRequired', {
        violation,
        invoice,
        shipmentId: violation.shipmentId,
        timestamp: new Date()
      });

      this.logger.info('Paid verification required event emitted', {
        violationId: violation.id,
        invoiceId: invoice.invoiceId,
        amount: invoice.amountAda
      });

      // Send invoice via Masumi payment service
      await this.sendInvoiceViaMasumi(invoice);

    } catch (error) {
      this.logger.error('Error processing violation for invoice', {
        violationId: violation.id,
        error
      });
    }
  }

  // Generate invoice for compliance violation
  public generateInvoice(violation: ComplianceViolation): Invoice {
    const rule = this.rules.rules.find(r => r.id === violation.ruleId);
    const baseAmount = rule?.invoiceAmount || this.rules.globalSettings.baseInvoiceAmount;
    const severityMultiplier = this.rules.globalSettings.severityMultipliers[violation.severity as keyof typeof this.rules.globalSettings.severityMultipliers];
    
    const invoice: Invoice = {
      invoiceId: uuidv4(),
      amountAda: baseAmount * severityMultiplier,
      description: `Compliance violation: ${violation.ruleName} - ${violation.description}`,
      shipmentId: violation.shipmentId,
      violationId: violation.id,
      currency: this.rules.globalSettings.defaultCurrency,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      createdAt: new Date(),
      status: 'pending',
      metadata: {
        ruleViolated: violation.ruleName,
        severity: violation.severity,
        evidenceHash: this.generateEvidenceHash(violation.evidence)
      }
    };

    this.logger.info('Invoice generated', {
      invoiceId: invoice.invoiceId,
      amount: invoice.amountAda,
      shipmentId: invoice.shipmentId,
      violation: violation.ruleName
    });

    return invoice;
  }

  // Generate evidence hash for blockchain verification
  private generateEvidenceHash(evidence: any): string {
    // TODO: Implement proper cryptographic hashing
    // For now, return a mock hash
    return `hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Send invoice via Masumi payment service (stub)
  private async sendInvoiceViaMasumi(invoice: Invoice): Promise<void> {
    try {
      this.logger.info('Sending invoice via Masumi payment service', {
        invoiceId: invoice.invoiceId,
        amount: invoice.amountAda
      });

      const paymentRequest: MasumiPaymentRequest = {
        recipientAddress: process.env.COMPLIANCE_AGENT_ADDRESS || 'addr1_compliance_agent_placeholder',
        amount: invoice.amountAda,
        currency: invoice.currency,
        description: invoice.description,
        metadata: {
          invoiceId: invoice.invoiceId,
          shipmentId: invoice.shipmentId,
          violationId: invoice.violationId
        }
      };

      // TODO: Replace with actual Masumi API call
      const response = await this.callMasumiPaymentAPI('/invoices', 'POST', paymentRequest);
      
      if (response.success) {
        invoice.status = 'sent';
        invoice.paymentAddress = response.data.paymentAddress;
        
        this.logger.info('Invoice sent successfully via Masumi', {
          invoiceId: invoice.invoiceId,
          paymentAddress: invoice.paymentAddress
        });
      } else {
        throw new Error(`Masumi payment API error: ${response.error}`);
      }

    } catch (error) {
      this.logger.error('Error sending invoice via Masumi', {
        invoiceId: invoice.invoiceId,
        error
      });
      
      // Keep invoice in pending state for retry
      invoice.status = 'pending';
    }
  }

  // Register agent with Masumi agent registry (stub)
  private async registerWithMasumi(): Promise<void> {
    try {
      this.logger.info('Registering with Masumi agent registry');

      const registration: MasumiAgentRegistration = {
        agentId: `compliance-agent-${uuidv4()}`,
        name: 'Smart Freight Compliance Agent',
        type: 'compliance',
        capabilities: [
          'rule_monitoring',
          'violation_detection',
          'invoice_generation',
          'payment_processing'
        ],
        endpoint: process.env.COMPLIANCE_AGENT_ENDPOINT || 'http://localhost:3003'
      };

      // TODO: Replace with actual Masumi agent registration API
      const response = await this.callMasumiAgentAPI('/agents/register', 'POST', registration);
      
      if (response.success) {
        this.logger.info('Successfully registered with Masumi', {
          agentId: registration.agentId
        });
      } else {
        this.logger.warn('Failed to register with Masumi', {
          error: response.error
        });
      }

    } catch (error) {
      this.logger.warn('Error registering with Masumi agent registry', { error });
      // Continue operation even if registration fails
    }
  }

  // Call Masumi Payment Service API (stub)
  private async callMasumiPaymentAPI(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', 
    data?: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      this.logger.debug('Calling Masumi Payment API', {
        endpoint: `${this.masumiPaymentUrl}${endpoint}`,
        method
      });

      // TODO: Replace with actual HTTP call when Masumi service is available
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mock successful response
      return {
        success: true,
        data: {
          paymentAddress: `addr1_${Math.random().toString(36).substr(2, 20)}`,
          transactionId: `tx_${uuidv4()}`,
          status: 'created'
        }
      };

    } catch (error) {
      this.logger.error('Masumi Payment API call failed', {
        endpoint,
        method,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Call Masumi Agent Registry API (stub)
  private async callMasumiAgentAPI(
    endpoint: string, 
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', 
    data?: any
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      this.logger.debug('Calling Masumi Agent API', {
        endpoint: `${this.masumiAgentUrl}${endpoint}`,
        method
      });

      // TODO: Replace with actual HTTP call when Masumi service is available
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mock successful response
      return {
        success: true,
        data: {
          registered: true,
          agentId: data?.agentId || uuidv4(),
          status: 'active'
        }
      };

    } catch (error) {
      this.logger.error('Masumi Agent API call failed', {
        endpoint,
        method,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Public API methods for external access
  public getRules(): ComplianceRuleSet {
    return this.rules;
  }

  public getViolations(): ComplianceViolation[] {
    return Array.from(this.violations.values());
  }

  public getInvoices(): Invoice[] {
    return Array.from(this.invoices.values());
  }

  public getViolationById(id: string): ComplianceViolation | undefined {
    return this.violations.get(id);
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.get(id);
  }

  // Update rules configuration
  public async updateRules(newRules: ComplianceRuleSet): Promise<void> {
    const validationResult = this.validateRules(newRules);
    
    if (!validationResult.isValid) {
      throw new Error(`Invalid rules: ${validationResult.errors?.join(', ')}`);
    }

    this.rules = {
      ...newRules,
      lastUpdated: new Date().toISOString()
    };

    await this.saveRules();
    
    this.logger.info('Rules updated successfully', {
      version: this.rules.version,
      ruleCount: this.rules.rules.length
    });

    this.emit('rules:updated', this.rules);
  }

  // Stop the compliance agent
  public async stop(): Promise<void> {
    this.isActive = false;
    this.logger.info('Compliance Agent stopped');
  }
}