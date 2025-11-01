'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as fcl from '@onflow/fcl';
import { useFlowUser } from '@/hooks/useFlowUser';
import { GET_PLAYER_STATUS } from '@/lib/flow/cadence/scripts/GetPlayerStatus';
import { GET_ALL_ACTIVE_GAMES } from '@/lib/flow/cadence/scripts/GetAllGames';

interface GameHistoryEntry {
  gameId: string;
  questionText: string;
  entryFee: string;
  creator: string;
  state: number;
  currentRound: number;
  players: string[];
  remainingPlayers: string[];
  winners: string[];
  prizePool: string;
  playerStatus?: {
    hasJoined: boolean;
    isActive: boolean;
    isEliminated: boolean;
    isWinner: boolean;
    totalRoundsPlayed: number;
    status: string;
  };
}

export default function HistoryPage() {
  const { user } = useFlowUser();
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'active' | 'created'>('all');

  useEffect(() => {
    const loadUserHistory = async () => {
      if (!user?.addr) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Get all games first
        const result = await fcl.query({
          cadence: GET_ALL_ACTIVE_GAMES,
          args: (arg: any, t: any) => [
            arg(100, t.UInt64) // Limit to last 100 games for performance
          ]
        });

        if (!result || !result.allGames) {
          setGameHistory([]);
          return;
        }

        const allGames = result.allGames;

        // For each game, check if user participated
        const userGameHistory: GameHistoryEntry[] = [];
        
        for (const game of allGames) {
          try {
            // Check if user was involved in this game (as player or creator)
            const isCreator = game.creator === user.addr;
            const isPlayer = game.players.includes(user.addr);
            
            if (isCreator || isPlayer) {
              let playerStatus = null;
              
              if (isPlayer) {
                // Get detailed player status
                playerStatus = await fcl.query({
                  cadence: GET_PLAYER_STATUS,
                  args: (arg: any, t: any) => [
                    arg(game.gameId, t.UInt64),
                    arg(user.addr, t.Address)
                  ]
                });
              }
              
              userGameHistory.push({
                ...game,
                playerStatus
              });
            }
          } catch (err) {
            console.error(`Failed to get status for game ${game.gameId}:`, err);
            // Still add the game even if we can't get player status
            const isCreator = game.creator === user.addr;
            const isPlayer = game.players.includes(user.addr);
            
            if (isCreator || isPlayer) {
              userGameHistory.push(game);
            }
          }
        }
        
        // Sort by game ID (most recent first)
        userGameHistory.sort((a, b) => parseInt(b.gameId) - parseInt(a.gameId));
        
        setGameHistory(userGameHistory);
      } catch (err: any) {
        console.error('Failed to load user history:', err);
        setError(`Failed to load game history: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadUserHistory();
  }, [user?.addr]);

  const getGameStateDisplay = (state: number) => {
    switch (state) {
      case 0: return { label: 'Commit Phase', color: 'bg-yellow-100 text-yellow-800' };
      case 1: return { label: 'Reveal Phase', color: 'bg-blue-100 text-blue-800' };
      case 2: return { label: 'Processing', color: 'bg-purple-100 text-purple-800' };
      case 3: return { label: 'Completed', color: 'bg-green-100 text-green-800' };
      default: return { label: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const filteredGames = gameHistory.filter(game => {
    switch (filter) {
      case 'completed':
        return game.state === 3;
      case 'active':
        return game.state < 3;
      case 'created':
        return game.creator === user?.addr;
      default:
        return true;
    }
  });

  const getPlayerRole = (game: GameHistoryEntry) => {
    const isCreator = game.creator === user?.addr;
    const isPlayer = game.players.includes(user?.addr || '');
    
    if (isCreator && isPlayer) return 'Creator & Player';
    if (isCreator) return 'Creator';
    if (isPlayer) return 'Player';
    return 'Unknown';
  };

  const getPlayerResult = (game: GameHistoryEntry) => {
    if (game.state !== 3) return null; // Game not completed
    
    const playerStatus = game.playerStatus;
    if (playerStatus?.isWinner) return { label: 'Winner! 🏆', color: 'text-green-600' };
    if (playerStatus?.hasJoined && !playerStatus.isWinner) return { label: 'Eliminated', color: 'text-red-600' };
    if (game.creator === user?.addr && !game.players.includes(user?.addr || '')) {
      return { label: 'Game Creator', color: 'text-blue-600' };
    }
    return null;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="text-xl font-bold text-gray-900">
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <h1 className="text-2xl font-bold mb-4">Game History</h1>
            <p className="text-gray-600 mb-6">
              Please connect your wallet to view your game history.
            </p>
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
            <Link href="/" className="text-xl font-bold text-gray-900">
              ← Back to Dashboard
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/create"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Create Game
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Game History</h1>
          <p className="text-gray-600">
            Track your progress across all games you've created or participated in.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              All Games
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'active' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'completed' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setFilter('created')}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filter === 'created' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Created by Me
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your game history...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-4xl mb-4">🎮</div>
            <h2 className="text-xl font-bold mb-2">No Games Found</h2>
            <p className="text-gray-600 mb-6">
              {filter === 'all' 
                ? "You haven't created or joined any games yet."
                : filter === 'created'
                ? "You haven't created any games yet."
                : filter === 'active'
                ? "You don't have any active games."
                : "You don't have any completed games."}
            </p>
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Create Your First Game
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredGames.map((game) => {
              const gameStateInfo = getGameStateDisplay(game.state);
              const playerRole = getPlayerRole(game);
              const playerResult = getPlayerResult(game);
              
              return (
                <div key={game.gameId} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold mb-1">
                        Game #{game.gameId}
                      </h3>
                      <p className="text-gray-700">{game.questionText}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${gameStateInfo.color}`}>
                        {gameStateInfo.label}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {playerRole}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Entry Fee:</span>
                        <span>{game.entryFee} FLOW</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Prize Pool:</span>
                        <span>{game.prizePool} FLOW</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Total Players:</span>
                        <span>{game.players.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Current Round:</span>
                        <span>{game.currentRound}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {game.playerStatus && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Rounds Played:</span>
                            <span>{game.playerStatus.totalRoundsPlayed}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">Status:</span>
                            <span className="text-right">{game.playerStatus.status}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {playerResult && (
                    <div className="mb-4">
                      <span className={`font-semibold ${playerResult.color}`}>
                        {playerResult.label}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {game.state === 3 && game.winners.length > 0 ? (
                        <span>Winners: {game.winners.length} player{game.winners.length !== 1 ? 's' : ''}</span>
                      ) : game.state < 3 ? (
                        <span>Active players: {game.remainingPlayers.length}</span>
                      ) : (
                        <span>Game completed</span>
                      )}
                    </div>
                    
                    <Link
                      href={`/game/${game.gameId}`}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      View Game
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}