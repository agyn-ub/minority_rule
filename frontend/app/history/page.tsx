'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useFlowUser } from '@/hooks/useFlowUser';
import { usePlayerGameHistory } from '@/hooks/usePlayerGameHistory';

export default function HistoryPage() {
  const { user } = useFlowUser();
  const { history, loading, error } = usePlayerGameHistory(user?.addr);
  const [filter, setFilter] = useState<'all' | 'completed' | 'active' | 'created' | 'won'>('all');

  const getStateLabel = (stateName: string) => {
    switch (stateName) {
      case 'setCommitDeadline': return 'Setup: Commit Deadline';
      case 'setRevealDeadline': return 'Setup: Reveal Deadline';
      case 'commitPhase': return 'Commit Phase';
      case 'revealPhase': return 'Reveal Phase';
      case 'processingRound': return 'Processing Round';
      case 'completed': return 'Completed';
      default: return stateName || 'Unknown';
    }
  };

  const getStateColor = (stateName: string) => {
    switch (stateName) {
      case 'setCommitDeadline':
      case 'setRevealDeadline':
        return 'bg-orange-100 text-orange-800';
      case 'commitPhase':
        return 'bg-yellow-100 text-yellow-800';
      case 'revealPhase':
        return 'bg-blue-100 text-blue-800';
      case 'processingRound':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredGames = useMemo(() => {
    if (!history) return [];
    
    switch (filter) {
      case 'all':
        return history.allGames;
      case 'completed':
        return history.completedGamesList || history.allGames.filter(g => g.stateName === 'completed');
      case 'active':
        return history.activeGamesList || history.allGames.filter(g => g.stateName !== 'completed');
      case 'created':
        return history.createdGamesList || history.allGames.filter(g => g.playerStatus?.isCreator);
      case 'won':
        return history.wonGamesList || history.allGames.filter(g => g.playerStatus?.isWinner);
      default:
        return history.allGames;
    }
  }, [history, filter]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Game History
          </h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view your game history.
          </p>
          <Link 
            href="/" 
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your game history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load game history: {error.message}</p>
          <Link 
            href="/" 
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Game History</h1>
              <p className="text-sm text-gray-600">Your participation in Minority Rule games</p>
            </div>
            <Link 
              href="/" 
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        {history && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{history.totalGamesParticipated}</div>
              <div className="text-sm text-gray-600">Total Games</div>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="text-2xl font-bold text-green-600">{history.gamesCreated}</div>
              <div className="text-sm text-gray-600">Games Created</div>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{history.gamesPlayed}</div>
              <div className="text-sm text-gray-600">Games Played</div>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="text-2xl font-bold text-purple-600">{history.gamesWon}</div>
              <div className="text-sm text-gray-600">Games Won</div>
            </div>
            <div className="bg-white rounded-lg p-4 border shadow-sm">
              <div className="text-2xl font-bold text-yellow-600">{Math.round(history.winRate * 100)}%</div>
              <div className="text-sm text-gray-600">Win Rate</div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            {[
              { key: 'all', label: 'All Games' },
              { key: 'active', label: 'Active' },
              { key: 'completed', label: 'Completed' },
              { key: 'created', label: 'Created' },
              { key: 'won', label: 'Won' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key as any)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  filter === key 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Games List */}
        {filteredGames.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {filter === 'all' 
                ? "You haven't participated in any games yet."
                : `No ${filter} games found.`
              }
            </p>
            <Link 
              href="/" 
              className="mt-4 inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Join a Game
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGames.map((game: any) => (
              <Link href={`/game/${game.gameId}`} key={game.gameId}>
                <div className="bg-white rounded-lg p-6 border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Game #{game.gameId}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(game.stateName)}`}>
                      {getStateLabel(game.stateName)}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4 line-clamp-2">{game.questionText}</p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Entry Fee:</span>
                      <span className="font-medium">{game.entryFee} FLOW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Players:</span>
                      <span className="font-medium">{game.remainingPlayers}/{game.totalPlayers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Prize Pool:</span>
                      <span className="font-medium">{game.prizePool} FLOW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Round:</span>
                      <span className="font-medium">{game.currentRound}</span>
                    </div>
                  </div>

                  {/* Player Status */}
                  {game.playerStatus && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Your Role:</span>
                        <div className="flex space-x-2">
                          {game.playerStatus.isCreator && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Creator</span>
                          )}
                          {game.playerStatus.isWinner && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Winner</span>
                          )}
                          {game.playerStatus.isActivePlayer && game.stateName !== 'completed' && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Active</span>
                          )}
                        </div>
                      </div>
                      {game.playerStatus.totalRoundsPlayed > 0 && (
                        <div className="flex justify-between mt-2">
                          <span className="text-sm text-gray-500">Rounds Played:</span>
                          <span className="text-sm font-medium">{game.playerStatus.totalRoundsPlayed}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}