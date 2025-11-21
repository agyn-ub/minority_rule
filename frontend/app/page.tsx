'use client';

import { WalletConnect } from '@/components/flow/WalletConnect';
import { useFlowUser } from '@/hooks/useFlowUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
                  <Button asChild>
                    <Link href="/create">
                      Create Game
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/history">
                      My History
                    </Link>
                  </Button>
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
                <Card className="hover:shadow-lg transition-all duration-200 group-hover:border-blue-300">
                  <CardHeader>
                    <div className="text-blue-600 text-4xl mb-4">🎮</div>
                    <CardTitle className="text-xl">
                      Browse Available Games
                    </CardTitle>
                    <CardDescription>
                      Discover new games you can join. Vote with the minority to survive and win prizes!
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-blue-600 group-hover:text-blue-700 font-medium">
                      Explore Games →
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* Joined Games Card */}
              <Link href="/games/joined" className="group">
                <Card className="hover:shadow-lg transition-all duration-200 group-hover:border-green-300">
                  <CardHeader>
                    <div className="text-green-600 text-4xl mb-4">📊</div>
                    <CardTitle className="text-xl">
                      My Joined Games
                    </CardTitle>
                    <CardDescription>
                      View all the games you've participated in. Check your progress and game history.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-green-600 group-hover:text-green-700 font-medium">
                      View My Games →
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Quick Actions */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <p className="text-gray-500 mb-4">Quick Actions</p>
              <div className="flex justify-center gap-4">
                <Button asChild size="lg">
                  <Link href="/create">
                    Create New Game
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/history">
                    Full Game History
                  </Link>
                </Button>
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
            <Card className="max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="text-xl">How to Play:</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-left text-muted-foreground space-y-2">
                  <li>• Join a game and commit your vote (hidden)</li>
                  <li>• When time's up, reveal your actual vote</li>
                  <li>• Only minority voters advance to next round</li>
                  <li>• Last 1-2 players split the prize pool!</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}