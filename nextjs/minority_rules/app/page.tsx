'use client';
import { useFlowCurrentUser, Connect } from '@onflow/react-sdk';
import Link from 'next/link';

export default function Home() {
  const { user } = useFlowCurrentUser();
  const isLoggedIn = user?.loggedIn;

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto mb-16">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight text-black dark:text-zinc-50 mb-6">
              Minority Rule Game
            </h1>
            <p className="text-xl md:text-2xl leading-relaxed text-zinc-600 dark:text-zinc-400 mb-8">
              A decentralized game where only the minority wins. Vote strategically, think differently, and split the prize pool.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              {isLoggedIn ? (
                <>
                  <Link
                    href="/create"
                    className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                  >
                    Create New Game
                  </Link>
                  <Link
                    href="/games"
                    className="w-full sm:w-auto px-8 py-4 border border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 font-semibold rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Browse Games
                  </Link>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Connect />
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Connect your wallet to start playing
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* How It Works */}
          <div className="max-w-4xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</span>
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  Join a Game
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Pay the entry fee and join a game with a yes/no question. All players start in Round 1.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">2</span>
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  Vote Strategically
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Vote yes or no. Only players who vote with the MINORITY advance to the next round.
                </p>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800">
                <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">3</span>
                </div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  Win the Prize
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  When 1-2 players remain, they split the entire prize pool. Think differently to win!
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8">
              Why Play Minority Rule?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4 text-left">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 dark:text-blue-400">⛓️</span>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Fully On-Chain
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    Everything runs on Flow blockchain. No central servers, no manipulation.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 text-left">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-green-600 dark:text-green-400">🎯</span>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Strategic Thinking
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    Rewards contrarian thinking and strategic gameplay.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 text-left">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400">💰</span>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Real Prizes
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    Win real FLOW tokens from the accumulated prize pool.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 text-left">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 dark:text-orange-400">⚡</span>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Fast & Fair
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                    Quick rounds, transparent rules, automatic prize distribution.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
