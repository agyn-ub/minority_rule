'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import * as fcl from '@onflow/fcl';
import { useFlowUser } from '@/hooks/useFlowUser';
import { useGame } from '@/hooks/useGame';
import { JOIN_GAME } from '@/lib/flow/cadence/transactions/JoinGame';
import { GET_PLAYER_STATUS } from '@/lib/flow/cadence/scripts/GetPlayerStatus';

interface PlayerStatus {
  hasJoined: boolean;
  isActive: boolean;
  isEliminated: boolean;
  isWinner: boolean;
  hasRevealedThisRound: boolean;
  currentRoundVote: boolean | null;
  totalRoundsPlayed: number;
  status: string;
  totalCommitsThisRound: number;
  totalRevealsThisRound: number;
}

export default function GameDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useFlowUser();
  const gameId = params.id as string;
  const { game, loading, error, refetch } = useGame(gameId);
  
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [loadingPlayerStatus, setLoadingPlayerStatus] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Check if user is the game creator
  const isCreator = user?.addr && game?.creator === user.addr;
  const gameState = game?.state;

  // Load player status when user and game are available
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
  }, [user?.addr, gameId, game]);

  const handleJoinGame = async () => {
    if (!gameId || !user?.addr) return;
    
    setIsJoining(true);
    setJoinError(null);
    
    try {
      const transactionId = await fcl.mutate({
        cadence: JOIN_GAME,
        args: (arg: any, t: any) => [
          arg(gameId, t.UInt64)
        ],
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      await fcl.tx(transactionId).onceSealed();
      
      // Refresh game and player status
      refetch();
      // Reload player status
      const result = await fcl.query({
        cadence: GET_PLAYER_STATUS,
        args: (arg: any, t: any) => [
          arg(gameId, t.UInt64),
          arg(user.addr, t.Address)
        ]
      });
      setPlayerStatus(result);
      
    } catch (err: any) {
      setJoinError(`Failed to join game: ${err.message}`);
    } finally {
      setIsJoining(false);
    }
  };

  const getGameStateDisplay = () => {
    const stateName = game?.stateName;
    if (stateName) {
      switch (stateName) {
        case 'setCommitDeadline': return { label: 'Setup: Setting Commit Deadline', color: 'bg-orange-100 text-orange-800' };
        case 'setRevealDeadline': return { label: 'Setup: Setting Reveal Deadline', color: 'bg-orange-100 text-orange-800' };
        case 'commitPhase': return { label: 'Commit Phase', color: 'bg-yellow-100 text-yellow-800' };
        case 'revealPhase': return { label: 'Reveal Phase', color: 'bg-blue-100 text-blue-800' };
        case 'processingRound': return { label: 'Processing Round', color: 'bg-purple-100 text-purple-800' };
        case 'completed': return { label: 'Completed', color: 'bg-green-100 text-green-800' };
        default: return { label: stateName, color: 'bg-gray-100 text-gray-800' };
      }
    }
    
    // Fallback to numeric state
    switch (gameState) {
      case 0: return { label: 'Setup: Commit Deadline', color: 'bg-orange-100 text-orange-800' };
      case 1: return { label: 'Setup: Reveal Deadline', color: 'bg-orange-100 text-orange-800' };
      case 2: return { label: 'Commit Phase', color: 'bg-yellow-100 text-yellow-800' };
      case 3: return { label: 'Reveal Phase', color: 'bg-blue-100 text-blue-800' };
      case 4: return { label: 'Processing Round', color: 'bg-purple-100 text-purple-800' };
      case 5: return { label: 'Completed', color: 'bg-green-100 text-green-800' };
      default: return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const canJoinGame = () => {
    return (gameState === 2 || game?.stateName === 'commitPhase') && 
           game?.currentRound === 1 && 
           !playerStatus?.hasJoined;
  };

  const canCommitVote = () => {
    return (gameState === 2 || game?.stateName === 'commitPhase') && 
           playerStatus?.hasJoined && 
           playerStatus?.isActive;
  };

  const canRevealVote = () => {
    return (gameState === 3 || game?.stateName === 'revealPhase') && 
           playerStatus?.hasJoined && 
           playerStatus?.isActive && 
           !playerStatus?.hasRevealedThisRound;
  };

  if (loading || loadingPlayerStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading game...</p>
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

  const gameStateInfo = getGameStateDisplay();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              ← Back to Dashboard
            </Link>
            {isCreator && (
              <Link 
                href={`/game/${gameId}/settings`}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Game Settings
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Game Information */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold">Game #{gameId}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${gameStateInfo.color}`}>
              {gameStateInfo.label}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Question</h3>
              <p className="text-gray-700 text-lg">{game.questionText}</p>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Entry Fee:</span>
                <span>{game.entryFee} FLOW</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Players:</span>
                <span>{game.players?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Active Players:</span>
                <span>{game.remainingPlayers?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Current Round:</span>
                <span>{game.currentRound}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Prize Pool:</span>
                <span>{game.prizePool || game.prizeAmount} FLOW</span>
              </div>
              {game.stateName === 'commitPhase' && (
                <>
                  <div className="flex justify-between">
                    <span className="font-medium">Commits This Round:</span>
                    <span>{game.commitCount || 0}</span>
                  </div>
                  {game.commitDeadlineFormatted && (
                    <div className="flex justify-between">
                      <span className="font-medium">Commit Deadline:</span>
                      <span className="text-sm">{game.commitDeadlineFormatted}</span>
                    </div>
                  )}
                </>
              )}
              {game.stateName === 'revealPhase' && (
                <>
                  <div className="flex justify-between">
                    <span className="font-medium">Reveals This Round:</span>
                    <span>{game.revealCount || 0}</span>
                  </div>
                  {game.revealDeadlineFormatted && (
                    <div className="flex justify-between">
                      <span className="font-medium">Reveal Deadline:</span>
                      <span className="text-sm">{game.revealDeadlineFormatted}</span>
                    </div>
                  )}
                </>
              )}
              {game.timeRemainingInPhase && (
                <div className="flex justify-between">
                  <span className="font-medium">Time Remaining:</span>
                  <span className="text-sm">{game.timeRemainingInPhase}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Player Status */}
        {user && playerStatus && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Your Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="font-medium">Status:</span>
                <span className="ml-2">{playerStatus.status}</span>
              </div>
              <div>
                <span className="font-medium">Rounds Played:</span>
                <span className="ml-2">{playerStatus.totalRoundsPlayed}</span>
              </div>
              {gameState === 0 && (
                <>
                  <div>
                    <span className="font-medium">Commits This Round:</span>
                    <span className="ml-2">{playerStatus.totalCommitsThisRound}</span>
                  </div>
                </>
              )}
              {gameState === 1 && (
                <>
                  <div>
                    <span className="font-medium">Reveals This Round:</span>
                    <span className="ml-2">{playerStatus.totalRevealsThisRound}</span>
                  </div>
                  <div>
                    <span className="font-medium">You Revealed:</span>
                    <span className="ml-2">{playerStatus.hasRevealedThisRound ? 'Yes' : 'No'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Actions</h2>
          
          {!user ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-yellow-800">Please connect your wallet to interact with this game.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Join Game */}
              {canJoinGame() && (
                <div>
                  <h3 className="font-semibold mb-2">Join Game</h3>
                  <p className="text-gray-600 text-sm mb-3">
                    {isCreator 
                      ? "As the game creator, you must also join your game to participate. Pay the entry fee to join and compete with other players."
                      : "Pay the entry fee to join this game. You can only join during the commit phase."
                    }
                  </p>
                  <button
                    onClick={handleJoinGame}
                    disabled={isJoining}
                    className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors"
                  >
                    {isJoining ? 'Joining...' : `Join Game (${game.entryFee} FLOW)`}
                  </button>
                  {joinError && (
                    <p className="text-red-600 text-sm mt-2">{joinError}</p>
                  )}
                </div>
              )}

              {/* Commit Vote */}
              {canCommitVote() && (
                <div>
                  <h3 className="font-semibold mb-2">Commit Your Vote</h3>
                  <p className="text-gray-600 text-sm mb-3">
                    Submit your encrypted vote. Your vote will be hidden until the reveal phase.
                  </p>
                  <Link
                    href={`/game/${gameId}/commit`}
                    className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Commit Vote
                  </Link>
                </div>
              )}

              {/* Reveal Vote */}
              {canRevealVote() && (
                <div>
                  <h3 className="font-semibold mb-2">Reveal Your Vote</h3>
                  <p className="text-gray-600 text-sm mb-3">
                    Reveal your actual vote and provide the salt to prove your commitment.
                  </p>
                  <Link
                    href={`/game/${gameId}/reveal`}
                    className="inline-block px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    Reveal Vote
                  </Link>
                </div>
              )}

              {/* Game completed */}
              {(gameState === 5 || game?.stateName === 'completed') && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <h3 className="font-semibold text-green-900 mb-2">Game Completed!</h3>
                  {playerStatus?.isWinner ? (
                    <p className="text-green-800">🏆 Congratulations! You are one of the winners!</p>
                  ) : playerStatus?.hasJoined ? (
                    <p className="text-green-800">Thanks for playing! Better luck next time.</p>
                  ) : (
                    <p className="text-green-800">This game has concluded.</p>
                  )}
                </div>
              )}
              
              {/* Game in setup phase */}
              {(gameState === 0 || gameState === 1 || game?.stateName === 'setCommitDeadline' || game?.stateName === 'setRevealDeadline') && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                  <h3 className="font-semibold text-orange-900 mb-2">Game Setup in Progress</h3>
                  {isCreator ? (
                    <p className="text-orange-800">
                      Please set the commit and reveal deadlines in the Game Settings before players can join.
                    </p>
                  ) : (
                    <p className="text-orange-800">
                      The game creator is still setting up deadlines. Check back soon!
                    </p>
                  )}
                </div>
              )}

              {/* Eliminated - highest priority */}
              {playerStatus?.hasJoined && !playerStatus?.isActive && !(gameState === 5 || game?.stateName === 'completed') ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-800">You have been eliminated from this game.</p>
                </div>
              ) : /* Already participated - lower priority */
              playerStatus?.hasJoined && !canCommitVote() && !canRevealVote() && !(gameState === 5 || game?.stateName === 'completed') ? (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-blue-800">
                    {(gameState === 2 || game?.stateName === 'commitPhase') && 'You have already joined this game. Wait for commit phase actions.'}
                    {(gameState === 3 || game?.stateName === 'revealPhase') && playerStatus.hasRevealedThisRound && 'You have revealed your vote. Wait for round processing.'}
                    {(gameState === 3 || game?.stateName === 'revealPhase') && !playerStatus.hasRevealedThisRound && 'You can now reveal your vote!'}
                    {(gameState === 4 || game?.stateName === 'processingRound') && 'Round is being processed. Please wait.'}
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}