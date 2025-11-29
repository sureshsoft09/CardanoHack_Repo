# Masumi Payment Service

A Node.js Express service that handles invoice creation, payment processing, and webhook notifications for the Smart Freight Management System using Cardano/ADA payments.

## Features

- **Invoice Creation**: POST /invoice/create with ADA/Lovelace support
- **Payment Webhooks**: POST /payment/webhook for Masumi payment confirmations
- **Invoice Management**: GET /invoices/:id and listing with pagination
- **Masumi Integration**: Ready-to-implement SDK integration points
- **Memory Storage**: In-memory Maps with production database TODOs
- **Cardano Support**: ADA ↔ Lovelace conversion and wallet generation

## API Endpoints

### Create Invoice
```http
POST /invoice/create
Content-Type: application/json

{
  "recipientAddress": "addr1_recipient_address",
  "amount": 50,
  "currency": "ADA",
  "description": "Compliance violation: Cold chain breach",
  "metadata": {
    "shipmentId": "SHIP-001",
    "violationId": "violation-uuid",
    "complianceAgentId": "agent-uuid"
  },
  "webhookUrl": "http://compliance-agent:3003/payment-confirmed"
}
```

**Response:**
```json
{
  "invoiceId": "uuid",
  "amount": 50,
  "currency": "ADA", 
  "status": "pending",
  "dueDate": "2025-12-06T00:00:00.000Z",
  "payment": {
    "paymentId": "uuid",
    "paymentAddress": "addr_test1...",
    "amountLovelace": 50000000,
    "expiresAt": "2025-11-30T10:00:00.000Z",
    "qrCode": "cardano:addr_test1...?amount=50000000",
    "deepLink": "https://wallet.example.com/pay?address=..."
  }
}
```

### Payment Webhook
```http
POST /payment/webhook
Content-Type: application/json
X-Masumi-Signature: sha256=signature

{
  "event": "payment.confirmed",
  "invoiceId": "uuid",
  "transactionHash": "tx_hash_from_cardano",
  "amount": 50000000,
  "currency": "LOVELACE", 
  "timestamp": "2025-11-29T10:00:00.000Z",
  "blockHeight": 12345678,
  "confirmations": 6
}
```

### Get Invoice
```http
GET /invoices/:id
```

### List Invoices
```http
GET /invoices?page=1&limit=50&status=paid
```

## Masumi SDK Integration Points

### 1. Wallet Generation
```javascript
// TODO: Replace with actual Masumi SDK
function generateWalletAddress() {
  // const wallet = await MasumiSDK.createWallet();
  // return wallet.address;
  
  // Current: Mock implementation
  return `addr_test1${crypto.randomBytes(20).toString('hex')}`;
}
```

### 2. Payment Request Creation
```javascript
async function createMasumiPaymentRequest(invoiceData) {
  // TODO: Replace with actual Masumi SDK
  // const paymentRequest = await MasumiSDK.createPaymentRequest({
  //   amount: invoiceData.amountLovelace,
  //   currency: 'LOVELACE',
  //   description: invoiceData.description,
  //   webhookUrl: process.env.WEBHOOK_BASE_URL + '/payment/webhook'
  // });
  
  // Current: Mock implementation
  return mockPaymentRequest;
}
```

### 3. API Calls
```javascript
async function callMasumiAPI(endpoint, method, data) {
  // TODO: Replace with actual Masumi SDK
  // const masumi = new MasumiSDK({
  //   apiKey: MASUMI_CONFIG.apiKey,
  //   network: MASUMI_CONFIG.network
  // });
  // return await masumi.call(endpoint, method, data);
  
  // Current: Mock implementation
  return mockApiResponse;
}
```

### 4. Webhook Validation
```javascript
function validateWebhookSignature(payload, signature, secret) {
  // TODO: Replace with Masumi SDK validation
  // return MasumiSDK.validateWebhook(payload, signature, secret);
  
  // Current: HMAC SHA-256 validation
  return crypto.createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex') === signature.replace('sha256=', '');
}
```

## Environment Configuration

### Required Environment Variables

```env
# Masumi Integration - REPLACE WITH REAL VALUES
MASUMI_API_URL=https://api.masumi.example.com
MASUMI_API_KEY=masumi_api_key_placeholder_replace_with_real_key
MASUMI_WEBHOOK_SECRET=webhook_secret_placeholder_change_in_production

# Cardano Network
CARDANO_NETWORK=testnet  # or mainnet for production

# Service Configuration
PORT=4001
WEBHOOK_BASE_URL=http://localhost:4001
```

### Database Migration Path

```env
# TODO: Replace in-memory storage with PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/masumi_payments

# TODO: Add Redis for caching
REDIS_URL=redis://localhost:6379
```

## Usage Examples

### Integration with Compliance Agent

```javascript
// Compliance Agent creates invoice
const invoiceResponse = await axios.post('http://localhost:4001/invoice/create', {
  recipientAddress: 'addr1_compliance_agent',
  amount: 50,
  currency: 'ADA',
  description: 'Cold chain violation: SHIP-001',
  metadata: {
    shipmentId: 'SHIP-001',
    violationId: 'violation-uuid'
  },
  webhookUrl: 'http://localhost:3003/payment-confirmed'
});

console.log(`Payment address: ${invoiceResponse.data.payment.paymentAddress}`);
console.log(`QR Code: ${invoiceResponse.data.payment.qrCode}`);
```

### Webhook Processing
```javascript
// When payment is confirmed, webhook is called
// Invoice status automatically updated to 'paid'
// Compliance agent receives notification at webhookUrl
```

## Development

### Quick Start
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Start development server
npm run dev

# Production build
npm run build
npm start
```

### Testing Webhooks
```bash
# Simulate payment confirmation
curl -X POST http://localhost:4001/payment/webhook \
  -H "Content-Type: application/json" \
  -H "X-Masumi-Signature: sha256=test_signature" \
  -d '{
    "event": "payment.confirmed",
    "invoiceId": "your-invoice-id",
    "transactionHash": "tx_test123",
    "amount": 50000000,
    "currency": "LOVELACE",
    "timestamp": "2025-11-29T10:00:00.000Z",
    "confirmations": 6
  }'
```

### Manual Status Update (Testing)
```bash
# Manually update invoice status
curl -X PUT http://localhost:4001/invoices/invoice-id/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paid",
    "transactionHash": "tx_manual_test123"
  }'
```

## Currency Conversion

- **ADA to Lovelace**: 1 ADA = 1,000,000 Lovelace  
- **Automatic conversion** in API responses
- **QR codes** use Lovelace for Cardano wallets
- **Deep links** for wallet integration

## Integration Flow

1. **Compliance Agent** detects violation
2. **Creates invoice** via POST /invoice/create
3. **Receives payment details** (address, QR code)
4. **User pays** via Cardano wallet
5. **Masumi confirms** payment via webhook
6. **Invoice status** updated to 'paid'
7. **Compliance Agent** notified via webhookUrl

Perfect for demonstrating blockchain-based automated billing in your Smart Freight Management System! 🚛💰