'use client';

import { WalletConnect } from '@/components/flow/WalletConnect';
import { useFlowUser } from '@/hooks/useFlowUser';
import Link from 'next/link';

export default function Home() {
  const { user } = useFlowUser();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Minority Rule Game</h1>
              <p className="text-sm text-gray-600">Vote with the minority to survive!</p>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <>
                  <Link
                    href="/create"
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Create Game
                  </Link>
                  <Link
                    href="/history"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    My History
                  </Link>
                </>
              )}
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user ? (
          <div className="text-center py-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome back, {user.addr.slice(0, 8)}...
            </h2>
            <p className="text-lg text-gray-600 mb-12">
              What would you like to do today?
            </p>

            {/* Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Available Games Card */}
              <Link href="/games/available" className="group">
                <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-blue-300">
                  <div className="text-blue-600 text-4xl mb-4">🎮</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    Browse Available Games
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Discover new games you can join. Vote with the minority to survive and win prizes!
                  </p>
                  <div className="text-blue-600 group-hover:text-blue-700 font-medium">
                    Explore Games →
                  </div>
                </div>
              </Link>

              {/* Joined Games Card */}
              <Link href="/games/joined" className="group">
                <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group-hover:border-green-300">
                  <div className="text-green-600 text-4xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    My Joined Games
                  </h3>
                  <p className="text-gray-600 mb-6">
                    View all the games you've participated in. Check your progress and game history.
                  </p>
                  <div className="text-green-600 group-hover:text-green-700 font-medium">
                    View My Games →
                  </div>
                </div>
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-gray-500 mb-4">Quick Actions</p>
              <div className="flex justify-center gap-4">
                <Link
                  href="/create"
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Create New Game
                </Link>
                <Link
                  href="/history"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Full Game History
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Welcome to Minority Rule
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              A strategic voting game where only the minority survives each round. 
              Connect your wallet to start creating and joining games!
            </p>
            <div className="bg-white rounded-lg p-8 max-w-md mx-auto shadow-sm border">
              <h3 className="text-xl font-semibold mb-4">How to Play:</h3>
              <ul className="text-left text-gray-600 space-y-2">
                <li>• Join a game and commit your vote (hidden)</li>
                <li>• When time's up, reveal your actual vote</li>
                <li>• Only minority voters advance to next round</li>
                <li>• Last 1-2 players split the prize pool!</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}