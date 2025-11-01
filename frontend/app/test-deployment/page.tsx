'use client';

import { useState } from 'react';
import * as fcl from '@onflow/fcl';
import { TEST_CONTRACT_DEPLOYMENT } from '@/lib/flow/cadence/scripts/TestContractDeployment';

export default function TestDeploymentPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testDeployment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const deploymentResult = await fcl.query({
        cadence: TEST_CONTRACT_DEPLOYMENT,
        args: []
      });
      setResult(deploymentResult);
    } catch (err: any) {
      setError(err.message);
      console.error('Deployment test error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Contract Deployment Test</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Test Contract Deployment</h2>
          <p className="text-gray-600 mb-4">
            This will test if the MinorityRuleGame contract is properly deployed and accessible.
          </p>
          
          <button
            onClick={testDeployment}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Testing...' : 'Test Deployment'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <h3 className="font-semibold text-red-900 mb-2">Error</h3>
            <pre className="text-red-800 text-sm whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h3 className="font-semibold text-green-900 mb-2">Deployment Test Results</h3>
            <pre className="text-green-800 text-sm whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}