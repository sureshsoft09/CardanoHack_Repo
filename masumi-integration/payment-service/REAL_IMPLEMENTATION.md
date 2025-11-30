# Cardano Payment Service - Real Implementation

A Node.js Express service that handles invoice creation, payment processing, and **real-time Cardano blockchain monitoring** for the Smart Freight Management System.

## 🎯 Real Cardano Integration

This service uses **real Cardano blockchain functionality** - not mock code:

✅ **Real wallet addresses** generated using `@emurgo/cardano-serialization-lib-nodejs`  
✅ **Blockfrost API integration** for blockchain queries and transaction verification  
✅ **Automatic payment detection** by monitoring addresses every 20 seconds  
✅ **Transaction confirmation** checking with configurable confirmations  
✅ **No mock data** - all payments are tracked on actual Cardano testnet/mainnet  

## 🚀 Features

- **Real Cardano Address Generation**: Creates actual Cardano addresses using ED25519 cryptography
- **Blockfrost API Integration**: Connects to Cardano blockchain for balance and transaction queries
- **Automatic Payment Monitoring**: Background process checks addresses every 20 seconds
- **Transaction Verification**: Checks blockchain confirmations before marking payments complete
- **Invoice Management**: Create, retrieve, and list invoices with pagination
- **Webhook Notifications**: Automatic callbacks when payments are confirmed
- **ADA/Lovelace Conversion**: Seamless conversion between ADA and Lovelace

## 📋 Prerequisites

### 1. Get Blockfrost API Key (Free)

1. Go to [blockfrost.io](https://blockfrost.io/)
2. Sign up for a free account
3. Create a new project
4. Select **Preprod** network (for testing) or **Mainnet** (for production)
5. Copy your Project ID - this is your API key

Example: `preprod1a2b3c4d5e6f7g8h9i0j`

### 2. Get Testnet ADA (For Testing)

Get free testnet ADA from the Cardano Faucet:
- [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnet/tools/faucet/)

## 🔧 Installation

```bash
cd masumi-integration/payment-service
npm install
```

## ⚙️ Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and add your Blockfrost API key:
```bash
# Get your key from https://blockfrost.io/
BLOCKFROST_API_KEY=preprodYourActualKeyHere

# Use testnet for development
CARDANO_NETWORK=testnet

# Minimum confirmations before marking payment as complete
MIN_CONFIRMATIONS=1

# How often to check for payments (milliseconds)
PAYMENT_CHECK_INTERVAL=20000
```

## 🏃 Running the Service

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Service runs on `http://localhost:4001`

## 📡 API Endpoints

### Create Invoice

Creates a new invoice and starts monitoring for payment.

```http
POST /invoice/create
Content-Type: application/json

{
  "recipientAddress": "addr_test1qz...",
  "amount": 50,
  "currency": "ADA",
  "description": "Payment for shipment SHIP-001",
  "metadata": {
    "shipmentId": "SHIP-001",
    "violationId": "VIO-123"
  },
  "webhookUrl": "http://your-service:3003/payment-callback"
}
```

**Response:**
```json
{
  "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 50,
  "currency": "ADA",
  "status": "pending",
  "payment": {
    "paymentId": "660e8400-e29b-41d4-a716-446655440001",
    "paymentAddress": "addr_test1qz7h3m...",
    "amountLovelace": 50000000,
    "expiresAt": "2025-12-01T10:00:00.000Z",
    "qrCode": "web+cardano:addr_test1qz7h3m...?amount=50000000"
  }
}
```

### Get Invoice Status

```http
GET /invoices/:invoiceId
```

**Response:**
```json
{
  "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "paid",
  "transactionHash": "abc123...",
  "blockHeight": 1234567,
  "confirmations": 3,
  "paidAt": "2025-11-30T12:34:56.789Z"
}
```

### List Invoices

```http
GET /invoices?page=1&limit=20&status=pending
```

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "cardano-payment-service",
  "cardano": {
    "network": "testnet",
    "connected": true,
    "blockfrostUrl": "https://cardano-preprod.blockfrost.io/api/v0"
  },
  "stats": {
    "totalInvoices": 15,
    "activeInvoices": 3,
    "activeMonitors": 3
  }
}
```

## 🔄 How Payment Monitoring Works

### Flow Diagram

```
1. Invoice Created
   ↓
2. Generate unique Cardano address
   ↓
3. Start background monitoring (every 20s)
   ↓
4. Check address balance via Blockfrost
   ↓
5. Payment detected?
   ├─ No → Continue monitoring
   └─ Yes → Check confirmations
              ↓
       6. Enough confirmations?
          ├─ No → Wait and check again
          └─ Yes → Mark as PAID
                   ↓
              7. Trigger webhook
                   ↓
              8. Stop monitoring
```

### Real Code Implementation

```javascript
// Generate real Cardano address
function generateWalletAddress() {
  const privateKey = CardanoWasm.PrivateKey.generate_ed25519();
  const publicKey = privateKey.to_public();
  
  const stakePrivateKey = CardanoWasm.PrivateKey.generate_ed25519();
  const stakePublicKey = stakePrivateKey.to_public();
  
  const paymentKeyHash = publicKey.hash();
  const stakeKeyHash = stakePublicKey.hash();
  
  const paymentCredential = CardanoWasm.Credential.from_keyhash(paymentKeyHash);
  const stakeCredential = CardanoWasm.Credential.from_keyhash(stakeKeyHash);
  
  const networkId = CARDANO_CONFIG.network === 'mainnet' 
    ? CardanoWasm.NetworkInfo.mainnet().network_id()
    : CardanoWasm.NetworkInfo.testnet_preprod().network_id();
  
  const baseAddress = CardanoWasm.BaseAddress.new(
    networkId,
    paymentCredential,
    stakeCredential
  );
  
  return baseAddress.to_address().to_bech32();
}

// Monitor for payments
function startPaymentMonitoring(paymentId, address, expectedAmount, invoiceId) {
  const intervalId = setInterval(async () => {
    // Check if payment received
    const balance = await checkAddressBalance(address);
    
    if (balance.totalReceived >= expectedAmount) {
      const tx = balance.transactions[0];
      const txDetails = await checkTransactionStatus(tx.tx_hash);
      
      if (txDetails.confirmations >= MIN_CONFIRMATIONS) {
        // Payment confirmed!
        updateInvoiceStatus(invoiceId, 'paid', tx.tx_hash);
        triggerWebhook(invoice);
        clearInterval(intervalId);
      }
    }
  }, 20000); // Every 20 seconds
}
```

## 🧪 Testing

### Test with Real Cardano Wallet

1. Create an invoice using the API
2. Copy the `paymentAddress` from the response
3. Open your Cardano wallet (Nami, Eternl, etc.)
4. Send the exact amount of ADA to that address
5. Wait ~20-60 seconds
6. Check invoice status - should show as "paid"

### Example with curl

```bash
# Create invoice
curl -X POST http://localhost:4001/invoice/create \
  -H "Content-Type: application/json" \
  -d '{
    "recipientAddress": "addr_test1...",
    "amount": 10,
    "currency": "ADA",
    "description": "Test payment"
  }'

# Response will include paymentAddress
# Send ADA to that address using your wallet

# Check status after ~30 seconds
curl http://localhost:4001/invoices/{invoiceId}
```

## 🔐 Security Notes

**⚠️ Important for Production:**

1. **Private Keys**: Currently stored in memory. For production:
   - Use hardware security modules (HSM)
   - Implement key rotation
   - Never log private keys

2. **Blockfrost API Key**: 
   - Keep it secret
   - Use environment variables
   - Rotate periodically

3. **Webhook Signatures**:
   - Always validate signatures
   - Use HTTPS for webhooks
   - Implement replay protection

## 📊 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Service port | `4001` | No |
| `BLOCKFROST_API_KEY` | Blockfrost API key | - | **Yes** |
| `CARDANO_NETWORK` | Network (testnet/mainnet) | `testnet` | No |
| `MIN_CONFIRMATIONS` | Min confirmations | `1` | No |
| `PAYMENT_CHECK_INTERVAL` | Check interval (ms) | `20000` | No |
| `WEBHOOK_SECRET` | Webhook signature secret | - | Yes |

## 🐛 Troubleshooting

### Payment not detected

1. **Check Blockfrost connection**: Visit `/health` endpoint
2. **Verify address**: Ensure you sent to correct address from invoice
3. **Check amount**: Must send exact amount (including Lovelace)
4. **Wait for confirmations**: Default is 1 confirmation (~20 seconds)
5. **Check logs**: Look for "Payment monitoring error" messages

### "Blockfrost API call failed"

- Verify your API key is correct
- Check you're using the right network (preprod vs mainnet)
- Ensure you have Blockfrost credits remaining (free tier limits)

## 📚 Dependencies

- `@emurgo/cardano-serialization-lib-nodejs` - Cardano blockchain operations
- `axios` - HTTP client for Blockfrost API
- `express` - Web framework
- `winston` - Logging
- `joi` - Validation

## 🔗 Useful Links

- [Blockfrost API Docs](https://docs.blockfrost.io/)
- [Cardano Serialization Lib](https://github.com/Emurgo/cardano-serialization-lib)
- [Cardano Developer Portal](https://developers.cardano.org/)
- [Cardano Testnet Faucet](https://docs.cardano.org/cardano-testnet/tools/faucet/)

## 📝 License

MIT
