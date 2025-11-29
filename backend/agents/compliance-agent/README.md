# Compliance Agent

A TypeScript-based compliance monitoring agent for the Smart Freight Management System that processes telemetry events, evaluates compliance rules, and generates invoices for violations.

## Features

- **Rule-Based Monitoring**: Configurable JSON-based compliance rules
- **Event Subscription**: Real-time processing of tracking agent events  
- **Automatic Invoice Generation**: ADA-based invoicing for compliance violations
- **Masumi Integration**: Payment service and agent registry integration
- **Severity-Based Actions**: Configurable responses (warn, alert, invoice, suspend)
- **Evidence Tracking**: Comprehensive violation documentation

## Architecture

### Core Components

1. **ComplianceAgent**: Main orchestrator class
2. **Rule Engine**: JSON-configurable compliance rules
3. **Invoice Generator**: ADA-based billing system
4. **Masumi Integration**: Payment and agent registration stubs
5. **Event Processing**: Tracking agent event subscription

### Rule Categories

- **Temperature**: Cold chain and ambient temperature monitoring
- **Location**: Route deviation and geofence violations  
- **Timing**: Delivery delays and schedule compliance
- **Handling**: Vibration, shock, and rough handling detection
- **Security**: Device status and data integrity

## Configuration

### Compliance Rules (`config/compliance-rules.json`)

```json
{
  "version": "1.0.0",
  "globalSettings": {
    "defaultCurrency": "ADA",
    "baseInvoiceAmount": 10,
    "severityMultipliers": {
      "low": 1, "medium": 2, "high": 5, "critical": 10
    }
  },
  "rules": [
    {
      "id": "TEMP_COLD_CHAIN",
      "name": "Cold Chain Temperature Violation",
      "enabled": true,
      "severity": "critical", 
      "category": "temperature",
      "parameters": {
        "tempThreshold": { "min": -20, "max": 5 }
      },
      "action": "invoice",
      "invoiceAmount": 50
    }
  ]
}
```

### Rule Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `tempThreshold` | Min/max temperature limits | `{"min": -20, "max": 60}` |
| `maxDeviationMeters` | Route deviation tolerance | `5000` |
| `maxDelayMins` | Delivery delay threshold | `60` |
| `vibrationThreshold` | Max vibration (g-force) | `8` |
| `shockThreshold` | Max shock (g-force) | `12` |
| `humidityThreshold` | Max humidity percentage | `{"max": 85}` |

## Usage

### Initialization

```typescript
import { ComplianceAgent } from './complianceAgent';

const agent = new ComplianceAgent({
  trackingAgentUrl: 'http://localhost:3001',
  masumiPaymentUrl: 'http://localhost:4001',
  rulesFilePath: './config/compliance-rules.json'
});

await agent.initialize();
```

### Event Processing

```typescript
// Handle tracking agent events
await agent.handleTelemetryEvent({
  shipmentId: 'SHIP-001',
  deviceId: 'DEV-001', 
  timestamp: new Date(),
  eventType: 'alert',
  data: { /* telemetry data */ },
  alert: {
    id: 'alert-123',
    type: 'temperature',
    severity: 'critical',
    message: 'Temperature -25°C exceeds threshold',
    value: -25,
    threshold: -20
  }
});
```

### Invoice Generation

```typescript
// Generate invoice for violation
const invoice = agent.generateInvoice(violation);
// Returns:
// {
//   invoiceId: "uuid",
//   amountAda: 50,
//   description: "Cold chain violation - Temperature -25°C",
//   shipmentId: "SHIP-001",
//   currency: "ADA",
//   dueDate: "2025-12-06T00:00:00.000Z"
// }
```

## Event System

### Emitted Events

- `violation:detected` - New compliance violation identified
- `paidVerificationRequired` - Invoice generated, payment needed
- `rules:updated` - Compliance rules configuration changed

### Event Subscription

```typescript
agent.on('paidVerificationRequired', (event) => {
  console.log(`Invoice ${event.invoice.invoiceId} for ${event.violation.shipmentId}`);
  console.log(`Amount: ${event.invoice.amountAda} ADA`);
});

agent.on('violation:detected', (violation) => {
  console.log(`Violation: ${violation.ruleName} - ${violation.severity}`);
});
```

## Masumi Integration

### Payment Service Stubs

```typescript
// Send invoice via Masumi payment service
await agent.sendInvoiceViaMasumi(invoice);

// Payment request format:
{
  recipientAddress: "addr1_compliance_agent",
  amount: 50,
  currency: "ADA", 
  description: "Temperature violation invoice",
  metadata: {
    invoiceId: "uuid",
    shipmentId: "SHIP-001",
    violationId: "violation-uuid"
  }
}
```

### Agent Registration

```typescript
// Auto-registration with Masumi agent registry
{
  agentId: "compliance-agent-uuid",
  name: "Smart Freight Compliance Agent",
  type: "compliance",
  capabilities: [
    "rule_monitoring",
    "violation_detection", 
    "invoice_generation",
    "payment_processing"
  ],
  endpoint: "http://localhost:3003"
}
```

## API Methods

### Public Interface

```typescript
// Get current rules configuration
const rules = agent.getRules();

// Get all violations
const violations = agent.getViolations();

// Get all invoices  
const invoices = agent.getInvoices();

// Update rules configuration
await agent.updateRules(newRulesConfig);

// Get specific records
const violation = agent.getViolationById(id);
const invoice = agent.getInvoiceById(id);
```

## Development

### Quick Start

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Production start
npm start
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3003 | Service port |
| TRACKING_AGENT_URL | http://localhost:3001 | Tracking agent endpoint |
| MASUMI_PAYMENT_URL | http://localhost:4001 | Masumi payment service |
| RULES_FILE_PATH | ./config/compliance-rules.json | Rules configuration |

## Integration Flow

1. **Event Reception**: Receives alerts from Tracking Agent
2. **Rule Evaluation**: Matches events against compliance rules
3. **Violation Detection**: Creates violation records with evidence
4. **Invoice Generation**: Calculates ADA amounts with severity multipliers
5. **Payment Processing**: Forwards invoices to Masumi payment service
6. **Event Emission**: Notifies Settlement Agent of payment requirements

Perfect for demonstrating automated compliance monitoring with blockchain-based settlement in your Smart Freight Management System.