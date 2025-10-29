'use client';

import { useState, useMemo } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { SUBMIT_VOTE } from '@/lib/flow/cadence/transactions/SubmitVote';
import { useFlowUser } from '@/hooks/useFlowUser';
import { VoteRecord } from '@/types/game';

interface VotingPanelProps {
  gameId: string;
  currentRound: number;
  playerVoteHistory: Record<string, VoteRecord[]>;
}

export function VotingPanel({ gameId, currentRound, playerVoteHistory }: VotingPanelProps) {
  const { user } = useFlowUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has already voted in the current round
  const hasVotedThisRound = useMemo(() => {
    if (!user?.addr || !playerVoteHistory) return false;
    
    const userVoteHistory = playerVoteHistory[user.addr] || [];
    return userVoteHistory.some(vote => vote.round === currentRound);
  }, [user?.addr, playerVoteHistory, currentRound]);

  // Get the user's vote for this round if they've voted
  const userVoteThisRound = useMemo(() => {
    if (!user?.addr || !playerVoteHistory) return null;
    
    const userVoteHistory = playerVoteHistory[user.addr] || [];
    const vote = userVoteHistory.find(vote => vote.round === currentRound);
    return vote || null;
  }, [user?.addr, playerVoteHistory, currentRound]);

  const handleVote = async (vote: boolean) => {
    if (!user?.addr || hasVotedThisRound || submitting) return;

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
      
      // Note: hasVotedThisRound will be updated when the game data is refetched
    } catch (err: any) {
      console.error('Vote transaction failed:', err);
      setError(err.message || 'Failed to submit vote');
    } finally {
      setSubmitting(false);
    }
  };

  if (hasVotedThisRound) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <p className="text-green-800">
          Your vote has been submitted for this round! 
          {userVoteThisRound && (
            <span className="font-semibold ml-1">
              You voted: {userVoteThisRound.vote ? 'YES' : 'NO'}
            </span>
          )}
        </p>
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