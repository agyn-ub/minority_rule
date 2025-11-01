'use client';

import { useState } from 'react';
import { GameList } from '@/components/game/GameList';
import { WalletConnect } from '@/components/flow/WalletConnect';
import { useFlowUser } from '@/hooks/useFlowUser';
import Link from 'next/link';

export default function Home() {
  const { user } = useFlowUser();
  const [activeTab, setActiveTab] = useState<'available' | 'created' | 'joined'>('available');

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
          <>
            {/* Tab Navigation */}
            <div className="flex justify-center mb-8">
              <div className="bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setActiveTab('available')}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'available' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Available Games
                </button>
                <button
                  onClick={() => setActiveTab('created')}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'created' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  My Games
                </button>
                <button
                  onClick={() => setActiveTab('joined')}
                  className={`px-6 py-2 rounded-md font-medium transition-colors ${
                    activeTab === 'joined' 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  Joined Games
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === 'available' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                    Available Games
                  </h2>
                  <p className="text-gray-600 mb-6 text-center">
                    Join any game that's accepting players
                  </p>
                  <GameList filter="available" />
                </div>
              )}
              
              {activeTab === 'created' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                    Games I Created
                  </h2>
                  <p className="text-gray-600 mb-6 text-center">
                    Manage your games and set deadlines
                  </p>
                  <GameList filter="created" />
                </div>
              )}
              
              {activeTab === 'joined' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
                    Games I Joined
                  </h2>
                  <p className="text-gray-600 mb-6 text-center">
                    Games where you're participating as a player
                  </p>
                  <GameList filter="joined" />
                </div>
              )}
            </div>
          </>
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