'use client';

import { useParams } from 'next/navigation';
import { useGame } from '@/hooks/useGame';
import { VotingPanel } from '@/components/game/VotingPanel';
import { RoundTimer } from '@/components/game/RoundTimer';
import { PlayersList } from '@/components/game/PlayersList';
import { GameHistory } from '@/components/game/GameHistory';
import { GameProgress } from '@/components/game/GameProgress';
import { WinnerDisplay } from '@/components/game/WinnerDisplay';
import { PlayerProgress } from '@/components/game/PlayerProgress';
import { GameControls } from '@/components/game/GameControls';
import { VotingStatus } from '@/components/game/VotingStatus';
import { GameState } from '@/types/game';
import Link from 'next/link';
import { useFlowUser } from '@/hooks/useFlowUser';
import { JoinGameButton } from '@/components/game/JoinGameButton';
import { analyzeGame } from '@/lib/utils/gameAnalysis';

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;
  const { game, loading, error, refetch } = useGame(gameId);
  const { user } = useFlowUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading game...</div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">Error loading game: {error?.message || 'Game not found'}</div>
      </div>
    );
  }

  const isPlayer = user?.addr && game.players.includes(user.addr);
  const isRemainingPlayer = user?.addr && game.remainingPlayers.includes(user.addr);
  const canJoin = game.currentRound === 1 && game.state === GameState.VotingOpen && !isPlayer;
  const gameAnalysis = analyzeGame(game);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              ← Back to Games
            </Link>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              🔄 Refresh Game
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Game Header */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-3xl font-bold mb-4">{game.questionText}</h1>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Game ID:</span>
                <span className="ml-2 font-semibold">#{game.gameId}</span>
              </div>
              <div>
                <span className="text-gray-600">Round:</span>
                <span className="ml-2 font-semibold">{game.currentRound}</span>
              </div>
              <div>
                <span className="text-gray-600">Entry Fee:</span>
                <span className="ml-2 font-semibold">{game.entryFee} FLOW</span>
              </div>
              <div>
                <span className="text-gray-600">Prize Pool:</span>
                <span className="ml-2 font-semibold text-green-600">
                  {(parseFloat(game.entryFee) * game.totalPlayers * 0.97).toFixed(2)} FLOW
                </span>
              </div>
            </div>
          </div>

          {/* Main Game Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Game Actions */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Completed Game - Show Winners */}
              {game.state === GameState.Completed && (
                <WinnerDisplay game={game} />
              )}

              {/* Active Round - Voting */}
              {game.state === GameState.VotingOpen && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Round {game.currentRound}</h2>
                  <RoundTimer deadline={game.roundDeadline} />
                  
                  {canJoin && user?.addr && (
                    <div className="mt-4">
                      <JoinGameButton gameId={game.gameId} entryFee={game.entryFee} />
                    </div>
                  )}

                  {isRemainingPlayer && (
                    <div className="mt-4">
                      <VotingPanel 
                        gameId={game.gameId} 
                        currentRound={game.currentRound}
                        playerVoteHistory={game.playerVoteHistory}
                      />
                    </div>
                  )}

                  {isPlayer && !isRemainingPlayer && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-red-800">You have been eliminated from this game.</p>
                      <p className="text-red-600 text-sm mt-1">View your journey below to see how you performed.</p>
                    </div>
                  )}

                  {!user?.addr && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-yellow-800">Connect your wallet to participate.</p>
                    </div>
                  )}

                  {/* Current Round Voting Stats */}
                  {game.currentRoundTotalVotes > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="text-lg font-semibold mb-3">Current Round Votes</h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-600">{game.currentRoundYesVotes}</div>
                          <div className="text-sm text-gray-600">YES</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600">{game.currentRoundNoVotes}</div>
                          <div className="text-sm text-gray-600">NO</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gray-700">{game.currentRoundTotalVotes}</div>
                          <div className="text-sm text-gray-600">Total</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Processing Round */}
              {game.state === GameState.ProcessingRound && (
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Processing Round {game.currentRound}</h2>
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="text-4xl mb-4">⚙️</div>
                      <p className="text-gray-600 mb-2">Round results are being processed...</p>
                      <p className="text-sm text-gray-500">This may take a few moments</p>
                    </div>
                  </div>
                </div>
              )}

              {/* User's Player Progress (if they participated) */}
              {isPlayer && user?.addr && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Your Journey</h2>
                  <PlayerProgress 
                    game={game}
                    playerAddress={user.addr}
                    showFullHistory={true}
                  />
                </div>
              )}

            </div>

            {/* Right Column - Game Progress & Players */}
            <div className="space-y-6">
              {/* Game Progress Timeline */}
              <GameProgress game={game} />
              
              {/* Voting Status - Show during active voting */}
              {game.state === GameState.VotingOpen && (
                <VotingStatus game={game} />
              )}
              
              {/* Game Controls */}
              <GameControls game={game} onGameUpdate={refetch} />
              
              {/* Players List */}
              <PlayersList 
                players={game.remainingPlayers} 
                totalPlayers={game.totalPlayers}
                title="Remaining Players"
              />
            </div>
          </div>

          {/* Game History Section */}
          {gameAnalysis.completedRounds.length > 0 && (
            <GameHistory game={game} />
          )}
        </div>
      </main>
    </div>
  );
}