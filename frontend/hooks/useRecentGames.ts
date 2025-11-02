'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as fcl from '@onflow/fcl';
import { GET_RECENT_GAMES } from '@/lib/flow/cadence/scripts/GetRecentGames';

interface RecentGames {
  totalGamesInContract: number;
  returnedGames: number;
  activeGames: number;
  completedGames: number;
  waitingForScheduling: number;
  availableToJoin: number;
  allGames: any[];
  activeGamesList: any[];
  completedGamesList: any[];
  waitingForSchedulingList: any[];
  availableToJoinList: any[];
  totalActivePlayers: number;
  totalPrizePool: string;
  limit: number;
  isRecent: boolean;
  fetchedAt: string;
}

// Deep equality check for games list
const areGamesEqual = (a: any[], b: any[]): boolean => {
  if (a.length !== b.length) return false;
  
  return a.every((gameA, index) => {
    const gameB = b[index];
    if (!gameB) return false;
    
    return (
      gameA.gameId === gameB.gameId &&
      gameA.state === gameB.state &&
      gameA.currentRound === gameB.currentRound &&
      gameA.totalPlayers === gameB.totalPlayers &&
      gameA.remainingPlayers === gameB.remainingPlayers &&
      gameA.commitCount === gameB.commitCount &&
      gameA.revealCount === gameB.revealCount
    );
  });
};

// Determine if games need active polling
const needsPolling = (games: any[]): boolean => {
  return games.some(game => 
    game.stateName === 'commitPhase' || 
    game.stateName === 'revealPhase' ||
    game.stateName === 'processingRound'
  );
};

export function useRecentGames(limit: number = 20) {
  const [recentGames, setRecentGames] = useState<RecentGames | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  const fetchRecentGames = useCallback(async (force = false) => {
    // Prevent too frequent requests (minimum 2 seconds between fetches)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 2000) {
      return;
    }
    lastFetchRef.current = now;

    try {
      if (!recentGames) setLoading(true); // Only show loading on initial fetch

      const result = await fcl.query({
        cadence: GET_RECENT_GAMES,
        args: (arg: any, t: any) => [
          arg(limit.toString(), t.UInt64)
        ]
      });

      if (result) {
        // Only update state if data actually changed
        setRecentGames(prevGames => {
          if (prevGames && areGamesEqual(prevGames.allGames, result.allGames)) {
            return prevGames; // Return same reference to prevent re-renders
          }
          return result as RecentGames;
        });
      }
    } catch (err) {
      console.error('Error fetching recent games:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [limit, recentGames]);

  // Setup intelligent polling based on active games
  const setupPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only poll if there are active games that need updates
    if (recentGames && needsPolling(recentGames.allGames)) {
      // Poll every 8 seconds for recent games (slightly less frequent than individual games)
      intervalRef.current = setInterval(() => {
        fetchRecentGames();
      }, 8000);
    }
  }, [recentGames, fetchRecentGames]);

  useEffect(() => {
    // Small delay to ensure FCL configuration is loaded
    const timer = setTimeout(() => {
      fetchRecentGames(true); // Force initial fetch
    }, 100);
    
    return () => clearTimeout(timer);
  }, [limit]);

  useEffect(() => {
    setupPolling();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setupPolling]);

  return { 
    recentGames, 
    loading, 
    error, 
    refetch: () => fetchRecentGames(true) 
  };
}