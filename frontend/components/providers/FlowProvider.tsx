'use client';

import { ReactNode, useEffect } from 'react';
import * as fcl from '@onflow/fcl';

// Configure FCL immediately when module loads
fcl.config({
  'app.detail.title': 'Minority Rule Game',
  'app.detail.icon': 'https://placekitten.com/200/200',
  'accessNode.api': 'https://rest-testnet.onflow.org',
  'discovery.wallet': 'https://fcl-discovery.onflow.org/testnet/authn',
  'flow.network': 'testnet',
  '0xMinorityRuleGame': '0x73c003cd6de60fd4',
  '0xScheduledRoundHandler': '0x73c003cd6de60fd4',
  '0xFungibleToken': '0x9a0766d93b6608b7',
  '0xFlowToken': '0x7e60df042a9c0868',
});

export function FlowProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Verify configuration is set
    const apiConfig = fcl.config().get('accessNode.api');
    console.log('FCL accessNode.api configured:', apiConfig);
    
    if (!apiConfig) {
      console.error('FCL configuration failed!');
    }
  }, []);

  return <>{children}</>;
}