'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { GET_ALL_ACTIVE_GAMES } from '@/lib/flow/cadence/scripts/GetAllGames';
import { TESTNET_CONTRACT_ADDRESS } from '@/lib/flow/config';
import { Game, GameState } from '@/types/game';

// Deep equality check for games list
const areGamesEqual = (a: Game[], b: Game[]): boolean => {
  if (a.length !== b.length) return false;
  
  return a.every((gameA, index) => {
    const gameB = b[index];
    if (!gameB) return false;
    
    return (
      gameA.gameId === gameB.gameId &&
      gameA.state === gameB.state &&
      gameA.currentRound === gameB.currentRound &&
      gameA.totalPlayers === gameB.totalPlayers &&
      gameA.remainingPlayers.length === gameB.remainingPlayers.length &&
      gameA.currentRoundTotalVotes === gameB.currentRoundTotalVotes
    );
  });
};

// Determine if games list needs active polling
const needsPolling = (games: Game[]): boolean => {
  return games.some(game => 
    game.state === GameState.VotingOpen || 
    game.state === GameState.ProcessingRound
  );
};

interface PaginationInfo {
  startId?: number;
  limit: number;
  descending: boolean;
  hasMore: boolean;
  nextStartId?: number;
  returnedCount: number;
}

interface UseGamesOptions {
  maxGames?: number;
  startId?: number;
  descending?: boolean;
}

export function useGames(options: UseGamesOptions = {}) {
  const { maxGames = 50, startId, descending = true } = options;
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    limit: maxGames,
    descending,
    hasMore: false,
    returnedCount: 0
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  const parseGameData = useCallback((game: any): Game => {
    const currentRoundYesVotes = Number(game.currentYesVotes || game.currentRoundYesVotes || 0);
    const currentRoundNoVotes = Number(game.currentNoVotes || game.currentRoundNoVotes || 0);
    const currentRoundTotalVotes = currentRoundYesVotes + currentRoundNoVotes;
    
    return {
      gameId: game.gameId,
      questionText: game.questionText,
      entryFee: game.entryFee,
      creator: game.creator,
      roundDuration: game.roundDuration || 3600, // Default fallback
      state: Number(game.state),
      currentRound: Number(game.currentRound),
      roundDeadline: game.roundDeadline,
      totalPlayers: Number(game.totalPlayers),
      players: game.players || [],
      playerVoteHistory: game.playerVoteHistory || {},
      currentRoundYesVotes,
      currentRoundNoVotes,
      currentRoundTotalVotes,
      remainingPlayers: game.remainingPlayers || [],
      winners: game.winners || [],
      prizeAmount: game.prizePool || game.prizeAmount,
      roundResults: game.roundResults || {}
    };
  }, []);

  const fetchGames = useCallback(async (force = false) => {
    // Prevent too frequent requests (minimum 2 seconds between fetches)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 2000) {
      return;
    }
    lastFetchRef.current = now;

    try {
      if (games.length === 0) setLoading(true); // Only show loading on initial fetch
      
      // Ensure FCL is configured
      const apiConfig = fcl.config().get('accessNode.api');
      if (!apiConfig) {
        throw new Error('FCL not configured. Please wait for configuration to load.');
      }
      
      const result = await fcl.query({
        cadence: GET_ALL_ACTIVE_GAMES,
        args: (arg: any, t: any) => [
          arg(maxGames.toString(), t.UInt64),
          startId ? arg(startId.toString(), t.UInt64) : arg(null, t.Optional(t.UInt64)),
          arg(descending, t.Bool)
        ]
      });

      if (result && result.allGames) {
        const formattedGames = (result.allGames as any[]).map(parseGameData);
        
        // Update pagination info
        if (result.pagination) {
          setPagination({
            startId: result.pagination.startId,
            limit: result.pagination.limit,
            descending: result.pagination.descending,
            hasMore: result.pagination.hasMore,
            nextStartId: result.pagination.nextStartId,
            returnedCount: result.pagination.returnedCount
          });
        }
        
        // Only update state if data actually changed
        setGames(prevGames => {
          if (areGamesEqual(prevGames, formattedGames)) {
            return prevGames; // Return same reference to prevent re-renders
          }
          return formattedGames;
        });
      }
    } catch (err) {
      console.error('Error fetching games:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [maxGames, startId, descending, games.length, parseGameData]);

  // Setup intelligent polling based on active games
  const setupPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only poll if there are active games that need updates
    if (needsPolling(games)) {
      // Poll every 10 seconds for games list (less frequent than individual games)
      intervalRef.current = setInterval(() => {
        fetchGames();
      }, 10000);
    }
  }, [games, fetchGames]);

  useEffect(() => {
    // Small delay to ensure FCL configuration is loaded
    const timer = setTimeout(() => {
      fetchGames(true); // Force initial fetch
    }, 100);
    
    return () => clearTimeout(timer);
  }, [maxGames, startId, descending]);

  useEffect(() => {
    setupPolling();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setupPolling]);

  // Add pagination functions
  const loadMore = useCallback(() => {
    if (pagination.hasMore && pagination.nextStartId !== undefined) {
      // For "load more" functionality, we'd need to append to existing games
      // For now, we'll just fetch the next page
      fetchGames(true);
    }
  }, [pagination, fetchGames]);

  const goToPage = useCallback((newStartId: number) => {
    // This would typically be handled by parent component updating the startId prop
    fetchGames(true);
  }, [fetchGames]);

  return { 
    games, 
    loading, 
    error, 
    pagination,
    refetch: () => fetchGames(true),
    loadMore,
    goToPage
  };
}