import { GameList } from '@/components/game/GameList';
import { WalletConnect } from '@/components/flow/WalletConnect';
import Link from 'next/link';

export default function Home() {
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
              <Link
                href="/create"
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Create Game
              </Link>
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GameList />
      </main>
    </div>
  );
}