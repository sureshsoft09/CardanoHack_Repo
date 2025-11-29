import axios from 'axios';

// Cardano Testnet Configuration
const CARDANO_CONFIG = {
  network: 'testnet',
  networkId: 0, // 0 = testnet, 1 = mainnet
  protocolMagic: 1097911063, // Cardano testnet protocol magic
  blockfrost: {
    url: 'https://cardano-testnet.blockfrost.io/api/v0',
    projectId: process.env.REACT_APP_BLOCKFROST_PROJECT_ID || 'testnet_project_id_placeholder'
  },
  explorer: 'https://testnet.cardanoscan.io'
};

// Backend API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3002';

// Supported Wallet Types
export const WALLET_TYPES = {
  NAMI: 'nami',
  ETERNL: 'eternl',
  FLINT: 'flint',
  TYPHON: 'typhoncip30',
  GERO: 'gerowallet'
};

// Wallet Detection and Connection Service
class CardanoWalletService {
  constructor() {
    this.connectedWallet = null;
    this.walletApi = null;
    this.networkId = CARDANO_CONFIG.networkId;
    this.listeners = new Set();
  }

  // Detect available Cardano wallets in browser
  detectWallets() {
    const availableWallets = [];
    
    // Check for Nami wallet
    if (window.cardano && window.cardano.nami) {
      availableWallets.push({
        name: 'Nami',
        type: WALLET_TYPES.NAMI,
        icon: window.cardano.nami.icon,
        version: window.cardano.nami.apiVersion,
        isEnabled: window.cardano.nami.isEnabled
      });
    }

    // Check for Eternl wallet
    if (window.cardano && window.cardano.eternl) {
      availableWallets.push({
        name: 'Eternl',
        type: WALLET_TYPES.ETERNL,
        icon: window.cardano.eternl.icon,
        version: window.cardano.eternl.apiVersion,
        isEnabled: window.cardano.eternl.isEnabled
      });
    }

    // Check for Flint wallet
    if (window.cardano && window.cardano.flint) {
      availableWallets.push({
        name: 'Flint',
        type: WALLET_TYPES.FLINT,
        icon: window.cardano.flint.icon,
        version: window.cardano.flint.apiVersion,
        isEnabled: window.cardano.flint.isEnabled
      });
    }

    // Check for Typhon wallet
    if (window.cardano && window.cardano.typhoncip30) {
      availableWallets.push({
        name: 'Typhon',
        type: WALLET_TYPES.TYPHON,
        icon: window.cardano.typhoncip30.icon,
        version: window.cardano.typhoncip30.apiVersion,
        isEnabled: window.cardano.typhoncip30.isEnabled
      });
    }

    // Check for Gero wallet
    if (window.cardano && window.cardano.gerowallet) {
      availableWallets.push({
        name: 'Gero',
        type: WALLET_TYPES.GERO,
        icon: window.cardano.gerowallet.icon,
        version: window.cardano.gerowallet.apiVersion,
        isEnabled: window.cardano.gerowallet.isEnabled
      });
    }

    console.log('Detected wallets:', availableWallets);
    return availableWallets;
  }

  // Connect to a specific wallet
  async connectWallet(walletType) {
    try {
      console.log(`Attempting to connect to ${walletType} wallet...`);

      // Check if wallet is available
      if (!window.cardano || !window.cardano[walletType]) {
        throw new Error(`${walletType} wallet not found. Please install the wallet extension.`);
      }

      const wallet = window.cardano[walletType];

      // Check if wallet is already enabled
      const isEnabled = await wallet.isEnabled();
      
      let walletApi;
      if (isEnabled) {
        // Wallet is already connected, get API directly
        walletApi = await wallet.enable();
      } else {
        // Request wallet connection (will show popup)
        walletApi = await wallet.enable();
      }

      // Verify network (ensure we're on testnet)
      const networkId = await walletApi.getNetworkId();
      if (networkId !== CARDANO_CONFIG.networkId) {
        throw new Error(
          `Wallet is on wrong network. Please switch to Cardano ${CARDANO_CONFIG.network} (network ID: ${CARDANO_CONFIG.networkId})`
        );
      }

      // Store connection details
      this.connectedWallet = walletType;
      this.walletApi = walletApi;

      // Get wallet address for display
      const addresses = await this.getAddresses();
      const balance = await this.getBalance();

      const connectionInfo = {
        walletType,
        networkId,
        addresses,
        balance,
        isConnected: true
      };

      console.log('Wallet connected successfully:', connectionInfo);
      this.notifyListeners('connected', connectionInfo);

      return connectionInfo;

    } catch (error) {
      console.error('Failed to connect wallet:', error);
      this.notifyListeners('error', { type: 'connection', error: error.message });
      throw error;
    }
  }

  // Disconnect wallet
  async disconnectWallet() {
    try {
      this.connectedWallet = null;
      this.walletApi = null;
      
      console.log('Wallet disconnected');
      this.notifyListeners('disconnected', {});
      
      return true;
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
      throw error;
    }
  }

  // Get wallet addresses (both base and stake addresses)
  async getAddresses() {
    if (!this.walletApi) {
      throw new Error('No wallet connected');
    }

    try {
      // Get used addresses (hex format)
      const usedAddressesHex = await this.walletApi.getUsedAddresses();
      
      // Get unused addresses (hex format)  
      const unusedAddressesHex = await this.walletApi.getUnusedAddresses();

      // TODO: Convert hex addresses to bech32 format using cardano-serialization-lib
      // For now, return hex addresses with conversion note
      const addresses = {
        used: usedAddressesHex,
        unused: unusedAddressesHex,
        // Note: In production, convert to bech32 format:
        // const address = CardanoWasm.Address.from_bytes(Buffer.from(hexAddress, 'hex'));
        // const bech32Address = address.to_bech32();
      };

      console.log('Retrieved wallet addresses:', addresses);
      return addresses;

    } catch (error) {
      console.error('Failed to get addresses:', error);
      throw error;
    }
  }

  // Get wallet balance
  async getBalance() {
    if (!this.walletApi) {
      throw new Error('No wallet connected');
    }

    try {
      // Get balance in hex CBOR format
      const balanceHex = await this.walletApi.getBalance();
      
      // TODO: Parse balance using cardano-serialization-lib
      // const balance = CardanoWasm.Value.from_bytes(Buffer.from(balanceHex, 'hex'));
      // const lovelaceAmount = balance.coin().to_str();
      // const adaAmount = parseInt(lovelaceAmount) / 1000000;

      // Mock balance parsing for development
      const mockBalance = {
        lovelace: '50000000', // 50 ADA in Lovelace
        ada: 50,
        assets: [], // Native tokens/NFTs
        rawHex: balanceHex
      };

      console.log('Retrieved wallet balance:', mockBalance);
      return mockBalance;

    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  // Sign transaction
  async signTransaction(txHex, partialSign = false) {
    if (!this.walletApi) {
      throw new Error('No wallet connected');
    }

    try {
      console.log('Signing transaction...', { txHex: txHex.substring(0, 100) + '...' });

      // Sign transaction (will show wallet popup)
      const witnessSetHex = await this.walletApi.signTx(txHex, partialSign);
      
      console.log('Transaction signed successfully');
      return witnessSetHex;

    } catch (error) {
      console.error('Failed to sign transaction:', error);
      
      // Handle user rejection
      if (error.message.includes('user') || error.code === 2) {
        throw new Error('Transaction was rejected by user');
      }
      
      throw error;
    }
  }

  // Submit signed transaction
  async submitTransaction(signedTxHex) {
    if (!this.walletApi) {
      throw new Error('No wallet connected');
    }

    try {
      console.log('Submitting transaction to network...');

      // Submit to Cardano network via wallet
      const txHash = await this.walletApi.submitTx(signedTxHex);
      
      console.log('Transaction submitted successfully:', txHash);
      return txHash;

    } catch (error) {
      console.error('Failed to submit transaction:', error);
      throw error;
    }
  }

  // Pay invoice - Main payment function for Smart Freight system
  async payInvoice(invoice) {
    try {
      console.log('Processing invoice payment...', {
        invoiceId: invoice.invoiceId,
        amount: invoice.amountAda,
        recipientAddress: invoice.recipientAddress
      });

      // Validate wallet connection
      if (!this.walletApi) {
        throw new Error('Please connect your wallet first');
      }

      // Validate invoice
      if (!invoice.amountAda || invoice.amountAda <= 0) {
        throw new Error('Invalid invoice amount');
      }

      if (!invoice.recipientAddress) {
        throw new Error('Missing recipient address');
      }

      // Option 1: Direct Payment Transaction
      // Build and sign transaction for direct ADA payment
      const directPaymentResult = await this.createDirectPaymentTransaction(invoice);

      // Option 2: Backend Integration (Hydra Head)
      // Call backend to open Hydra head and execute off-chain payment
      const hydraPaymentResult = await this.initiateHydraPayment(invoice);

      // For demo purposes, return both options
      return {
        directPayment: directPaymentResult,
        hydraPayment: hydraPaymentResult,
        invoice,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('Invoice payment failed:', error);
      this.notifyListeners('payment-failed', { invoice, error: error.message });
      throw error;
    }
  }

  // Create direct payment transaction (Option 1)
  async createDirectPaymentTransaction(invoice) {
    try {
      console.log('Creating direct payment transaction...');

      // Get wallet UTXOs for transaction building
      const utxos = await this.walletApi.getUtxos();
      const changeAddress = await this.walletApi.getChangeAddress();

      // TODO: Build transaction using cardano-serialization-lib
      // Real implementation would:
      // 1. Calculate required inputs from UTXOs
      // 2. Build outputs (recipient + change)
      // 3. Calculate fees
      // 4. Build complete transaction
      // 5. Get user signature
      // 6. Submit to network

      // Mock transaction building for development
      const mockTxHex = this.buildMockTransaction(invoice, utxos, changeAddress);
      
      // Sign transaction (triggers wallet popup)
      const witnessSet = await this.signTransaction(mockTxHex);
      
      // Submit transaction
      const txHash = await this.submitTransaction(mockTxHex + witnessSet);

      const result = {
        type: 'direct-payment',
        txHash,
        amount: invoice.amountAda,
        recipient: invoice.recipientAddress,
        status: 'submitted',
        explorerUrl: `${CARDANO_CONFIG.explorer}/tx/${txHash}`
      };

      console.log('Direct payment transaction created:', result);
      this.notifyListeners('payment-submitted', result);

      return result;

    } catch (error) {
      console.error('Direct payment transaction failed:', error);
      throw error;
    }
  }

  // Initiate Hydra payment through backend (Option 2) 
  async initiateHydraPayment(invoice) {
    try {
      console.log('Initiating Hydra payment via backend...');

      // Get wallet address for Hydra head participation
      const addresses = await this.getAddresses();
      const walletAddress = addresses.used[0] || addresses.unused[0];

      // Call backend Settlement Agent to open/use Hydra head
      const response = await axios.post(`${API_BASE_URL}/api/settlement/hydra-payment`, {
        invoice,
        walletAddress,
        walletType: this.connectedWallet,
        networkId: this.networkId
      });

      const hydraPaymentData = response.data;

      // If backend returns transaction to sign (for Hydra head funding)
      if (hydraPaymentData.requiresWalletSignature && hydraPaymentData.txHex) {
        console.log('Signing Hydra head funding transaction...');
        
        const witnessSet = await this.signTransaction(hydraPaymentData.txHex);
        
        // Send signed transaction back to backend
        const confirmResponse = await axios.post(
          `${API_BASE_URL}/api/settlement/confirm-hydra-funding`,
          {
            paymentId: hydraPaymentData.paymentId,
            signedTxHex: hydraPaymentData.txHex + witnessSet
          }
        );

        const result = {
          type: 'hydra-payment',
          paymentId: hydraPaymentData.paymentId,
          hydraHeadId: confirmResponse.data.hydraHeadId,
          txHash: confirmResponse.data.fundingTxHash,
          amount: invoice.amountAda,
          status: 'hydra-processing',
          explorerUrl: confirmResponse.data.explorerUrl
        };

        console.log('Hydra payment initiated:', result);
        this.notifyListeners('hydra-payment-initiated', result);

        return result;
      }

      // If no wallet signature required (existing Hydra head)
      const result = {
        type: 'hydra-payment',
        paymentId: hydraPaymentData.paymentId,
        hydraHeadId: hydraPaymentData.hydraHeadId,
        amount: invoice.amountAda,
        status: 'completed',
        message: 'Payment processed via existing Hydra head'
      };

      console.log('Hydra payment completed:', result);
      this.notifyListeners('hydra-payment-completed', result);

      return result;

    } catch (error) {
      console.error('Hydra payment failed:', error);
      
      // Handle specific backend errors
      if (error.response?.status === 404) {
        throw new Error('Settlement service unavailable');
      }
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Invalid payment request');
      }
      
      throw error;
    }
  }

  // Mock transaction builder (replace with cardano-serialization-lib in production)
  buildMockTransaction(invoice, utxos, changeAddress) {
    // This is a mock implementation for development
    // Real implementation would use @emurgo/cardano-serialization-lib-browser
    
    const mockTxHex = `84a400818258${Buffer.from(invoice.invoiceId).toString('hex')}00018282583901${invoice.recipientAddress}1a${(invoice.amountAda * 1000000).toString(16)}82583901${changeAddress}1a3b9aca00021a0001faa0031a007270e0a0f5f6`;
    
    console.log('Mock transaction built:', {
      recipient: invoice.recipientAddress,
      amount: invoice.amountAda,
      txHex: mockTxHex.substring(0, 100) + '...'
    });
    
    return mockTxHex;
  }

  // Event listener management
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }

  // Utility methods
  isConnected() {
    return !!this.walletApi;
  }

  getConnectedWallet() {
    return this.connectedWallet;
  }

  // Convert Lovelace to ADA
  static lovelaceToAda(lovelace) {
    return parseInt(lovelace) / 1000000;
  }

  // Convert ADA to Lovelace
  static adaToLovelace(ada) {
    return Math.floor(ada * 1000000);
  }
}

// Create singleton instance
const walletService = new CardanoWalletService();

export default walletService;

// Export utility functions
export const {
  detectWallets,
  connectWallet,
  disconnectWallet,
  getAddresses,
  getBalance,
  signTransaction,
  submitTransaction,
  payInvoice,
  isConnected,
  getConnectedWallet,
  addListener
} = walletService;