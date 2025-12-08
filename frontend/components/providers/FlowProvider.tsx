'use client';

import { ReactNode, useEffect, useState } from 'react';
import * as fcl from '@onflow/fcl';
import { flowConfig, getCurrentNetwork, getMinorityRuleGameAddress } from '@/lib/flow/config';

export function FlowProvider({ children }: { children: ReactNode }) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const configureFlow = async () => {
      try {
        console.log('🔄 Starting Flow configuration...');
        
        // Configure FCL with proper initialization sequence
        fcl.config(flowConfig);
        
        // Verify configuration is set
        const network = getCurrentNetwork();
        const contractAddress = getMinorityRuleGameAddress();
        
        console.log('Flow Configuration:');
        console.log('- Network:', network);
        console.log('- Contract Address:', contractAddress);
        console.log('- Access Node:', flowConfig['accessNode.api']);
        console.log('- Discovery:', flowConfig['discovery.wallet']);
        console.log('- WalletConnect Project ID:', flowConfig['walletconnect.projectId']);
        
        // Validate required configuration
        if (!flowConfig['accessNode.api']) {
          throw new Error('Access node API not configured');
        }
        if (!contractAddress) {
          throw new Error('Contract address not configured');
        }
        if (!flowConfig['walletconnect.projectId']) {
          throw new Error('WalletConnect project ID not configured');
        }
        
        // Test network connectivity with timeout
        try {
          console.log('🔗 Testing network connectivity...');
          const response = await fetch(flowConfig['accessNode.api'] + '/v1/blocks?height=latest', {
            method: 'GET',
            signal: AbortSignal.timeout(10000), // 10 second timeout
          });
          
          if (!response.ok) {
            throw new Error(`Network test failed: ${response.status} ${response.statusText}`);
          }
          
          console.log('✅ Network connectivity test passed');
        } catch (networkError) {
          console.warn('⚠️ Network connectivity test failed:', networkError);
          // Don't fail completely, just warn - might be CORS or other non-critical issue
        }
        
        setIsConfigured(true);
        console.log('✅ Flow configuration successful!');
        
      } catch (error) {
        console.error('❌ Flow configuration failed:', error);
        setConfigError(error instanceof Error ? error.message : 'Unknown configuration error');
      }
    };

    configureFlow();
  }, []);

  // Show loading state while configuring
  if (!isConfigured && !configError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Configuring Flow network...</p>
        </div>
      </div>
    );
  }

  // Show error state if configuration failed
  if (configError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Network Configuration Error</h2>
          <p className="text-gray-600 mb-4">{configError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}