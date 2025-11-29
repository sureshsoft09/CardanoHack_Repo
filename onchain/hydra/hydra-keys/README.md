# Hydra Keys Directory

This directory contains the cryptographic keys needed for Hydra head operations in the Smart Freight Management System.

## 🔑 **Key Files**

### **Cardano Keys**
- `settlement.sk` / `settlement.vk` - Settlement Agent's Cardano signing/verification keys
- `compliance.sk` / `compliance.vk` - Compliance Agent's Cardano signing/verification keys

### **Hydra Keys**  
- `hydra-settlement.sk` / `hydra-settlement.vk` - Settlement Agent's Hydra signing/verification keys
- `hydra-compliance.sk` / `hydra-compliance.vk` - Compliance Agent's Hydra signing/verification keys

## 🔐 **Key Generation**

Keys are automatically generated when running:
```bash
npm run docker:start
# or
./scripts/start-hydra-nodes.sh
```

### **Manual Key Generation**
```bash
# Cardano keys
cardano-cli address key-gen \
  --verification-key-file settlement.vk \
  --signing-key-file settlement.sk

# Hydra keys (when hydra-node is available)
hydra-node gen-hydra-key --output-file hydra-settlement
```

## 💰 **Funding Addresses**

After key generation, fund these addresses with testnet ADA:

```bash
# Get Settlement Agent address
cardano-cli address build \
  --payment-verification-key-file settlement.vk \
  --testnet-magic 1097911063

# Get Compliance Agent address  
cardano-cli address build \
  --payment-verification-key-file compliance.vk \
  --testnet-magic 1097911063
```

**Testnet Faucet**: https://testnets.cardano.org/en/testnets/cardano/tools/faucet/

## 🔒 **Security Notes**

- **Development only**: These keys are for testing/demo purposes
- **Production**: Use HSM or secure key management systems
- **Git ignored**: Keys are not committed to version control
- **File permissions**: Keys should be readable only by owner (600)

```bash
# Secure key permissions
chmod 600 *.sk
chmod 644 *.vk
```