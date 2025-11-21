'use client';

import React from 'react';
import Link from 'next/link';
import { useUserGameHistory } from '@/hooks/useUserGameHistory';
import { useFlowUser } from '@/hooks/useFlowUser';

export default function JoinedGamesPage() {
  const { user } = useFlowUser();
  const { gameIds, loading, error } = useUserGameHistory({
    userAddress: user?.addr,
    detailed: false // Just get game IDs
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            My Joined Games
          </h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view your joined games.
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
              <h1 className="text-2xl font-bold text-gray-900">My Joined Games</h1>
              <p className="text-sm text-gray-600">Games where you're participating as a player</p>
            </div>
            <div className="flex items-center gap-4">
              <Link 
                href="/history"
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Full History
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
            Your Game Participation History
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Click any game number to view detailed information, current status, and continue playing.
          </p>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading your game history...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center items-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-4">Failed to load joined games: {error.message}</p>
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
            {gameIds.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Games Joined Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  You haven't participated in any games yet. Join your first game to get started!
                </p>
                <Link 
                  href="/games/available"
                  className="inline-block px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Browse Available Games
                </Link>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="bg-white rounded-lg p-4 border shadow-sm mb-8 text-center">
                  <div className="text-2xl font-bold text-gray-900">{gameIds.length}</div>
                  <div className="text-sm text-gray-600">Total Games Participated</div>
                </div>

                {/* Games Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 mb-8">
                  {gameIds.map((gameId) => (
                    <Link 
                      key={gameId} 
                      href={`/game/${gameId}`}
                      className="group"
                    >
                      <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-blue-300 text-center">
                        <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          #{gameId}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Game
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="text-center">
                  <Link 
                    href="/games/available"
                    className="inline-block px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mr-4"
                  >
                    Join More Games
                  </Link>
                  <Link 
                    href="/history"
                    className="inline-block px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    View Detailed History
                  </Link>
                </div>
              </>
            )}
          </>
        )}

        {/* Help Section */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-900 mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-800">
              <div>
                <strong>Click Game #:</strong> View detailed game information and current status
              </div>
              <div>
                <strong>Full History:</strong> See complete statistics, vote history, and wins
              </div>
              <div>
                <strong>Join New Games:</strong> Browse available games accepting new players
              </div>
              <div>
                <strong>Create Game:</strong> Start your own game with custom questions
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}