'use client';

import { useFlowCurrentUser } from '@onflow/react-sdk';
import CreateGame from '@/src/components/CreateGame';

export default function CreateGamePage() {
  const { user } = useFlowCurrentUser();
  const isLoggedIn = user?.loggedIn;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
            Create New Game
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Set up a new minority rule game with your custom question. Players will vote yes/no, and only those voting with the minority advance to the next round.
          </p>
        </div>

        {!isLoggedIn ? (
          <div className="max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-lg border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Wallet Required
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Please connect your Flow wallet to create a new game.
            </p>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ← Go to Home
            </a>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <CreateGame />
          </div>
        )}
      </div>
    </div>
  );
}