import { useState, useEffect, useCallback, useRef } from 'react';
import walletService from '../services/wallet';

// Main wallet connection hook
export const useCardanoWallet = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);
  const [availableWallets, setAvailableWallets] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(null);
  const [addresses, setAddresses] = useState(null);

  // Setup wallet event listeners
  useEffect(() => {
    const handleWalletEvent = (event, data) => {
      console.log('Wallet event:', event, data);
      
      switch (event) {
        case 'connected':
          setIsConnected(true);
          setWalletInfo(data);
          setAddresses(data.addresses);
          setBalance(data.balance);
          setIsConnecting(false);
          setError(null);
          break;
          
        case 'disconnected':
          setIsConnected(false);
          setWalletInfo(null);
          setAddresses(null);
          setBalance(null);
          setError(null);
          break;
          
        case 'error':
          setError(data.error);
          setIsConnecting(false);
          break;
          
        default:
          break;
      }
    };

    // Add event listener
    const removeListener = walletService.addListener(handleWalletEvent);

    // Cleanup on unmount
    return removeListener;
  }, []);

  // Detect available wallets on component mount
  useEffect(() => {
    const detectWallets = () => {
      try {
        const wallets = walletService.detectWallets();
        setAvailableWallets(wallets);
      } catch (error) {
        console.error('Failed to detect wallets:', error);
        setError('Failed to detect wallets');
      }
    };

    detectWallets();

    // Re-detect wallets every 2 seconds (in case user installs wallet)
    const interval = setInterval(detectWallets, 2000);
    
    return () => clearInterval(interval);
  }, []);

  // Connect to wallet
  const connect = useCallback(async (walletType) => {
    try {
      setIsConnecting(true);
      setError(null);
      
      console.log(`Connecting to ${walletType}...`);
      await walletService.connectWallet(walletType);
      
    } catch (error) {
      console.error('Connection failed:', error);
      setError(error.message);
      setIsConnecting(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await walletService.disconnectWallet();
    } catch (error) {
      console.error('Disconnect failed:', error);
      setError(error.message);
    }
  }, []);

  // Refresh wallet data
  const refresh = useCallback(async () => {
    if (!isConnected) return;
    
    try {
      const [newAddresses, newBalance] = await Promise.all([
        walletService.getAddresses(),
        walletService.getBalance()
      ]);
      
      setAddresses(newAddresses);
      setBalance(newBalance);
    } catch (error) {
      console.error('Refresh failed:', error);
      setError(error.message);
    }
  }, [isConnected]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    walletInfo,
    availableWallets,
    
    // Wallet data
    balance,
    addresses,
    
    // Actions
    connect,
    disconnect,
    refresh,
    
    // Error state
    error,
    clearError: () => setError(null)
  };
};

// Hook for invoice payment functionality
export const useInvoicePayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  const [error, setError] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);

  // Process invoice payment
  const payInvoice = useCallback(async (invoice, options = {}) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      console.log('Processing invoice payment:', invoice);
      
      // Validate wallet connection
      if (!walletService.isConnected()) {
        throw new Error('Please connect your wallet first');
      }

      // Process payment via wallet service
      const result = await walletService.payInvoice(invoice);
      
      setPaymentResult(result);
      
      // Add to payment history
      setPaymentHistory(prev => [...prev, {
        id: invoice.invoiceId,
        invoice,
        result,
        timestamp: new Date().toISOString(),
        status: 'completed'
      }]);

      console.log('Invoice payment completed:', result);
      return result;
      
    } catch (error) {
      console.error('Invoice payment failed:', error);
      setError(error.message);
      
      // Add failed payment to history
      setPaymentHistory(prev => [...prev, {
        id: invoice.invoiceId,
        invoice,
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 'failed'
      }]);
      
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Get payment status
  const getPaymentStatus = useCallback((invoiceId) => {
    const payment = paymentHistory.find(p => p.id === invoiceId);
    return payment?.status || 'unknown';
  }, [paymentHistory]);

  // Clear payment history
  const clearHistory = useCallback(() => {
    setPaymentHistory([]);
    setPaymentResult(null);
    setError(null);
  }, []);

  return {
    isProcessing,
    paymentResult,
    paymentHistory,
    error,
    payInvoice,
    getPaymentStatus,
    clearHistory,
    clearError: () => setError(null)
  };
};

// Hook for transaction signing
export const useTransactionSigning = () => {
  const [isSigning, setIsSigning] = useState(false);
  const [signedTx, setSignedTx] = useState(null);
  const [error, setError] = useState(null);

  const signTransaction = useCallback(async (txHex, partialSign = false) => {
    try {
      setIsSigning(true);
      setError(null);
      
      if (!walletService.isConnected()) {
        throw new Error('Please connect your wallet first');
      }

      console.log('Signing transaction...');
      const witnessSet = await walletService.signTransaction(txHex, partialSign);
      
      const result = {
        originalTx: txHex,
        witnessSet,
        signedAt: new Date().toISOString()
      };
      
      setSignedTx(result);
      return result;
      
    } catch (error) {
      console.error('Transaction signing failed:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsSigning(false);
    }
  }, []);

  const submitTransaction = useCallback(async (signedTxHex) => {
    try {
      if (!walletService.isConnected()) {
        throw new Error('Please connect your wallet first');
      }

      console.log('Submitting transaction...');
      const txHash = await walletService.submitTransaction(signedTxHex);
      
      return txHash;
      
    } catch (error) {
      console.error('Transaction submission failed:', error);
      setError(error.message);
      throw error;
    }
  }, []);

  return {
    isSigning,
    signedTx,
    error,
    signTransaction,
    submitTransaction,
    clearError: () => setError(null)
  };
};

// Hook for wallet balance monitoring
export const useWalletBalance = (autoRefresh = false, refreshInterval = 30000) => {
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchBalance = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!walletService.isConnected()) {
        throw new Error('Wallet not connected');
      }

      const walletBalance = await walletService.getBalance();
      setBalance(walletBalance);
      
      return walletBalance;
      
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-refresh balance
  useEffect(() => {
    if (autoRefresh && walletService.isConnected()) {
      // Initial fetch
      fetchBalance();
      
      // Set up interval
      intervalRef.current = setInterval(fetchBalance, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, fetchBalance]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    balance,
    isLoading,
    error,
    fetchBalance,
    clearError: () => setError(null)
  };
};

// Hook for Hydra head integration
export const useHydraIntegration = () => {
  const [hydraHeads, setHydraHeads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Listen for Hydra events from wallet service
  useEffect(() => {
    const handleWalletEvent = (event, data) => {
      switch (event) {
        case 'hydra-payment-initiated':
          console.log('Hydra payment initiated:', data);
          // Add to heads list or update existing
          setHydraHeads(prev => {
            const existing = prev.find(h => h.headId === data.hydraHeadId);
            if (existing) {
              return prev.map(h => 
                h.headId === data.hydraHeadId 
                  ? { ...h, lastPayment: data }
                  : h
              );
            } else {
              return [...prev, {
                headId: data.hydraHeadId,
                status: 'active',
                lastPayment: data,
                createdAt: new Date().toISOString()
              }];
            }
          });
          break;
          
        case 'hydra-payment-completed':
          console.log('Hydra payment completed:', data);
          break;
          
        default:
          break;
      }
    };

    const removeListener = walletService.addListener(handleWalletEvent);
    return removeListener;
  }, []);

  // Get Hydra head status from backend
  const getHydraHeadStatus = useCallback(async (headId) => {
    try {
      setIsLoading(true);
      
      // TODO: Replace with actual API call
      const response = await fetch(`/api/settlement/hydra-heads/${headId}`);
      const headData = await response.json();
      
      return headData;
      
    } catch (error) {
      console.error('Failed to get Hydra head status:', error);
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    hydraHeads,
    isLoading,
    error,
    getHydraHeadStatus,
    clearError: () => setError(null)
  };
};

// Utility hook for Cardano address validation
export const useAddressValidation = () => {
  const validateAddress = useCallback((address, network = 'testnet') => {
    try {
      // TODO: Implement using cardano-serialization-lib
      // const addr = CardanoWasm.Address.from_bech32(address);
      // const networkId = addr.network_id();
      // return networkId === (network === 'testnet' ? 0 : 1);
      
      // Mock validation for development
      const isTestnet = network === 'testnet';
      const expectedPrefix = isTestnet ? 'addr_test' : 'addr';
      
      return {
        isValid: address.startsWith(expectedPrefix),
        network: address.startsWith('addr_test') ? 'testnet' : 'mainnet',
        type: 'base' // TODO: Detect address type properly
      };
      
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }, []);

  return { validateAddress };
};

// Export all hooks
export default {
  useCardanoWallet,
  useInvoicePayment,
  useTransactionSigning,
  useWalletBalance,
  useHydraIntegration,
  useAddressValidation
};