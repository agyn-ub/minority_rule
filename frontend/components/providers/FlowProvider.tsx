'use client';

import { ReactNode, useEffect } from 'react';
import * as fcl from '@onflow/fcl';
import { flowConfig, getCurrentNetwork, getMinorityRuleGameAddress } from '@/lib/flow/config';

// Configure FCL immediately when module loads
fcl.config(flowConfig);

export function FlowProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Verify configuration is set
    const network = getCurrentNetwork();
    const contractAddress = getMinorityRuleGameAddress();
    const apiConfig = fcl.config().get('accessNode.api');
    
    console.log('Flow Configuration:');
    console.log('- Network:', network);
    console.log('- Contract Address:', contractAddress);
    console.log('- Access Node:', apiConfig);
    
    if (!apiConfig) {
      console.error('FCL configuration failed!');
    }
    if (!contractAddress) {
      console.error('Contract address not configured!');
    }
  }, []);

  return <>{children}</>;
}