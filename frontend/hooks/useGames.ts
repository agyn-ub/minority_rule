'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { GET_ALL_GAMES } from '@/lib/flow/cadence/scripts/GetAllGames';
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

export function useGames(maxGames: number = 100) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  const parseGameData = useCallback((game: any): Game => ({
    gameId: game.gameId,
    questionText: game.questionText,
    entryFee: game.entryFee,
    creator: game.creator,
    roundDuration: game.roundDuration,
    state: Number(game.state),
    currentRound: Number(game.currentRound),
    roundDeadline: game.roundDeadline,
    totalPlayers: Number(game.totalPlayers),
    players: game.players || [],
    playerVoteHistory: game.playerVoteHistory || {},
    currentRoundYesVotes: Number(game.currentRoundYesVotes || 0),
    currentRoundNoVotes: Number(game.currentRoundNoVotes || 0),
    currentRoundTotalVotes: Number(game.currentRoundTotalVotes || 0),
    remainingPlayers: game.remainingPlayers || [],
    winners: game.winners || [],
    prizeAmount: game.prizeAmount
  }), []);

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
        cadence: GET_ALL_GAMES,
        args: (arg: any, t: any) => [
          arg(TESTNET_CONTRACT_ADDRESS, t.Address),
          arg(maxGames.toString(), t.UInt64)
        ]
      });

      if (result) {
        const formattedGames = (result as any[]).map(parseGameData);
        
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
  }, [maxGames, games.length, parseGameData]);

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
  }, [maxGames]);

  useEffect(() => {
    setupPolling();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setupPolling]);

  return { games, loading, error, refetch: () => fetchGames(true) };
}