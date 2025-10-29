'use client';

import { useParams } from 'next/navigation';
import { useGame } from '@/hooks/useGame';
import { VotingPanel } from '@/components/game/VotingPanel';
import { RoundTimer } from '@/components/game/RoundTimer';
import { PlayersList } from '@/components/game/PlayersList';
import { GameState } from '@/types/game';
import Link from 'next/link';
import { useFlowUser } from '@/hooks/useFlowUser';
import { JoinGameButton } from '@/components/game/JoinGameButton';

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;
  const { game, loading, error } = useGame(gameId);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              ← Back to Games
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Game Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="text-2xl font-bold mb-4">{game.questionText}</h1>
              <div className="grid grid-cols-2 gap-4 text-sm">
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

            {/* Game Status */}
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
                  </div>
                )}

                {!user?.addr && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-800">Connect your wallet to participate.</p>
                  </div>
                )}
              </div>
            )}

            {game.state === GameState.ProcessingRound && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Processing Round {game.currentRound}</h2>
                <p className="text-gray-600">The round is being processed. Please wait...</p>
              </div>
            )}

            {game.state === GameState.Completed && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Game Completed!</h2>
                {game.winners.length > 0 ? (
                  <div>
                    <p className="text-gray-600 mb-2">Winners:</p>
                    <ul className="space-y-1">
                      {game.winners.map(winner => (
                        <li key={winner} className="font-mono text-sm">
                          {winner}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-4 text-green-600 font-semibold">
                      Prize per winner: {(parseFloat(game.entryFee) * game.totalPlayers * 0.97 / game.winners.length).toFixed(2)} FLOW
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-600">No winners in this game.</p>
                )}
              </div>
            )}

            {/* Voting Stats */}
            {game.currentRoundTotalVotes > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-3">Current Round Votes</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Yes Votes:</span>
                    <span className="font-semibold">{game.currentRoundYesVotes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">No Votes:</span>
                    <span className="font-semibold">{game.currentRoundNoVotes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Votes:</span>
                    <span className="font-semibold">{game.currentRoundTotalVotes}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <PlayersList 
              players={game.remainingPlayers} 
              totalPlayers={game.totalPlayers}
              title="Remaining Players"
            />
          </div>
        </div>
      </main>
    </div>
  );
}