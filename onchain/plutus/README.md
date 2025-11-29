# Smart Freight Plutus Smart Contracts

Plutus V2 smart contracts for the Smart Freight Management System, providing on-chain escrow and settlement validation for compliance violation penalties.

## 🎯 **Contract Overview**

### **ShipmentEscrow.hs** - Main Validator
A Plutus V2 validator that locks ADA in escrow until a valid settlement decision is submitted by the authorized Settlement Agent.

**Validation Rules:**
1. **Decision Hash Match**: `decisionHash` (redeemer) must match `expectedDecisionHash` (datum)
2. **Authorized Signer**: `signerPubKeyHash` (redeemer) must match `recipientPubKeyHash` (datum)  
3. **Transaction Signed**: Transaction must be signed by the authorized Settlement Agent

## 🏗️ **Data Types**

### **Datum Structure**
```haskell
data ShipmentEscrowDatum = ShipmentEscrowDatum
    { shipmentId            :: BuiltinByteString  -- "SHIP-001"
    , expectedDecisionHash  :: BuiltinByteString  -- SHA-256 of settlement decision
    , recipientPubKeyHash   :: PubKeyHash         -- Settlement Agent's PKH
    }
```

### **Redeemer Structure**  
```haskell
data ShipmentEscrowRedeemer = ShipmentEscrowRedeemer
    { decisionHash      :: BuiltinByteString  -- Actual settlement decision hash
    , signerPubKeyHash  :: PubKeyHash         -- Transaction signer's PKH
    }
```

## 🔧 **Compilation & Deployment**

### **Using Cabal (Recommended)**
```bash
# Build the project
cabal build

# Generate serialized validator
cabal exec write-validator

# Run tests
cabal test

# Output: shipment-escrow-validator.plutus
```

### **Using Nix (Plutus Apps)**
```bash  
# Enter development environment
nix develop

# Build and generate validator
cabal build && cabal exec write-validator

# Development shell includes:
# - GHC 8.10.7
# - Cabal
# - Haskell Language Server  
# - cardano-cli
```

### **Manual GHC Compilation**
```bash
# Install dependencies
cabal install plutus-tx plutus-ledger-api serialise

# Compile
ghc -O2 ShipmentEscrow.hs WriteValidator.hs -o write-validator

# Generate validator file
./write-validator
```

## 💰 **Usage with cardano-cli**

### **1. Lock Funds in Escrow**
```bash
# Calculate script address
cardano-cli address build \
  --payment-script-file shipment-escrow-validator.plutus \
  --testnet-magic 1097911063

# Create datum file (datum.json)
{
  "constructor": 0,
  "fields": [
    { "bytes": "534849502D303031" },  // "SHIP-001" in hex
    { "bytes": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456" },
    { "bytes": "abcdef1234567890abcdef1234567890abcdef12" }
  ]
}

# Send funds to script
cardano-cli transaction build \
  --tx-out addr_test1wpxxxxx+5000000 \
  --tx-out-datum-hash $(cardano-cli transaction hash-script-data --script-data-file datum.json) \
  --change-address $SENDER_ADDR \
  --out-file lock-tx.unsigned
```

### **2. Redeem Funds (Settlement)**
```bash
# Create redeemer file (redeemer.json)
{
  "constructor": 0,
  "fields": [
    { "bytes": "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456" },  // Matching hash
    { "bytes": "abcdef1234567890abcdef1234567890abcdef12" }  // Settlement Agent PKH
  ]
}

# Redeem from script
cardano-cli transaction build \
  --tx-in <script-utxo>#0 \
  --tx-in-script-file shipment-escrow-validator.plutus \
  --tx-in-datum-file datum.json \
  --tx-in-redeemer-file redeemer.json \
  --tx-out $RECIPIENT_ADDR+4500000 \
  --change-address $SETTLEMENT_AGENT_ADDR \
  --protocol-params-file protocol.json \
  --out-file redeem-tx.unsigned

# Sign with Settlement Agent key
cardano-cli transaction sign \
  --tx-body-file redeem-tx.unsigned \
  --signing-key-file settlement-agent.skey \
  --out-file redeem-tx.signed

# Submit transaction  
cardano-cli transaction submit --tx-file redeem-tx.signed
```

## 🔗 **Integration with Smart Freight System**

### **Backend Integration (Settlement Agent)**
```typescript
// In Settlement Agent (TypeScript)
import { CardanoClientWrapper } from './cardano-client';

async function publishOnChain(decisionLog: DecisionLog): Promise<string> {
  // Build transaction that spends from Plutus script
  const transaction = await this.cardanoClient.buildTransaction({
    inputs: [scriptUtxo],  // UTXO locked at validator
    outputs: [{
      address: recipientAddress,
      amount: settlementAmount
    }],
    scriptWitnesses: [{
      script: SHIPMENT_ESCROW_VALIDATOR,  // From .plutus file
      datum: {
        shipmentId: decisionLog.shipmentId,
        expectedDecisionHash: decisionLog.decisionHash,
        recipientPubKeyHash: SETTLEMENT_AGENT_PKH
      },
      redeemer: {
        decisionHash: decisionLog.decisionHash,
        signerPubKeyHash: SETTLEMENT_AGENT_PKH  
      }
    }]
  });
  
  const signedTx = await this.signTransaction(transaction);
  return await this.submitTransaction(signedTx);
}
```

### **Transaction Flow**
```
Compliance Agent → Settlement Agent → Plutus Validator
       │                  │                  │
   Creates Invoice    Opens Hydra Head    Validates Settlement
       │                  │                  │
   Penalty Amount ────→ Off-chain Payment ───→ On-chain Proof
                                              │
                                         Unlocks Escrow
                                              │
                                         Pays Recipient
```

## 🧪 **Testing**

### **Unit Tests**
```bash
# Run test suite
cabal test

# Tests include:
# - Valid settlement validation
# - Invalid hash rejection
# - Type safety verification
# - Property-based testing
```

### **Example Test Cases**
```haskell
-- Valid case: Matching hashes and authorized signer
exampleDatum = ShipmentEscrowDatum
  { shipmentId = "SHIP-001"
  , expectedDecisionHash = "a1b2c3d4..."
  , recipientPubKeyHash = "abcdef12..." 
  }

exampleRedeemer = ShipmentEscrowRedeemer  
  { decisionHash = "a1b2c3d4..."  -- Matches datum
  , signerPubKeyHash = "abcdef12..."  -- Matches datum
  }
-- Result: ✅ Validation succeeds

-- Invalid case: Wrong decision hash
invalidRedeemer = ShipmentEscrowRedeemer
  { decisionHash = "deadbeef..."  -- ❌ Doesn't match
  , signerPubKeyHash = "abcdef12..."  
  }
-- Result: ❌ "Decision hash mismatch" error
```

## 📁 **Project Structure**

```
onchain/plutus/
├── ShipmentEscrow.hs              # Main Plutus validator
├── smart-freight-plutus.cabal     # Cabal build configuration
├── flake.nix                      # Nix development environment
├── app/
│   └── WriteValidator.hs          # Validator serialization utility
├── test/
│   ├── Spec.hs                    # Test suite entry point
│   └── ShipmentEscrowSpec.hs      # Validator unit tests
└── README.md                      # This file
```

## 🚀 **Production Deployment**

### **Script Hash Calculation**
```bash
# Calculate validator hash for script address
cardano-cli transaction policyid \
  --script-file shipment-escrow-validator.plutus

# Use this hash in Settlement Agent configuration
PLUTUS_VALIDATOR_HASH=<calculated-hash>
```

### **Environment Configuration**
```env
# Settlement Agent .env
PLUTUS_VALIDATOR_ADDRESS=addr_test1wp<script-address>
VALIDATOR_SCRIPT_HASH=<script-hash>
SETTLEMENT_AGENT_PKH=<settlement-agent-pubkey-hash>
```

## 🔒 **Security Considerations**

1. **Hash Validation**: Uses SHA-256 hashes to ensure decision integrity
2. **Authorization**: Only Settlement Agent can unlock funds
3. **Signature Verification**: Transaction must be signed by authorized party
4. **Immutable Logic**: Validator logic cannot be changed after deployment
5. **Minimal Attack Surface**: Simple validation rules reduce complexity

## 🎯 **Smart Freight Integration**

This Plutus contract integrates perfectly with the Smart Freight Management System:

- **Compliance Agent** → Detects violations → Generates penalties
- **Settlement Agent** → Processes Hydra payments → Submits on-chain proof
- **Plutus Validator** → Verifies settlement → Releases escrowed funds
- **Cardano Network** → Provides immutable settlement record

Perfect for demonstrating **real-world Plutus usage** in IoT and supply chain applications! 🚛⚡🔗