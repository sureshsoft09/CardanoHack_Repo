import express from 'express';
import cors from 'cors';
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import * as CardanoWasm from '@emurgo/cardano-serialization-lib-nodejs';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

// Types
interface PaymentRequest {
  invoice: {
    invoiceId: string;
    amountAda: number;
    amountLovelace: number;
    recipientAddress: string;
    description: string;
  };
  wallet: {
    address: string;
    walletType: string;
    networkId: number;
  };
  paymentMethod: string;
}

interface TransactionSubmissionRequest {
  transactionId: string;
  signedTransactionHex: string;
}

// Initialize Express app
const app = express();
const port = process.env.SETTLEMENT_PORT || 3003;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Logger setup
const logger = winston.createLogger({
  level: 'info',
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

// Blockfrost API setup
const blockfrost = new BlockFrostAPI({
  projectId: process.env.BLOCKFROST_PROJECT_ID || 'testnetYourProjectIdHere'
});

// Cardano network configuration
const CARDANO_CONFIG = {
  network: 'testnet',
  networkId: 0,
  protocolMagic: 1097911063,
  linearFee: {
    minFeeA: '44',
    minFeeB: '155381'
  },
  minUtxo: '1000000', // 1 ADA minimum UTXO
  poolDeposit: '500000000', // 500 ADA
  keyDeposit: '2000000', // 2 ADA
  coinsPerUtxoWord: '34482',
  maxTxSize: 16384,
  maxValueSize: 5000
};

// Transaction storage (in production, use database)
const pendingTransactions = new Map<string, any>();

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Settlement Agent API'
  });
});

// Process payment endpoint - builds real Cardano transaction
app.post('/api/settlement/process-payment', async (req, res) => {
  try {
    const paymentRequest: PaymentRequest = req.body;
    
    logger.info('Processing real payment request', {
      invoiceId: paymentRequest.invoice.invoiceId,
      amount: paymentRequest.invoice.amountAda,
      recipient: paymentRequest.invoice.recipientAddress
    });

    // Validate request
    if (!paymentRequest.invoice.recipientAddress || !paymentRequest.invoice.amountAda) {
      return res.status(400).json({
        error: 'Missing required payment parameters',
        message: 'recipientAddress and amountAda are required'
      });
    }

    // Validate recipient address format
    try {
      CardanoWasm.Address.from_bech32(paymentRequest.invoice.recipientAddress);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid recipient address format',
        message: 'Address must be valid Cardano bech32 address'
      });
    }

    // Get wallet UTXOs using Blockfrost
    let utxos;
    try {
      utxos = await blockfrost.addressesUtxos(paymentRequest.wallet.address);
      
      if (!utxos || utxos.length === 0) {
        return res.status(400).json({
          error: 'No UTXOs available',
          message: 'Wallet has no spendable UTXOs'
        });
      }
    } catch (error) {
      logger.error('Failed to fetch wallet UTXOs', { error });
      return res.status(500).json({
        error: 'Failed to fetch wallet UTXOs',
        message: 'Could not retrieve wallet balance from blockchain'
      });
    }

    // Calculate total available balance
    const totalBalance = utxos.reduce((sum: number, utxo: any) => {
      return sum + parseInt(utxo.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0');
    }, 0);

    const requiredAmount = paymentRequest.invoice.amountLovelace;
    const estimatedFee = 200000; // ~0.2 ADA estimated fee
    const totalRequired = requiredAmount + estimatedFee;

    if (totalBalance < totalRequired) {
      return res.status(400).json({
        error: 'Insufficient funds',
        message: `Wallet balance: ${totalBalance} lovelace, Required: ${totalRequired} lovelace (including fees)`
      });
    }

    // Build transaction
    const transactionId = uuidv4();
    const transaction = await buildTransaction({
      utxos,
      recipient: paymentRequest.invoice.recipientAddress,
      amount: requiredAmount,
      changeAddress: paymentRequest.wallet.address,
      transactionId
    });

    // Store transaction details
    pendingTransactions.set(transactionId, {
      ...transaction,
      paymentRequest,
      createdAt: new Date(),
      status: 'pending'
    });

    // Calculate actual fee
    const actualFee = parseInt(transaction.body.fee().to_str());
    const actualFeeAda = (actualFee / 1000000).toFixed(6);

    logger.info('Transaction built successfully', {
      transactionId,
      fee: actualFee,
      feeAda: actualFeeAda
    });

    return res.json({
      requiresSignature: true,
      transactionId,
      transactionHex: Buffer.from(transaction.transaction.to_bytes()).toString('hex'),
      estimatedFeeAda: actualFeeAda,
      estimatedFee: actualFee,
      message: 'Transaction built successfully, requires wallet signature'
    });

  } catch (error) {
    logger.error('Payment processing failed', { error });
    return res.status(500).json({
      error: 'Payment processing failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Submit signed transaction endpoint
app.post('/api/settlement/submit-signed-transaction', async (req, res) => {
  try {
    const { transactionId, signedTransactionHex }: TransactionSubmissionRequest = req.body;

    logger.info('Submitting signed transaction', { transactionId });

    // Validate request
    if (!transactionId || !signedTransactionHex) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'transactionId and signedTransactionHex are required'
      });
    }

    // Get pending transaction
    const pendingTx = pendingTransactions.get(transactionId);
    if (!pendingTx) {
      return res.status(404).json({
        error: 'Transaction not found',
        message: 'Transaction ID not found or expired'
      });
    }

    // Parse signed transaction
    try {
      const txBytes = Buffer.from(signedTransactionHex, 'hex');
      CardanoWasm.Transaction.from_bytes(txBytes);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid signed transaction',
        message: 'Could not parse signed transaction hex'
      });
    }

    // Submit transaction to Cardano network via Blockfrost
    let txHash;
    try {
      const txSubmitResult = await blockfrost.txSubmit(Buffer.from(signedTransactionHex, 'hex'));
      txHash = txSubmitResult;
      
      logger.info('Transaction submitted successfully', {
        transactionId,
        txHash
      });

    } catch (error) {
      logger.error('Transaction submission failed', { error });
      
      // Update transaction status
      pendingTx.status = 'failed';
      pendingTx.error = error instanceof Error ? error.message : 'Unknown submission error';
      
      return res.status(500).json({
        error: 'Transaction submission failed',
        message: error instanceof Error ? error.message : 'Unknown submission error',
        transactionId
      });
    }

    // Update transaction status
    pendingTx.status = 'submitted';
    pendingTx.txHash = txHash;
    pendingTx.submittedAt = new Date();

    // Clean up (remove from pending after 5 minutes)
    setTimeout(() => {
      pendingTransactions.delete(transactionId);
    }, 5 * 60 * 1000);

    return res.json({
      txHash,
      status: 'submitted',
      explorerUrl: `https://testnet.cardanoscan.io/transaction/${txHash}`,
      transactionId,
      message: 'Transaction submitted successfully to Cardano network'
    });

  } catch (error) {
    logger.error('Transaction submission failed', { error });
    return res.status(500).json({
      error: 'Transaction submission failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get transaction status endpoint
app.get('/api/settlement/transaction/:transactionId', (req, res) => {
  const { transactionId } = req.params;
  
  const transaction = pendingTransactions.get(transactionId);
  if (!transaction) {
    return res.status(404).json({
      error: 'Transaction not found',
      message: 'Transaction ID not found or expired'
    });
  }

  return res.json({
    transactionId,
    status: transaction.status,
    createdAt: transaction.createdAt,
    submittedAt: transaction.submittedAt,
    txHash: transaction.txHash,
    error: transaction.error
  });
});

// Build Cardano transaction
async function buildTransaction(params: {
  utxos: any[];
  recipient: string;
  amount: number;
  changeAddress: string;
  transactionId: string;
}) {
  const { utxos, recipient, amount, changeAddress } = params;

  // Create transaction builder
  const linearFee = CardanoWasm.LinearFee.new(
    CardanoWasm.BigNum.from_str(CARDANO_CONFIG.linearFee.minFeeA),
    CardanoWasm.BigNum.from_str(CARDANO_CONFIG.linearFee.minFeeB)
  );

  const txBuilderConfig = CardanoWasm.TransactionBuilderConfigBuilder.new()
    .fee_algo(linearFee)
    .pool_deposit(CardanoWasm.BigNum.from_str(CARDANO_CONFIG.poolDeposit))
    .key_deposit(CardanoWasm.BigNum.from_str(CARDANO_CONFIG.keyDeposit))
    .coins_per_utxo_byte(CardanoWasm.BigNum.from_str(CARDANO_CONFIG.coinsPerUtxoWord))
    .max_value_size(CARDANO_CONFIG.maxValueSize)
    .max_tx_size(CARDANO_CONFIG.maxTxSize)
    .build();

  const txBuilder = CardanoWasm.TransactionBuilder.new(txBuilderConfig);

  // Add output to recipient
  const recipientAddress = CardanoWasm.Address.from_bech32(recipient);
  const outputValue = CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(amount.toString()));
  
  txBuilder.add_output(
    CardanoWasm.TransactionOutput.new(recipientAddress, outputValue)
  );

  // Add inputs from UTXOs
  let totalInput = CardanoWasm.BigNum.from_str('0');
  const targetAmount = CardanoWasm.BigNum.from_str(amount.toString());
  const estimatedFee = CardanoWasm.BigNum.from_str('200000');
  const totalNeeded = targetAmount.checked_add(estimatedFee);

  for (const utxo of utxos) {
    if (totalInput.compare(totalNeeded) >= 0) break;

    const lovelaceAmount = utxo.amount.find((a: any) => a.unit === 'lovelace');
    if (!lovelaceAmount) continue;

    const inputValue = CardanoWasm.BigNum.from_str(lovelaceAmount.quantity);
    totalInput = totalInput.checked_add(inputValue);

    // Create transaction input
    const txHash = CardanoWasm.TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, 'hex'));
    const txInput = CardanoWasm.TransactionInput.new(txHash, utxo.tx_index);
    
    // Create value for this input
    const inputVal = CardanoWasm.Value.new(inputValue);
    
    // Add multi-assets if present
    if (utxo.amount.length > 1) {
      const multiAsset = CardanoWasm.MultiAsset.new();
      
      for (const asset of utxo.amount) {
        if (asset.unit !== 'lovelace') {
          const policyId = asset.unit.slice(0, 56);
          const assetName = asset.unit.slice(56);
          
          const policy = CardanoWasm.ScriptHash.from_bytes(Buffer.from(policyId, 'hex'));
          let assets = multiAsset.get(policy);
          if (!assets) {
            assets = CardanoWasm.Assets.new();
            multiAsset.insert(policy, assets);
          }
          
          const assetNameBytes = Buffer.from(assetName, 'hex');
          const assetQuantity = CardanoWasm.BigNum.from_str(asset.quantity);
          assets.insert(CardanoWasm.AssetName.new(assetNameBytes), assetQuantity);
        }
      }
      
      if (multiAsset.keys().len() > 0) {
        inputVal.set_multiasset(multiAsset);
      }
    }

    const inputAddress = CardanoWasm.Address.from_bech32(changeAddress);
    const baseAddr = CardanoWasm.BaseAddress.from_address(inputAddress);
    if (baseAddr) {
      const keyHash = baseAddr.payment_cred().to_keyhash();
      if (keyHash) {
        txBuilder.add_key_input(keyHash, txInput, inputVal);
      }
    }
  }

  if (totalInput.compare(totalNeeded) < 0) {
    throw new Error('Insufficient funds for transaction');
  }

  // Add change output
  const changeAddr = CardanoWasm.Address.from_bech32(changeAddress);
  txBuilder.add_change_if_needed(changeAddr);

  // Build transaction
  const txBody = txBuilder.build();
  const transaction = CardanoWasm.Transaction.new(
    txBody,
    CardanoWasm.TransactionWitnessSet.new()
  );

  return {
    transaction,
    body: txBody,
    inputs: utxos.slice(0, Math.min(utxos.length, 10)), // Limit inputs for efficiency
    totalInput: totalInput.to_str(),
    fee: txBody.fee().to_str()
  };
}

// Start server
app.listen(port, () => {
  logger.info(`Settlement Agent API server running on port ${port}`, {
    endpoints: [
      'POST /api/settlement/process-payment',
      'POST /api/settlement/submit-signed-transaction',
      'GET /api/settlement/transaction/:id',
      'GET /health'
    ],
    network: 'Cardano Testnet',
    blockfrostEnabled: !!process.env.BLOCKFROST_PROJECT_ID
  });
});

export default app;