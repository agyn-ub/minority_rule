'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useGames } from '@/hooks/useGames';
import { useAvailableGames } from '@/hooks/useAvailableGames';
import { GameCard } from './GameCard';
import { GamesPagination } from './GamesPagination';
import { GameState, Game } from '@/types/game';
import { useFlowUser } from '@/hooks/useFlowUser';

interface GameListProps {
  filter?: 'available' | 'created' | 'joined';
}

export function GameList({ filter }: GameListProps) {
  const [currentStartId, setCurrentStartId] = useState<number>(1);
  const [pageHistory, setPageHistory] = useState<number[]>([1]);
  const { user } = useFlowUser();

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentStartId(1);
    setPageHistory([1]);
  }, [filter]);
  
  // Use different hooks based on filter
  const availableGamesData = useAvailableGames({
    limit: 10,
    startId: currentStartId,
    descending: false
  });
  
  const allGamesData = useGames({
    maxGames: 20,
    startId: currentStartId,
    descending: true
  });
  
  // Choose which data to use based on filter
  const { games, loading, error, pagination } = filter === 'available' 
    ? availableGamesData 
    : allGamesData;

  // Filter and sort games based on the filter prop
  const filteredGames = useMemo(() => {
    let filtered = [...games];
    
    // For available games, the filtering is already done by the contract and hook
    if (filter && filter !== 'available' && user) {
      switch (filter) {
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
    
    // Sort by gameId (available games are already sorted ascending, others descending)
    if (filter === 'available') {
      // Available games come pre-sorted from the contract
      return filtered;
    } else {
      // Sort other filters by gameId in descending order (newest first)
      return filtered.sort((a, b) => {
        const gameIdA = parseInt(a.gameId);
        const gameIdB = parseInt(b.gameId);
        return gameIdB - gameIdA;
      });
    }
  }, [games, filter, user]);

  const handleNextPage = () => {
    if (filter === 'available' && pagination.hasNext && pagination.nextStartId !== undefined) {
      // For available games, use smart contract's next/previous logic
      setPageHistory(prev => [...prev, currentStartId]);
      setCurrentStartId(pagination.nextStartId);
    } else if (filter !== 'available' && pagination.nextStartId !== undefined) {
      // For other filters, use old logic
      setPageHistory(prev => [...prev, currentStartId]);
      setCurrentStartId(pagination.nextStartId);
    }
  };

  const handlePreviousPage = () => {
    if (filter === 'available' && pagination.hasPrevious && pagination.previousStartId !== undefined) {
      // For available games, use smart contract's previous logic
      setPageHistory(prev => [...prev, currentStartId]);
      setCurrentStartId(pagination.previousStartId);
    } else if (filter !== 'available' && pageHistory.length > 1) {
      // For other filters, use history-based logic
      const newHistory = [...pageHistory];
      newHistory.pop(); // Remove current page
      const previousStartId = newHistory[newHistory.length - 1];
      setPageHistory(newHistory);
      setCurrentStartId(previousStartId);
    }
  };

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
      <div className="space-y-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">{emptyMessage}</div>
        </div>
        
        {/* Show pagination even when no results, so user can go back */}
        <GamesPagination
          pagination={pagination}
          onNextPage={
            filter === 'available' 
              ? (pagination.hasNext ? handleNextPage : undefined)
              : (pagination.nextStartId !== undefined ? handleNextPage : undefined)
          }
          onPreviousPage={
            filter === 'available'
              ? (pagination.hasPrevious ? handlePreviousPage : undefined)
              : (pageHistory.length > 1 ? handlePreviousPage : undefined)
          }
          loading={loading}
        />

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 text-center">
            Debug: startId={currentStartId}, history=[{pageHistory.join(', ')}], 
            hasNext={filter === 'available' ? pagination.hasNext : 'N/A'}, 
            hasPrevious={filter === 'available' ? pagination.hasPrevious : 'N/A'},
            nextId={pagination.nextStartId}, prevId={pagination.previousStartId}
          </div>
        )}
      </div>
    );
  }

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
        onNextPage={
          filter === 'available' 
            ? (pagination.hasNext ? handleNextPage : undefined)
            : (pagination.nextStartId !== undefined ? handleNextPage : undefined)
        }
        onPreviousPage={
          filter === 'available'
            ? (pagination.hasPrevious ? handlePreviousPage : undefined)
            : (pageHistory.length > 1 ? handlePreviousPage : undefined)
        }
        loading={loading}
      />
    </div>
  );
}