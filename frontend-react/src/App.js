import React, { useState } from 'react';
import GradientDashboard from './components/GradientDashboard';
import WalletIntegrationExample from './components/WalletIntegration';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});



function App() {
  const [currentView, setCurrentView] = useState(0);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
        }}
      />
      
      {currentView === 0 && <GradientDashboard />}
      {currentView === 1 && (
        <div style={{ 
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '2rem'
        }}>
          <WalletIntegrationExample />
        </div>
      )}
      
      {/* Attractive Navigation */}
      <div style={{
        position: 'fixed',
        bottom: '30px',
        right: '30px',
        display: 'flex',
        gap: '15px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setCurrentView(0)}
          style={{
            padding: '14px 28px',
            borderRadius: '30px',
            border: currentView === 0 ? '3px solid rgba(255,255,255,0.5)' : '2px solid rgba(255,255,255,0.2)',
            background: currentView === 0 
              ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)' 
              : 'rgba(30, 58, 138, 0.5)',
            color: 'white',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer',
            backdropFilter: 'blur(20px)',
            transition: 'all 0.3s ease',
            boxShadow: currentView === 0 
              ? '0 8px 30px rgba(59, 130, 246, 0.5)' 
              : '0 4px 15px rgba(0,0,0,0.2)',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            letterSpacing: '0.5px'
          }}
          onMouseOver={(e) => {
            if (currentView !== 0) {
              e.target.style.background = 'linear-gradient(135deg, #1e40af 0%, #60a5fa 100%)';
              e.target.style.transform = 'scale(1.05)';
            }
          }}
          onMouseOut={(e) => {
            if (currentView !== 0) {
              e.target.style.background = 'rgba(30, 58, 138, 0.5)';
              e.target.style.transform = 'scale(1)';
            }
          }}
        >
          📊 Dashboard
        </button>
        <button
          onClick={() => setCurrentView(1)}
          style={{
            padding: '14px 28px',
            borderRadius: '30px',
            border: currentView === 1 ? '3px solid rgba(255,255,255,0.5)' : '2px solid rgba(255,255,255,0.2)',
            background: currentView === 1 
              ? 'linear-gradient(135deg, #7c2d12 0%, #f97316 100%)' 
              : 'rgba(124, 45, 18, 0.5)',
            color: 'white',
            fontWeight: '700',
            fontSize: '1rem',
            cursor: 'pointer',
            backdropFilter: 'blur(20px)',
            transition: 'all 0.3s ease',
            boxShadow: currentView === 1 
              ? '0 8px 30px rgba(249, 115, 22, 0.5)' 
              : '0 4px 15px rgba(0,0,0,0.2)',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
            letterSpacing: '0.5px'
          }}
          onMouseOver={(e) => {
            if (currentView !== 1) {
              e.target.style.background = 'linear-gradient(135deg, #9a3412 0%, #fb923c 100%)';
              e.target.style.transform = 'scale(1.05)';
            }
          }}
          onMouseOut={(e) => {
            if (currentView !== 1) {
              e.target.style.background = 'rgba(124, 45, 18, 0.5)';
              e.target.style.transform = 'scale(1)';
            }
          }}
        >
          💳 Wallet
        </button>
      </div>
    </QueryClientProvider>
  );
}

export default App;