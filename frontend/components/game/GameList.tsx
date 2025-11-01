'use client';

import React, { useMemo, useState } from 'react';
import { useGames } from '@/hooks/useGames';
import { GameCard } from './GameCard';
import { GamesPagination } from './GamesPagination';
import { GameState, Game } from '@/types/game';
import { useFlowUser } from '@/hooks/useFlowUser';

interface GameListProps {
  filter?: 'available' | 'created' | 'joined';
}

export function GameList({ filter }: GameListProps) {
  const [currentPage, setCurrentPage] = useState<number | undefined>(undefined);
  const { games, loading, error, pagination } = useGames({
    maxGames: 20, // Show 20 games per page
    startId: currentPage,
    descending: true
  });
  const { user } = useFlowUser();

  // Filter and sort games based on the filter prop
  const filteredGames = useMemo(() => {
    let filtered = [...games];
    
    if (filter && user) {
      switch (filter) {
        case 'available':
          // Games that are accepting new players (Round 1, commit phase)
          filtered = games.filter(g => 
            (g.state === GameState.CommitPhase || g.stateName === 'commitPhase') && 
            g.currentRound === 1 && 
            !g.players.includes(user.addr)
          );
          break;
        case 'created':
          // Games created by current user
          filtered = games.filter(g => g.creator === user.addr);
          break;
        case 'joined':
          // Games where user is a participant
          filtered = games.filter(g => g.players.includes(user.addr));
          break;
      }
    }
    
    // Sort by gameId in descending order (newest first)
    return filtered.sort((a, b) => {
      const gameIdA = parseInt(a.gameId);
      const gameIdB = parseInt(b.gameId);
      return gameIdB - gameIdA;
    });
  }, [games, filter, user]);

  const { activeGames, completedGames } = useMemo(() => {
    const active = filteredGames.filter(g => 
      g.state !== GameState.Completed && g.stateName !== 'completed'
    );
    const completed = filteredGames.filter(g => 
      g.state === GameState.Completed || g.stateName === 'completed'
    );
    return { activeGames: active, completedGames: completed };
  }, [filteredGames]);

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

  if (filteredGames.length === 0) {
    const emptyMessage = filter 
      ? `No ${filter} games found.`
      : 'No games found. Create the first one!';
    
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">{emptyMessage}</div>
      </div>
    );
  }

  const handleNextPage = () => {
    if (pagination.hasMore && pagination.nextStartId !== undefined) {
      setCurrentPage(pagination.nextStartId);
    }
  };

  const handlePreviousPage = () => {
    // For previous page, we need to calculate the previous startId
    // This is simplified - in a real app you'd track page history
    if (currentPage !== undefined) {
      const newStartId = currentPage + pagination.limit;
      setCurrentPage(newStartId);
    }
  };

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

      {/* Pagination */}
      <GamesPagination
        pagination={pagination}
        onNextPage={pagination.hasMore ? handleNextPage : undefined}
        onPreviousPage={currentPage !== undefined ? handlePreviousPage : undefined}
        loading={loading}
      />
    </div>
  );
}