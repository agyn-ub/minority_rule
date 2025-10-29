'use client';

import { useState } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { SUBMIT_VOTE } from '@/lib/flow/cadence/transactions/SubmitVote';
import { useFlowUser } from '@/hooks/useFlowUser';

interface VotingPanelProps {
  gameId: string;
  currentRound: number;
}

export function VotingPanel({ gameId, currentRound }: VotingPanelProps) {
  const { user } = useFlowUser();
  const [hasVoted, setHasVoted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async (vote: boolean) => {
    if (!user?.addr || hasVoted || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const transactionId = await fcl.mutate({
        cadence: SUBMIT_VOTE,
        args: (arg: any, t: any) => [
          arg(gameId, t.UInt64),
          arg(vote, t.Bool)
        ],
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      console.log('Vote transaction submitted:', transactionId);
      
      // Wait for transaction to be sealed
      const result = await fcl.tx(transactionId).onceSealed();
      console.log('Vote transaction sealed:', result);
      
      setHasVoted(true);
    } catch (err: any) {
      console.error('Vote transaction failed:', err);
      setError(err.message || 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  if (hasVoted) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <p className="text-green-800">Your vote has been submitted for this round!</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Cast Your Vote</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={() => handleVote(true)}
          disabled={submitting || !user?.addr}
          className="flex-1 py-3 px-6 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          {submitting ? 'Submitting...' : 'YES'}
        </button>
        <button
          onClick={() => handleVote(false)}
          disabled={submitting || !user?.addr}
          className="flex-1 py-3 px-6 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          {submitting ? 'Submitting...' : 'NO'}
        </button>
      </div>

      <p className="mt-3 text-sm text-gray-600">
        Remember: Only the minority vote advances to the next round!
      </p>
    </div>
  );
}