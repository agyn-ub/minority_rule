'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { GET_GAMES_PAGE } from '@/lib/flow/cadence/scripts/GetGamesPage';
import { Game, GameState } from '@/types/game';
import { useFlowUser } from './useFlowUser';

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

interface PaginationInfo {
  startId?: number;
  limit: number;
  descending: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  nextStartId?: number;
  previousStartId?: number;
  returnedCount: number;
  totalGames: number;
}

interface UseAvailableGamesOptions {
  limit?: number;
  startId?: number;
  descending?: boolean;
}

export function useAvailableGames(options: UseAvailableGamesOptions = {}) {
  const { limit = 5, startId = 1, descending = false } = options;
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    startId,
    limit,
    descending,
    hasNext: false,
    hasPrevious: false,
    returnedCount: 0,
    totalGames: 0
  });
  const { user } = useFlowUser();
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
      roundDuration: game.roundDuration || 3600,
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
      roundResults: game.roundResults || {},
      
      // Enhanced fields
      stateName: game.stateName,
      commitCount: Number(game.commitCount || 0),
      revealCount: Number(game.revealCount || 0),
      prizePool: game.prizePool,
      prizesDistributed: Boolean(game.prizesDistributed),
      commitDeadline: game.commitDeadline,
      commitDeadlineFormatted: game.commitDeadlineFormatted,
      revealDeadline: game.revealDeadline,
      revealDeadlineFormatted: game.revealDeadlineFormatted,
      timeRemainingInPhase: game.timeRemainingInPhase
    };
  }, []);

  const fetchAvailableGames = useCallback(async (force = false) => {
    // Prevent too frequent requests (minimum 3 seconds between fetches)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 3000) {
      return;
    }
    lastFetchRef.current = now;

    try {
      if (games.length === 0) setLoading(true);
      
      // Ensure FCL is configured
      const apiConfig = fcl.config().get('accessNode.api');
      if (!apiConfig) {
        throw new Error('FCL not configured. Please wait for configuration to load.');
      }
      
      const result = await fcl.query({
        cadence: GET_GAMES_PAGE,
        args: (arg: any, t: any) => [
          arg(startId.toString(), t.UInt64),
          arg(limit.toString(), t.UInt64)
        ]
      });

      if (result && result.games && result.pagination) {
        const gamesList = result.games as any[];
        const paginationData = result.pagination;
        
        const formattedGames = gamesList.map(parseGameData);
        
        // Filter out games where user is already a player (if user is connected)
        const availableGames = user 
          ? formattedGames.filter(g => !g.players.includes(user.addr))
          : formattedGames;
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('🎮 Available games debug:', {
            rawGamesCount: gamesList.length,
            formattedGamesCount: formattedGames.length,
            availableGamesCount: availableGames.length,
            userAddress: user?.addr,
            sampleGame: formattedGames[0],
            pagination: paginationData
          });
        }
        
        // Update pagination info from contract response
        setPagination({
          startId: Number(paginationData.startId),
          limit: Number(paginationData.limit),
          descending: Boolean(paginationData.descending),
          hasNext: Boolean(paginationData.hasNext),
          hasPrevious: Boolean(paginationData.hasPrevious),
          nextStartId: paginationData.nextStartId ? Number(paginationData.nextStartId) : undefined,
          previousStartId: paginationData.previousStartId ? Number(paginationData.previousStartId) : undefined,
          returnedCount: Number(paginationData.returnedCount),
          totalGames: Number(paginationData.totalGames)
        });
        
        // Only update state if data actually changed
        setGames(prevGames => {
          if (areGamesEqual(prevGames, availableGames)) {
            return prevGames;
          }
          return availableGames;
        });
      } else {
        setGames([]);
        // Set default pagination when no results
        setPagination(prev => ({
          ...prev,
          startId,
          returnedCount: 0,
          hasNext: false,
          hasPrevious: false,
          nextStartId: undefined,
          previousStartId: undefined
        }));
      }
    } catch (err) {
      console.error('Error fetching available games:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [startId, limit, descending, games.length, parseGameData, user]);

  // Setup polling for available games (less frequent since they change less often)
  const setupPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Poll every 15 seconds for available games
    intervalRef.current = setInterval(() => {
      fetchAvailableGames();
    }, 15000);
  }, [fetchAvailableGames]);

  useEffect(() => {
    // Small delay to ensure FCL configuration is loaded
    const timer = setTimeout(() => {
      fetchAvailableGames(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [startId, limit, descending]);

  useEffect(() => {
    setupPolling();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setupPolling]);

  return { 
    games, 
    loading, 
    error, 
    pagination,
    refetch: () => fetchAvailableGames(true)
  };
}