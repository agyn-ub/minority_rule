'use client';

import React from 'react';
import Link from 'next/link';
import { useAvailableGames } from '@/hooks/useAvailableGames';
import { GameCard } from '@/components/game/GameCard';
import { useFlowUser } from '@/hooks/useFlowUser';

export default function AvailableGamesPage() {
  const { user } = useFlowUser();
  const { games, loading, error, pagination } = useAvailableGames({
    limit: 10,
    startId: 1,
    descending: false
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Available Games
          </h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view available games.
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Available Games</h1>
              <p className="text-sm text-gray-600">Join any game that's accepting players</p>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/create"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Create Game
              </Link>
              <Link 
                href="/" 
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Description */}
        <div className="text-center mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Games Open for New Players
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            These games are in their first round and accepting new participants. 
            Join any game to start playing - remember, only the minority survives each round!
          </p>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        )}

        {error && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-4">Failed to load available games: {error.message}</p>
              <button 
                onClick={() => window.location.reload()}
                className="text-blue-600 hover:text-blue-800"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {games.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🎮</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Available Games
                </h3>
                <p className="text-gray-600 mb-6">
                  There are no games currently accepting new players.
                </p>
                <Link 
                  href="/create"
                  className="inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Create the First Game
                </Link>
              </div>
            ) : (
              <>
                {/* Games Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {games.map(game => (
                    <GameCard key={game.gameId} game={game} />
                  ))}
                </div>

                {/* Pagination Info */}
                {pagination && (
                  <div className="text-center text-sm text-gray-500">
                    Showing {games.length} game{games.length !== 1 ? 's' : ''} 
                    {pagination.totalGames > 0 && ` of ${pagination.totalGames} total`}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Help Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">
              How to Play
            </h3>
            <ul className="text-blue-800 space-y-2">
              <li>• <strong>Join:</strong> Click any game card to join during Round 1</li>
              <li>• <strong>Commit:</strong> Submit your vote commitment (hidden from others)</li>
              <li>• <strong>Reveal:</strong> When time's up, reveal your actual vote</li>
              <li>• <strong>Survive:</strong> Only minority voters advance to the next round</li>
              <li>• <strong>Win:</strong> Last 1-2 players split the prize pool!</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}