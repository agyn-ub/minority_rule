'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import * as fcl from '@onflow/fcl';
import { useFlowUser } from '@/hooks/useFlowUser';
import { useGame } from '@/hooks/useGame';
import { submitCommitTransaction } from '@/lib/flow/transactions';
import { GET_PLAYER_STATUS } from '@/lib/flow/cadence/scripts/GetPlayerStatus';
import { generateCommitHash, generateSalt, storeVotingData } from '@/lib/utils/hashUtils';

export default function CommitVotePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useFlowUser();
  const gameId = params.id as string;
  const { game, loading, error } = useGame(gameId);
  
  const [playerStatus, setPlayerStatus] = useState<any>(null);
  const [selectedVote, setSelectedVote] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitSuccess, setCommitSuccess] = useState(false);
  const [loadingPlayerStatus, setLoadingPlayerStatus] = useState(false);

  const gameState = game?.state;

  // Load player status
  useEffect(() => {
    const loadPlayerStatus = async () => {
      if (!user?.addr || !gameId) return;
      
      setLoadingPlayerStatus(true);
      try {
        const result = await fcl.query({
          cadence: GET_PLAYER_STATUS,
          args: (arg: any, t: any) => [
            arg(gameId, t.UInt64),
            arg(user.addr, t.Address)
          ]
        });
        setPlayerStatus(result);
      } catch (err) {
        console.error('Failed to load player status:', err);
      } finally {
        setLoadingPlayerStatus(false);
      }
    };

    loadPlayerStatus();
  }, [user?.addr, gameId]);

  // Check if user can commit
  const canCommit = () => {
    return gameState === 1 && 
           playerStatus?.hasJoined && 
           playerStatus?.isActive &&
           !commitSuccess;
  };

  // Redirect if not in commit phase or not eligible
  useEffect(() => {
    if (!loading && !loadingPlayerStatus && playerStatus && game) {
      if (gameState !== 1) {
        router.push(`/game/${gameId}`);
      } else if (!playerStatus.hasJoined || !playerStatus.isActive) {
        router.push(`/game/${gameId}`);
      }
    }
  }, [gameState, playerStatus, loading, loadingPlayerStatus, gameId, router, game]);

  const handleCommitVote = async () => {
    if (!gameId || !user?.addr || selectedVote === null) return;
    
    setIsSubmitting(true);
    setCommitError(null);
    
    try {
      // Generate salt and hash
      const salt = generateSalt();
      const commitHash = generateCommitHash(selectedVote, salt);
      
      console.log('Vote details:', {
        vote: selectedVote,
        salt: salt,
        hash: commitHash
      });
      
      // Submit commit transaction
      const transactionId = await fcl.mutate({
        ...submitCommitTransaction(gameId, commitHash),
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      await fcl.tx(transactionId).onceSealed();
      
      // Store voting data in localStorage for reveal phase
      storeVotingData(gameId, {
        vote: selectedVote,
        salt: salt,
        commitHash: commitHash,
        round: game?.currentRound || 1,
        timestamp: Date.now()
      });
      
      setCommitSuccess(true);
      
    } catch (err: any) {
      console.error('Commit transaction failed:', err);
      setCommitError(`Failed to commit vote: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || loadingPlayerStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load game</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (commitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href={`/game/${gameId}`} className="text-xl font-bold text-gray-900">
                ← Back to Game
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-600 mb-4">Vote Committed Successfully!</h1>
            <p className="text-gray-600 mb-6">
              Your vote has been encrypted and submitted to the blockchain. 
              You can reveal it when the reveal phase begins.
            </p>
            <div className="space-y-3">
              <Link
                href={`/game/${gameId}`}
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Back to Game
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href={`/game/${gameId}`} className="text-xl font-bold text-gray-900">
              ← Back to Game
            </Link>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              Commit Phase
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Game Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Commit Your Vote</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">Question:</h3>
            <p className="text-blue-800 text-lg">{game.questionText}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium">Game ID:</span> #{gameId}
            </div>
            <div>
              <span className="font-medium">Round:</span> {game.currentRound}
            </div>
          </div>
        </div>

        {/* Voting Form */}
        {canCommit() ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Choose Your Vote</h2>
            <p className="text-gray-600 mb-6">
              Select your answer. Your vote will be encrypted and hidden until the reveal phase.
            </p>

            <div className="space-y-4 mb-6">
              {/* YES Option */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedVote === true 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-green-300'
                }`}
                onClick={() => setSelectedVote(true)}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="vote"
                    value="true"
                    checked={selectedVote === true}
                    onChange={() => setSelectedVote(true)}
                    className="mr-3 h-4 w-4 text-green-600"
                  />
                  <span className="text-lg font-semibold text-green-600">YES</span>
                </div>
                <p className="ml-7 text-sm text-gray-600">
                  Vote YES for the question above
                </p>
              </div>

              {/* NO Option */}
              <div 
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedVote === false 
                    ? 'border-red-500 bg-red-50' 
                    : 'border-gray-200 hover:border-red-300'
                }`}
                onClick={() => setSelectedVote(false)}
              >
                <div className="flex items-center">
                  <input
                    type="radio"
                    name="vote"
                    value="false"
                    checked={selectedVote === false}
                    onChange={() => setSelectedVote(false)}
                    className="mr-3 h-4 w-4 text-red-600"
                  />
                  <span className="text-lg font-semibold text-red-600">NO</span>
                </div>
                <p className="ml-7 text-sm text-gray-600">
                  Vote NO for the question above
                </p>
              </div>
            </div>

            {/* Commit Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
              <h3 className="font-semibold mb-2">How Commit-Reveal Works:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Your vote will be encrypted with a random salt</li>
                <li>• Only the hash of your vote is stored on-chain</li>
                <li>• During reveal phase, you'll provide your actual vote and salt</li>
                <li>• This prevents others from seeing your vote until everyone reveals</li>
              </ul>
            </div>

            {commitError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800">{commitError}</p>
              </div>
            )}

            <button
              onClick={handleCommitVote}
              disabled={selectedVote === null || isSubmitting}
              className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSubmitting ? 'Committing Vote...' : 'Commit Vote'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                You cannot commit a vote at this time.
              </p>
              <Link
                href={`/game/${gameId}`}
                className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Back to Game
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}