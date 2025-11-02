'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFlowUser } from '@/hooks/useFlowUser';
import { useGame } from '@/hooks/useGame';

export default function GameSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useFlowUser();
  const gameId = params.id as string;
  const { game, loading, error } = useGame(gameId);

  const isCreator = user?.addr && game?.creator === user.addr;
  const gameState = game?.state;

  useEffect(() => {
    if (!loading && (!game || !isCreator)) {
      router.push('/');
    }
  }, [game, isCreator, loading, router]);

  if (loading) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              ← Back to Dashboard
            </Link>
            <Link 
              href={`/game/${gameId}`}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              View Game
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Game Settings</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Game ID:</span> {gameId}
            </div>
            <div>
              <span className="font-medium">Question:</span> {game.questionText}
            </div>
            <div>
              <span className="font-medium">Entry Fee:</span> {game.entryFee} FLOW
            </div>
            <div>
              <span className="font-medium">Current State:</span> 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                gameState === 0 ? 'bg-yellow-100 text-yellow-800' :
                gameState === 1 ? 'bg-blue-100 text-blue-800' :
                gameState === 2 ? 'bg-purple-100 text-purple-800' :
                'bg-green-100 text-green-800'
              }`}>
                {gameState === 0 ? 'Commit Phase' :
                 gameState === 1 ? 'Reveal Phase' :
                 gameState === 2 ? 'Processing' :
                 'Completed'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Settings Categories</h2>
          <p className="text-gray-600 mb-6">
            Configure different aspects of your game. Select a category below to access specific settings.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link 
              href={`/game/${gameId}/settings/commit-deadlines`}
              className="border rounded-lg p-6 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${gameState === 0 ? 'bg-yellow-500' : 'bg-gray-300'}`}></div>
                <h3 className="font-semibold text-lg">Commit Phase Deadlines</h3>
                {gameState === 0 && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Set deadlines for the commit phase when players submit their vote commitments.
              </p>
              <div className="text-sm text-blue-600 group-hover:text-blue-800">
                Configure commit settings →
              </div>
            </Link>

            <Link 
              href={`/game/${gameId}/settings/reveal-deadlines`}
              className="border rounded-lg p-6 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-3 h-3 rounded-full ${gameState === 1 ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                <h3 className="font-semibold text-lg">Reveal Phase Deadlines</h3>
                {gameState === 1 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Set deadlines for the reveal phase when players reveal their actual votes.
              </p>
              <div className="text-sm text-blue-600 group-hover:text-blue-800">
                Configure reveal settings →
              </div>
            </Link>
          </div>
        </div>

        {gameState === 3 && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Game Completed</h2>
            <p className="text-gray-600">
              This game has finished. Settings are available for viewing only.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}