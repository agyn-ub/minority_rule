'use client';

import { useState } from 'react';
import * as fcl from '@onflow/fcl';
import { createGameTransaction } from '@/lib/flow/transactions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugPage() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      addLog('Attempting to connect wallet...');
      const currentUser = await fcl.authenticate();
      setUser(currentUser);
      addLog('Wallet connected successfully');
      addLog(`User address: ${currentUser.addr}`);
    } catch (error: any) {
      addLog(`Wallet connection failed: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const testConfiguration = async () => {
    try {
      addLog('=== Testing FCL Configuration ===');
      
      // Test individual config keys
      const configKeys = [
        'flow.network',
        'accessNode.api', 
        'discovery.wallet',
        'walletconnect.projectId',
        'app.detail.title',
        'fcl.limit',
        'fcl.timeout'
      ];
      
      for (const key of configKeys) {
        try {
          const value = await fcl.config().get(key);
          addLog(`✅ ${key}: ${value}`);
        } catch (error: any) {
          addLog(`❌ ${key}: ERROR - ${error.message}`);
        }
      }
      
      // Test network connectivity
      addLog('=== Testing Network Connectivity ===');
      try {
        const accessNode = await fcl.config().get('accessNode.api');
        const response = await fetch(`${accessNode}/v1/blocks?height=latest`, {
          signal: AbortSignal.timeout(5000)
        });
        addLog(`✅ Network response: ${response.status} ${response.statusText}`);
      } catch (error: any) {
        addLog(`❌ Network test failed: ${error.message}`);
      }
      
    } catch (error: any) {
      addLog(`Configuration test failed: ${error.message}`);
    }
  };

  const testTransaction = async () => {
    try {
      addLog('=== Starting Transaction Test ===');
      
      // Test user authentication
      if (!user?.addr) {
        addLog('❌ User not authenticated');
        return;
      }
      
      const transaction = createGameTransaction('Test Question', '1.0');
      addLog(`Transaction cadence preview: ${transaction.cadence.substring(0, 200)}...`);
      
      // Test transaction args
      try {
        const args = transaction.args((arg: any, t: any) => ({ arg, t }), {
          String: 'String',
          UFix64: 'UFix64', 
          Address: 'Address'
        });
        addLog(`Transaction args: ${JSON.stringify(args, null, 2)}`);
      } catch (error: any) {
        addLog(`❌ Args generation failed: ${error.message}`);
        return;
      }
      
      addLog('Submitting transaction...');
      const txId = await fcl.mutate({
        ...transaction,
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });
      
      addLog(`✅ Transaction submitted with ID: ${txId}`);
      addLog('Waiting for transaction to seal...');
      
      const result = await fcl.tx(txId).onceSealed();
      addLog(`✅ Transaction sealed successfully`);
      addLog(`Events: ${JSON.stringify(result.events, null, 2)}`);
      
    } catch (error: any) {
      addLog(`❌ Transaction failed: ${error.message}`);
      addLog(`Error stack: ${error.stack}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Debug Page</CardTitle>
          <CardDescription>Debug Flow transactions and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div>
              <Button 
                onClick={connectWallet} 
                disabled={isConnecting}
                className="mr-4"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </Button>
              
              <Button 
                onClick={testConfiguration}
                className="mr-4"
                variant="outline"
              >
                Test Configuration
              </Button>
            </div>
            
            {user && (
              <div>
                <Button 
                  onClick={testTransaction}
                  className="mr-4"
                >
                  Test Create Game Transaction
                </Button>
              </div>
            )}
          </div>

          {user && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <p>Connected as: {user.addr}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Debug Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
                {logs.length === 0 && <div>No logs yet...</div>}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}