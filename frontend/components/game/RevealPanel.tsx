'use client';

import { useState, useMemo, useEffect } from 'react';
import * as fcl from '@onflow/fcl';
import { submitRevealTransaction } from '@/lib/flow/transactions';
import { useFlowUser } from '@/hooks/useFlowUser';
import { getStoredVotingData } from '@/lib/utils/hashUtils';

interface RevealPanelProps {
  gameId: string;
  currentRound: number;
  currentRoundReveals: string[]; // Array of player addresses who have revealed
}

export function RevealPanel({ gameId, currentRound, currentRoundReveals }: RevealPanelProps) {
  const { user } = useFlowUser();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storedVoteData, setStoredVoteData] = useState<any>(null);
  const [selectedVote, setSelectedVote] = useState<boolean | null>(null);

  // Check if user has already revealed in the current round
  const hasRevealedThisRound = useMemo(() => {
    if (!user?.addr || !currentRoundReveals) return false;
    return currentRoundReveals.includes(user.addr);
  }, [user?.addr, currentRoundReveals]);

  // Load stored voting data when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const votingData = getStoredVotingData(gameId);
      setStoredVoteData(votingData);
      
      // Try to load the selected vote from local storage
      const savedVote = localStorage.getItem(`selected_vote_${gameId}_${currentRound}`);
      if (savedVote !== null) {
        setSelectedVote(savedVote === 'true');
      }
    }
  }, [gameId, currentRound]);

  const handleVoteSelection = (vote: boolean) => {
    setSelectedVote(vote);
    setError(null);
    
    // Store the selection
    if (typeof window !== 'undefined') {
      localStorage.setItem(`selected_vote_${gameId}_${currentRound}`, vote.toString());
    }
  };

  const handleReveal = async () => {
    if (!user?.addr || selectedVote === null || !storedVoteData || hasRevealedThisRound || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const transactionId = await fcl.mutate({
        ...submitRevealTransaction(gameId, selectedVote, storedVoteData.salt),
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      console.log('Reveal transaction submitted:', transactionId);
      
      // Wait for transaction to be sealed
      const result = await fcl.tx(transactionId).onceSealed();
      console.log('Reveal transaction sealed:', result);
      
      // Clean up stored data after successful reveal
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`selected_vote_${gameId}_${currentRound}`);
      }
      
    } catch (err: any) {
      console.error('Reveal transaction failed:', err);
      setError(err.message || 'Failed to submit reveal');
    } finally {
      setSubmitting(false);
    }
  };

  if (hasRevealedThisRound) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <p className="text-green-800">
          Your vote has been revealed for this round!
        </p>
        <p className="text-sm text-green-600 mt-1">
          Wait for other players to reveal their votes, then the round will be processed.
        </p>
      </div>
    );
  }

  if (!storedVoteData) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-yellow-800">
          No commit data found for this game.
        </p>
        <p className="text-sm text-yellow-600 mt-1">
          You need to commit a vote first in the commit phase.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Reveal Your Vote</h3>
      <p className="text-sm text-gray-600 mb-4">
        Now reveal the actual vote you committed in the previous phase.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Vote Selection */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">What was your committed vote?</p>
        <div className="flex gap-4">
          <button
            onClick={() => handleVoteSelection(true)}
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
              selectedVote === true
                ? 'border-green-500 bg-green-50 text-green-800'
                : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
            }`}
          >
            YES
          </button>
          <button
            onClick={() => handleVoteSelection(false)}
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-colors ${
              selectedVote === false
                ? 'border-red-500 bg-red-50 text-red-800'
                : 'border-gray-300 bg-white text-gray-700 hover:border-red-300'
            }`}
          >
            NO
          </button>
        </div>
      </div>

      {/* Voting Data Info */}
      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-xs text-gray-600 mb-1">Your commit data:</p>
        <p className="font-mono text-xs text-gray-800 mb-1">
          Salt: {storedVoteData.salt.slice(0, 16)}...
        </p>
        {selectedVote !== null && (
          <p className="font-mono text-xs text-gray-800">
            Hash: {selectedVote === true ? storedVoteData.hashes.voteTrue : storedVoteData.hashes.voteFalse}
          </p>
        )}
      </div>

      {/* Reveal Button */}
      <button
        onClick={handleReveal}
        disabled={submitting || !user?.addr || selectedVote === null}
        className="w-full py-3 px-6 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {submitting ? 'Revealing...' : 'Reveal Vote'}
      </button>

      <div className="mt-3 text-sm text-gray-600">
        <p>⚠️ Make sure to reveal the exact same vote you committed!</p>
        <p>Revealing a different vote will cause the transaction to fail.</p>
      </div>
    </div>
  );
}