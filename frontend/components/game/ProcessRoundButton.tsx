'use client';

import React, { useState } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { processRoundTransaction } from '@/lib/flow/transactions';

interface ProcessRoundButtonProps {
  gameId: string;
  currentRound: number;
  onSuccess?: () => void;
}

export function ProcessRoundButton({ gameId, currentRound, onSuccess }: ProcessRoundButtonProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcessRound = async () => {
    setProcessing(true);
    setError(null);

    try {
      const transactionId = await fcl.mutate({
        ...processRoundTransaction(gameId),
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      console.log('Process round transaction submitted:', transactionId);
      
      // Wait for transaction to be sealed
      const result = await fcl.tx(transactionId).onceSealed();
      console.log('Process round transaction sealed:', result);
      
      onSuccess?.();
    } catch (err: any) {
      console.error('Process round transaction failed:', err);
      setError(err.message || 'Failed to process round');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      <button
        onClick={handleProcessRound}
        disabled={processing}
        className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {processing ? 'Processing Round...' : `Process Round ${currentRound}`}
      </button>
      
      <p className="text-sm text-gray-600 text-center">
        Process the round when deadline passes or all players have revealed their votes
      </p>
    </div>
  );
}