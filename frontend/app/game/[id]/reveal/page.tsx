'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import * as fcl from '@onflow/fcl';
import { useFlowUser } from '@/hooks/useFlowUser';
import { useGame } from '@/hooks/useGame';
import { submitRevealTransaction } from '@/lib/flow/transactions';
import { GET_PLAYER_STATUS } from '@/lib/flow/cadence/scripts/GetPlayerStatus';
import { getStoredVotingData, verifyVoteHash, clearVotingData } from '@/lib/utils/hashUtils';

export default function RevealVotePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useFlowUser();
  const gameId = params.id as string;
  const { game, loading, error } = useGame(gameId);
  
  const [playerStatus, setPlayerStatus] = useState<any>(null);
  const [storedVoteData, setStoredVoteData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [revealSuccess, setRevealSuccess] = useState(false);
  const [loadingPlayerStatus, setLoadingPlayerStatus] = useState(false);
  const [manualVote, setManualVote] = useState<boolean | null>(null);
  const [manualSalt, setManualSalt] = useState('');
  const [useManualEntry, setUseManualEntry] = useState(false);
  const [hashVerification, setHashVerification] = useState<{ valid: boolean; message: string } | null>(null);

  const gameState = game?.state;

  // Load player status and stored vote data
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
    
    // Load stored voting data
    const voteData = getStoredVotingData(gameId);
    setStoredVoteData(voteData);
  }, [user?.addr, gameId]);

  // Verify hash when manual entry changes
  useEffect(() => {
    if (useManualEntry && manualVote !== null && manualSalt.length === 64) {
      try {
        const isValid = verifyVoteHash(manualVote, manualSalt, storedVoteData?.commitHash || '');
        setHashVerification({
          valid: isValid,
          message: isValid ? 'Hash matches your commitment!' : 'Hash does not match your commitment'
        });
      } catch (err) {
        setHashVerification({
          valid: false,
          message: 'Invalid salt format (must be 64 hex characters)'
        });
      }
    } else {
      setHashVerification(null);
    }
  }, [manualVote, manualSalt, useManualEntry, storedVoteData]);

  // Check if user can reveal
  const canReveal = () => {
    return gameState === 2 && 
           playerStatus?.hasJoined && 
           playerStatus?.isActive &&
           !playerStatus?.hasRevealedThisRound &&
           !revealSuccess;
  };

  // Redirect if not in reveal phase or not eligible
  useEffect(() => {
    if (!loading && !loadingPlayerStatus && playerStatus && game) {
      if (gameState !== 2) {
        router.push(`/game/${gameId}`);
      } else if (!playerStatus.hasJoined || !playerStatus.isActive) {
        router.push(`/game/${gameId}`);
      } else if (playerStatus.hasRevealedThisRound) {
        router.push(`/game/${gameId}`);
      }
    }
  }, [gameState, playerStatus, loading, loadingPlayerStatus, gameId, router, game]);

  const handleRevealVote = async () => {
    if (!gameId || !user?.addr) return;
    
    const voteData = useManualEntry 
      ? { vote: manualVote, salt: manualSalt }
      : storedVoteData;
      
    if (!voteData || voteData.vote === null || !voteData.salt) {
      setRevealError('Missing vote data. Please ensure you have the correct vote and salt.');
      return;
    }

    // Verify hash before submitting
    if (storedVoteData?.commitHash) {
      try {
        const isValid = verifyVoteHash(voteData.vote, voteData.salt, storedVoteData.commitHash);
        if (!isValid) {
          setRevealError('Vote and salt do not match your original commitment hash.');
          return;
        }
      } catch (err) {
        setRevealError('Error verifying vote hash. Please check your vote and salt.');
        return;
      }
    }
    
    setIsSubmitting(true);
    setRevealError(null);
    
    try {
      const transactionId = await fcl.mutate({
        ...submitRevealTransaction(gameId, voteData.vote, voteData.salt),
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      await fcl.tx(transactionId).onceSealed();
      
      // Clear stored voting data after successful reveal
      clearVotingData(gameId);
      setRevealSuccess(true);
      
    } catch (err: any) {
      console.error('Reveal transaction failed:', err);
      setRevealError(`Failed to reveal vote: ${err.message}`);
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

  if (revealSuccess) {
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
            <div className="text-6xl mb-4">🎯</div>
            <h1 className="text-2xl font-bold text-green-600 mb-4">Vote Revealed Successfully!</h1>
            <p className="text-gray-600 mb-6">
              Your vote has been revealed and verified on the blockchain. 
              Wait for other players to reveal their votes and for the round to be processed.
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
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              Reveal Phase
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Game Info */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Reveal Your Vote</h1>
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

        {/* Reveal Form */}
        {canReveal() ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Reveal Your Committed Vote</h2>
            
            {storedVoteData ? (
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                  <h3 className="font-semibold text-green-900 mb-2">✅ Vote Data Found</h3>
                  <p className="text-green-800 text-sm">
                    We found your vote data from the commit phase. Click reveal to submit automatically.
                  </p>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <h3 className="font-semibold mb-2">Your Committed Vote:</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Vote:</span>
                      <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        storedVoteData.vote ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {storedVoteData.vote ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Commit Hash:</span>
                      <span className="ml-2 font-mono text-xs">{storedVoteData.commitHash?.substring(0, 16)}...</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h3 className="font-semibold text-yellow-900 mb-2">⚠️ No Stored Vote Data</h3>
                  <p className="text-yellow-800 text-sm mb-3">
                    We couldn't find your vote data from the commit phase. You can enter it manually below.
                  </p>
                  <button
                    onClick={() => setUseManualEntry(true)}
                    className="text-sm px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                  >
                    Enter Vote Manually
                  </button>
                </div>
              </div>
            )}

            {/* Manual Entry Form */}
            {(useManualEntry || !storedVoteData) && (
              <div className="mb-6 border border-gray-200 rounded-md p-4">
                <h3 className="font-semibold mb-4">Manual Vote Entry</h3>
                
                {/* Vote Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Original Vote
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="manualVote"
                        value="true"
                        checked={manualVote === true}
                        onChange={() => setManualVote(true)}
                        className="mr-2"
                      />
                      <span className="text-green-600 font-medium">YES</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="manualVote"
                        value="false"
                        checked={manualVote === false}
                        onChange={() => setManualVote(false)}
                        className="mr-2"
                      />
                      <span className="text-red-600 font-medium">NO</span>
                    </label>
                  </div>
                </div>

                {/* Salt Entry */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Salt (64 hex characters)
                  </label>
                  <input
                    type="text"
                    value={manualSalt}
                    onChange={(e) => setManualSalt(e.target.value)}
                    placeholder="Enter the salt from your commit phase..."
                    className="w-full p-2 border border-gray-300 rounded-md font-mono text-sm"
                    maxLength={64}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    This is the random salt that was generated when you committed your vote
                  </p>
                </div>

                {/* Hash Verification */}
                {hashVerification && (
                  <div className={`p-3 rounded-md text-sm ${
                    hashVerification.valid 
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : 'bg-red-50 border border-red-200 text-red-800'
                  }`}>
                    {hashVerification.message}
                  </div>
                )}
              </div>
            )}

            {/* Reveal Info */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-6">
              <h3 className="font-semibold mb-2">About Revealing:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Your vote and salt will be verified against your commitment hash</li>
                <li>• Once revealed, your vote becomes public to all players</li>
                <li>• After all reveals, the minority voters advance to the next round</li>
                <li>• You cannot change your vote after revealing</li>
              </ul>
            </div>

            {revealError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <p className="text-red-800">{revealError}</p>
              </div>
            )}

            <button
              onClick={handleRevealVote}
              disabled={
                isSubmitting || 
                (!storedVoteData && (!useManualEntry || manualVote === null || manualSalt.length !== 64)) ||
                (useManualEntry && hashVerification && !hashVerification.valid)
              }
              className="w-full py-3 px-4 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSubmitting ? 'Revealing Vote...' : 'Reveal Vote'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                You cannot reveal a vote at this time.
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