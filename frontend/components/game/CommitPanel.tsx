'use client';

import { useState, useMemo } from 'react';
import * as fcl from '@onflow/fcl';
import { submitCommitTransaction } from '@/lib/flow/transactions';
import { useFlowUser } from '@/hooks/useFlowUser';
import { generateCommitHash, generateSalt, storeVotingData } from '@/lib/utils/hashUtils';

interface CommitPanelProps {
  gameId: string;
  currentRound: number;
  currentRoundCommits: string[]; // Array of player addresses who have committed
}

export function CommitPanel({ gameId, currentRound, currentRoundCommits }: CommitPanelProps) {
  const { user } = useFlowUser();
  const [selectedVote, setSelectedVote] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [votingData, setVotingData] = useState<{
    salt: string;
    hashes: { voteTrue: string; voteFalse: string };
  } | null>(null);

  // Check if user has already committed in the current round
  const hasCommittedThisRound = useMemo(() => {
    if (!user?.addr || !currentRoundCommits) return false;
    return currentRoundCommits.includes(user.addr);
  }, [user?.addr, currentRoundCommits]);

  // Generate voting data when component mounts or vote changes
  const handleVoteSelection = (vote: boolean) => {
    setSelectedVote(vote);
    setError(null);
    
    // Generate salt and hashes
    const salt = generateSalt();
    const hashes = {
      voteTrue: generateCommitHash(true, salt),
      voteFalse: generateCommitHash(false, salt)
    };
    
    const data = { salt, hashes };
    setVotingData(data);
    
    // Store voting data for this game
    storeVotingData(gameId, {
      ...data,
      debug: {
        trueString: 'true' + salt,
        falseString: 'false' + salt,
        algorithm: 'SHA3_256'
      }
    });
  };

  const handleCommit = async () => {
    if (!user?.addr || !selectedVote !== null || !votingData || hasCommittedThisRound || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const commitHash = selectedVote === true ? votingData.hashes.voteTrue : votingData.hashes.voteFalse;

      const transactionId = await fcl.mutate({
        ...submitCommitTransaction(gameId, commitHash),
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      console.log('Commit transaction submitted:', transactionId);
      
      // Wait for transaction to be sealed
      const result = await fcl.tx(transactionId).onceSealed();
      console.log('Commit transaction sealed:', result);
      
      // Store the selected vote for reveal phase
      if (typeof window !== 'undefined') {
        localStorage.setItem(`selected_vote_${gameId}_${currentRound}`, selectedVote.toString());
      }
      
      // Note: hasCommittedThisRound will be updated when the game data is refetched
    } catch (err: any) {
      console.error('Commit transaction failed:', err);
      setError(err.message || 'Failed to submit commit');
    } finally {
      setSubmitting(false);
    }
  };

  if (hasCommittedThisRound) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-md">
        <p className="text-green-800">
          Your vote commitment has been submitted for this round!
        </p>
        <p className="text-sm text-green-600 mt-1">
          Wait for the reveal phase to reveal your actual vote.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Commit Your Vote</h3>
      <p className="text-sm text-gray-600 mb-4">
        First, select and commit your vote (it will be hidden). You'll reveal it in the next phase.
      </p>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Vote Selection */}
      <div className="mb-4">
        <p className="text-sm font-medium text-gray-700 mb-2">Select your vote:</p>
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

      {/* Commit Hash Display */}
      {votingData && selectedVote !== null && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
          <p className="text-xs text-gray-600 mb-1">Your commit hash:</p>
          <p className="font-mono text-xs text-gray-800 break-all">
            {selectedVote === true ? votingData.hashes.voteTrue : votingData.hashes.voteFalse}
          </p>
        </div>
      )}

      {/* Commit Button */}
      <button
        onClick={handleCommit}
        disabled={submitting || !user?.addr || selectedVote === null}
        className="w-full py-3 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {submitting ? 'Committing...' : 'Commit Vote'}
      </button>

      <p className="mt-3 text-sm text-gray-600">
        Remember: Only the minority vote advances to the next round!
      </p>
    </div>
  );
}