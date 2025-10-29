'use client';

import { useGames } from '@/hooks/useGames';
import { GameCard } from './GameCard';
import { GameState } from '@/types/game';

export function GameList() {
  const { games, loading, error } = useGames();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading games...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-red-500">Error loading games: {error.message}</div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">No games found. Create the first one!</div>
      </div>
    );
  }

  const activeGames = games.filter(g => g.state !== GameState.Completed);
  const completedGames = games.filter(g => g.state === GameState.Completed);

  return (
    <div className="space-y-8">
      {activeGames.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Active Games</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGames.map(game => (
              <GameCard key={game.gameId} game={game} />
            ))}
          </div>
        </div>
      )}

      {completedGames.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Completed Games</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedGames.map(game => (
              <GameCard key={game.gameId} game={game} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}