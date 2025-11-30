import React, { useState } from 'react';
import { useCardanoWallet, useInvoicePayment } from '../hooks/useWallet';
import walletService from '../services/wallet';
import toast from 'react-hot-toast';

// Wallet connection component
const WalletConnector = () => {
  const {
    isConnected,
    isConnecting,
    isRefreshing,
    walletInfo,
    availableWallets,
    balance,
    addresses,
    connect,
    disconnect,
    refresh,
    error
  } = useCardanoWallet();

  if (isConnected) {
    return (
      <div className="wallet-connected">
        <h3>Wallet Connected</h3>
        <div className="wallet-info">
          <p><strong>Wallet:</strong> {walletInfo?.walletType}</p>
          <p><strong>Network:</strong> Cardano Testnet</p>
          <p><strong>Balance:</strong> {balance?.ada} ADA</p>
          <p><strong>Address:</strong> {addresses?.used?.[0] || 'Loading...'}</p>
        </div>
        <div className="wallet-actions">
          <button onClick={refresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={disconnect} disabled={isRefreshing}>
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connector">
      <h3>Connect Cardano Wallet</h3>
      <p>Connect your wallet to pay invoices and interact with the Smart Freight system</p>
      
      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {availableWallets.length === 0 ? (
        <div className="no-wallets">
          <p>No Cardano wallets detected.</p>
          <p>Please install one of these wallets:</p>
          <ul>
            <li><a href="https://namiwallet.io" target="_blank" rel="noopener noreferrer">Nami Wallet</a></li>
            <li><a href="https://eternl.io" target="_blank" rel="noopener noreferrer">Eternl Wallet</a></li>
            <li><a href="https://flint-wallet.com" target="_blank" rel="noopener noreferrer">Flint Wallet</a></li>
          </ul>
        </div>
      ) : (
        <div className="available-wallets">
          {availableWallets.map((wallet) => (
            <button
              key={wallet.type}
              onClick={() => connect(wallet.type)}
              disabled={isConnecting}
              className={`wallet-button ${wallet.isEnabled ? 'enabled' : 'disabled'}`}
            >
              {wallet.icon && <img src={wallet.icon} alt={wallet.name} />}
              <span>{wallet.name}</span>
              {isConnecting && <span>Connecting...</span>}
            </button>
          ))}
        </div>
      )}

      <div className="testnet-info">
        <h4>⚠️ Testnet Configuration</h4>
        <p>This application uses <strong>Cardano Testnet</strong>. Make sure your wallet is set to testnet mode.</p>
        <ul>
          <li><strong>Network:</strong> Cardano Testnet</li>
          <li><strong>Network ID:</strong> 0</li>
          <li><strong>Protocol Magic:</strong> 1097911063</li>
          <li><strong>Explorer:</strong> <a href="https://testnet.cardanoscan.io" target="_blank" rel="noopener noreferrer">testnet.cardanoscan.io</a></li>
        </ul>
        <p>Get testnet ADA from the <a href="https://testnets.cardano.org/en/testnets/cardano/tools/faucet/" target="_blank" rel="noopener noreferrer">Cardano Testnet Faucet</a></p>
      </div>
    </div>
  );
};

// Invoice payment component
const InvoicePayment = ({ invoice, onPaymentComplete }) => {
  const { isConnected, walletInfo } = useCardanoWallet();
  const { payInvoice, isProcessing, paymentResult, error } = useInvoicePayment();
  const [paymentMethod, setPaymentMethod] = useState('direct');
  const [isSyncing, setIsSyncing] = useState(false);

  // Debug wallet connection status
  console.log('InvoicePayment - Wallet Status:', { 
    isConnected, 
    walletInfo, 
    hasWalletInfo: !!walletInfo 
  });

  const handlePayment = async () => {
    try {
      console.log('Starting payment process...', { invoice, paymentMethod });
      
      const result = await payInvoice(invoice, { method: paymentMethod });
      
      toast.success(`Payment successful! TX: ${result.directPayment?.txHash || result.hydraPayment?.paymentId}`);
      
      if (onPaymentComplete) {
        onPaymentComplete(result);
      }
      
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error(`Payment failed: ${error.message}`);
    }
  };

  // Check both hook state and wallet service directly
  const walletServiceConnected = walletService.isConnected();
  
  if (!isConnected && !walletServiceConnected) {
    return (
      <div className="payment-requires-wallet">
        <p>Please connect your wallet to pay this invoice.</p>
        <p style={{fontSize: '12px', color: '#666'}}>
          Debug: Hook Connected={isConnected ? 'true' : 'false'}, Service Connected={walletServiceConnected ? 'true' : 'false'}, WalletInfo={walletInfo ? 'present' : 'missing'}
        </p>
      </div>
    );
  }

  // If wallet service is connected but hook state isn't updated, show a refresh suggestion
  if (!isConnected && walletServiceConnected) {
    const handleSyncState = async () => {
      try {
        setIsSyncing(true);
        console.log('Syncing wallet state...');
        
        await walletService.forceRefreshConnectionState();
        
        // Give React a moment to update state, then proceed with payment
        setTimeout(() => {
          if (walletService.isConnected()) {
            console.log('State synced, proceeding with payment...');
            handlePayment();
          } else {
            console.warn('Wallet still not connected after sync');
            toast.error('Wallet sync failed, please refresh the page');
          }
          setIsSyncing(false);
        }, 1000);
        
      } catch (error) {
        console.error('Failed to sync wallet state:', error);
        setIsSyncing(false);
        toast.error('Sync failed, refreshing page...');
        setTimeout(() => window.location.reload(), 1000);
      }
    };

    return (
      <div className="payment-state-sync">
        <p>Wallet connected but interface not updated.</p>
        <button onClick={handleSyncState} disabled={isSyncing}>
          {isSyncing ? 'Syncing...' : 'Sync & Pay'}
        </button>
        <button 
          onClick={() => window.location.reload()} 
          disabled={isSyncing}
          style={{marginLeft: '10px'}}
        >
          Refresh Page
        </button>
        <p style={{fontSize: '12px', color: '#666'}}>
          Debug: Wallet service has connection but React state is stale
        </p>
        {isSyncing && (
          <div style={{marginTop: '10px', fontSize: '14px', color: '#007bff'}}>
            🔄 Synchronizing wallet state...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="invoice-payment">
      <div className="invoice-details">
        <h4>Invoice Payment</h4>
        <div className="invoice-info">
          <p><strong>Invoice ID:</strong> {invoice.invoiceId}</p>
          <p><strong>Shipment:</strong> {invoice.shipmentId}</p>
          <p><strong>Amount:</strong> {invoice.amountAda} ADA</p>
          <p><strong>Description:</strong> {invoice.description}</p>
          <p><strong>Violation:</strong> {invoice.metadata?.ruleViolated}</p>
        </div>
      </div>

      <div className="payment-options">
        <h5>Payment Method</h5>
        <div className="payment-method-selector">
          <label>
            <input
              type="radio"
              value="direct"
              checked={paymentMethod === 'direct'}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            <span>Direct Payment</span>
            <small>Pay directly on Cardano mainnet (higher fees, immediate settlement)</small>
          </label>
          
          <label>
            <input
              type="radio"
              value="hydra"
              checked={paymentMethod === 'hydra'}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            <span>Hydra Layer 2</span>
            <small>Pay via Hydra head (lower fees, instant finality)</small>
          </label>
        </div>
      </div>

      {error && (
        <div className="error-message">
          Payment Error: {error}
        </div>
      )}

      {paymentResult && (
        <div className="payment-result">
          <h5>Payment Successful!</h5>
          
          {paymentResult.directPayment && (
            <div className="direct-payment-result">
              <p><strong>Direct Payment:</strong></p>
              <p>TX Hash: {paymentResult.directPayment.txHash}</p>
              <p>Status: {paymentResult.directPayment.status}</p>
              {paymentResult.directPayment.explorerUrl && (
                <a href={paymentResult.directPayment.explorerUrl} target="_blank" rel="noopener noreferrer">
                  View on Explorer
                </a>
              )}
            </div>
          )}

          {paymentResult.hydraPayment && (
            <div className="hydra-payment-result">
              <p><strong>Hydra Payment:</strong></p>
              <p>Payment ID: {paymentResult.hydraPayment.paymentId}</p>
              <p>Hydra Head: {paymentResult.hydraPayment.hydraHeadId}</p>
              <p>Status: {paymentResult.hydraPayment.status}</p>
            </div>
          )}
        </div>
      )}

      <div className="payment-actions">
        <button
          onClick={handlePayment}
          disabled={isProcessing || !invoice.amountAda}
          className="pay-button"
        >
          {isProcessing ? 'Processing Payment...' : `Pay ${invoice.amountAda} ADA`}
        </button>
      </div>

      <div className="payment-info">
        <h6>What happens when you pay?</h6>
        <div className="payment-flow-explanation">
          {paymentMethod === 'direct' ? (
            <ol>
              <li>Your wallet will show a transaction popup</li>
              <li>Confirm the payment in your wallet</li>
              <li>Transaction is submitted to Cardano testnet</li>
              <li>Payment is recorded in the Smart Freight system</li>
            </ol>
          ) : (
            <ol>
              <li>Backend creates/uses existing Hydra head</li>
              <li>You may need to sign funding transaction (if new head)</li>
              <li>Payment executes instantly on Layer 2</li>
              <li>Settlement is recorded on Cardano mainnet</li>
            </ol>
          )}
        </div>
      </div>
    </div>
  );
};

// Example usage component showing complete integration
const WalletIntegrationExample = () => {
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Example invoices from Smart Freight system
  const exampleInvoices = [
    {
      invoiceId: 'inv-001',
      shipmentId: 'SHIP-001',
      violationId: 'viol-001',
      amountAda: 25,
      currency: 'ADA',
      description: 'Cold chain temperature violation penalty',
      recipientAddress: process.env.REACT_APP_SETTLEMENT_AGENT_ADDRESS || 'addr_test1qqnrmmtra2vgtvgr9fn38je9f5cpx6mu3pz068l65cer003revuqg67qff2z0ch4e9pkncchmjwzh4lj04kugwedvj9qj2krck',
      status: 'pending',
      metadata: {
        ruleViolated: 'TEMP_COLD_CHAIN',
        severity: 'critical',
        evidenceHash: 'sha256_evidence_hash_example'
      },
      createdAt: new Date('2025-11-29T10:00:00Z')
    },
    {
      invoiceId: 'inv-002',
      shipmentId: 'SHIP-002',
      violationId: 'viol-002',
      amountAda: 50,
      currency: 'ADA',
      description: 'Geofence violation - unauthorized route deviation',
      recipientAddress: process.env.REACT_APP_SETTLEMENT_AGENT_ADDRESS || 'addr_test1qqnrmmtra2vgtvgr9fn38je9f5cpx6mu3pz068l65cer003revuqg67qff2z0ch4e9pkncchmjwzh4lj04kugwedvj9qj2krck',
      status: 'pending',
      metadata: {
        ruleViolated: 'GEOFENCE_VIOLATION',
        severity: 'major',
        evidenceHash: 'sha256_geofence_evidence_hash'
      },
      createdAt: new Date('2025-11-29T11:30:00Z')
    }
  ];

  const handlePaymentComplete = (result) => {
    console.log('Payment completed:', result);
    toast.success('Invoice payment completed successfully!');
    setSelectedInvoice(null);
  };

  return (
    <div className="wallet-integration-example">
      <header style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        padding: '2rem',
        borderRadius: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        border: '2px solid rgba(255,255,255,0.3)'
      }}>
        <h1 style={{
          color: '#1e3a8a',
          fontSize: '2.5rem',
          fontWeight: '700',
          margin: '0 0 0.5rem 0',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>Smart Freight Management - Wallet Integration</h1>
        <p style={{
          color: '#1e40af',
          fontSize: '1.25rem',
          fontWeight: '600',
          margin: 0,
          textShadow: '0 1px 2px rgba(0,0,0,0.1)'
        }}>🔗 Cardano Testnet Integration with Nami/Eternl Wallets</p>
      </header>

      {/* Wallet Connection Section */}
      <section className="wallet-section">
        <WalletConnector />
      </section>

      {/* Invoices Section */}
      <section className="invoices-section">
        <h2>Pending Invoices</h2>
        <div className="invoices-grid">
          {exampleInvoices.map((invoice) => (
            <div key={invoice.invoiceId} className="invoice-card">
              <div className="invoice-header">
                <h4>Invoice {invoice.invoiceId}</h4>
                <span className="amount">{invoice.amountAda} ADA</span>
              </div>
              <div className="invoice-details">
                <p><strong>Shipment:</strong> {invoice.shipmentId}</p>
                <p><strong>Violation:</strong> {invoice.metadata.ruleViolated}</p>
                <p><strong>Severity:</strong> {invoice.metadata.severity}</p>
                <p><strong>Description:</strong> {invoice.description}</p>
              </div>
              <button
                onClick={() => setSelectedInvoice(invoice)}
                className="pay-invoice-button"
              >
                Pay Invoice
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Payment Modal */}
      {selectedInvoice && (
        <div className="payment-modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pay Invoice</h3>
              <button onClick={() => setSelectedInvoice(null)}>×</button>
            </div>
            <div className="modal-content">
              <InvoicePayment
                invoice={selectedInvoice}
                onPaymentComplete={handlePaymentComplete}
              />
            </div>
          </div>
        </div>
      )}

      {/* Development Info */}
      <section className="dev-info">
        <h3>🔧 Development Notes</h3>
        <div className="dev-notes">
          <h4>Testnet Configuration:</h4>
          <ul>
            <li>Network: Cardano Testnet (networkId: 0)</li>
            <li>Protocol Magic: 1097911063</li>
            <li>Get testnet ADA: <a href="https://testnets.cardano.org/en/testnets/cardano/tools/faucet/" target="_blank" rel="noopener noreferrer">Cardano Faucet</a></li>
            <li>Explorer: <a href="https://testnet.cardanoscan.io" target="_blank" rel="noopener noreferrer">testnet.cardanoscan.io</a></li>
          </ul>

          <h4>Integration Points:</h4>
          <ul>
            <li><strong>Direct Payments:</strong> Built with cardano-serialization-lib (mocked for demo)</li>
            <li><strong>Hydra Integration:</strong> Calls backend Settlement Agent API</li>
            <li><strong>Transaction Signing:</strong> Uses wallet CIP-30 API</li>
            <li><strong>Event Handling:</strong> Real-time updates via wallet service</li>
          </ul>

          <h4>Production TODOs:</h4>
          <ul>
            <li>Replace mock transaction building with real cardano-serialization-lib</li>
            <li>Implement proper address conversion (hex ↔ bech32)</li>
            <li>Add UTXO management and fee calculation</li>
            <li>Connect to real Settlement Agent API endpoints</li>
            <li>Add transaction monitoring and confirmations</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default WalletIntegrationExample;