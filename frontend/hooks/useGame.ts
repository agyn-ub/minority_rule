'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { GET_GAME_INFO } from '@/lib/flow/cadence/scripts/GetGameInfo';
import { TESTNET_CONTRACT_ADDRESS } from '@/lib/flow/config';
import { Game, GameState } from '@/types/game';

// Deep equality check for game data
const isGameDataEqual = (a: Game | null, b: Game | null): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;

  return (
    a.gameId === b.gameId &&
    a.questionText === b.questionText &&
    a.entryFee === b.entryFee &&
    a.creator === b.creator &&
    a.roundDuration === b.roundDuration &&
    a.state === b.state &&
    a.currentRound === b.currentRound &&
    a.roundDeadline === b.roundDeadline &&
    a.totalPlayers === b.totalPlayers &&
    JSON.stringify(a.players) === JSON.stringify(b.players) &&
    JSON.stringify(a.playerVoteHistory) === JSON.stringify(b.playerVoteHistory) &&
    a.currentRoundYesVotes === b.currentRoundYesVotes &&
    a.currentRoundNoVotes === b.currentRoundNoVotes &&
    a.currentRoundTotalVotes === b.currentRoundTotalVotes &&
    JSON.stringify(a.remainingPlayers) === JSON.stringify(b.remainingPlayers) &&
    JSON.stringify(a.winners) === JSON.stringify(b.winners) &&
    a.prizeAmount === b.prizeAmount &&
    JSON.stringify(a.roundResults) === JSON.stringify(b.roundResults)
  );
};

// Get polling interval based on game state
const getPollingInterval = (gameState: GameState | undefined): number => {
  if (!gameState) return 0; // No polling if no game state

  switch (gameState) {
    case GameState.VotingOpen:
      return 3000; // 3 seconds for active voting
    case GameState.ProcessingRound:
      return 2000; // 2 seconds when processing (expecting quick state change)
    case GameState.Completed:
      return 0; // No polling for completed games
    default:
      return 10000; // 10 seconds for unknown states
  }
};

export function useGame(gameId: string) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchRef = useRef<number>(0);

  const parseGameData = useCallback((gameData: any): Game => {
    const currentRoundYesVotes = Number(gameData.currentYesVotes || gameData.currentRoundYesVotes || 0);
    const currentRoundNoVotes = Number(gameData.currentNoVotes || gameData.currentRoundNoVotes || 0);
    const currentRoundTotalVotes = currentRoundYesVotes + currentRoundNoVotes;

    return {
      gameId: gameData.gameId,
      questionText: gameData.questionText,
      entryFee: gameData.entryFee,
      creator: gameData.creator,
      state: Number(gameData.state),
      currentRound: Number(gameData.currentRound),
      totalPlayers: Number(gameData.totalPlayers),
      players: gameData.players || [],
      playerVoteHistory: gameData.playerVoteHistory || {},
      currentRoundYesVotes,
      currentRoundNoVotes,
      currentRoundTotalVotes,
      remainingPlayers: gameData.remainingPlayers || [],
      winners: gameData.winners || [],
      prizeAmount: gameData.prizeAmount || gameData.prizePool,
      roundResults: gameData.roundResults || {},

      // Enhanced fields from the new script
      stateName: gameData.stateName,
      commitCount: Number(gameData.commitCount || 0),
      revealCount: Number(gameData.revealCount || 0),
      prizePool: gameData.prizePool,
      prizesDistributed: Boolean(gameData.prizesDistributed),
      commitDeadline: gameData.commitDeadline,
      commitDeadlineFormatted: gameData.commitDeadlineFormatted,
      revealDeadline: gameData.revealDeadline,
      revealDeadlineFormatted: gameData.revealDeadlineFormatted,
      timeRemainingInPhase: gameData.timeRemainingInPhase
    };
  }, []);

  const fetchGame = useCallback(async (force = false) => {
    if (!gameId) return;

    // Prevent too frequent requests (minimum 1 second between fetches)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 1000) {
      return;
    }
    lastFetchRef.current = now;

    try {
      if (!game) setLoading(true); // Only show loading on initial fetch

      const result = await fcl.query({
        cadence: GET_GAME_INFO,
        args: (arg: any, t: any) => [
          arg(gameId, t.UInt64)
        ]
      });

      if (result) {
        // Debug logging for Game 19
        if (gameId === '19') {
          console.log('🔍 Game 19 Raw Data:', {
            gameId: result.gameId,
            currentYesVotes: result.currentYesVotes,
            currentNoVotes: result.currentNoVotes,
            currentRoundYesVotes: result.currentRoundYesVotes,
            currentRoundNoVotes: result.currentRoundNoVotes,
            playerVoteHistory: result.playerVoteHistory,
            players: result.players,
            remainingPlayers: result.remainingPlayers
          });
        }

        const newGame = parseGameData(result);

        // Debug parsed data for Game 19
        if (gameId === '19') {
          console.log('🔍 Game 19 Parsed Data:', {
            currentRoundYesVotes: newGame.currentRoundYesVotes,
            currentRoundNoVotes: newGame.currentRoundNoVotes,
            currentRoundTotalVotes: newGame.currentRoundTotalVotes,
            playerVoteHistory: newGame.playerVoteHistory,
            players: newGame.players,
            remainingPlayers: newGame.remainingPlayers
          });
        }

        // Only update state if data actually changed
        setGame(prevGame => {
          if (isGameDataEqual(prevGame, newGame)) {
            return prevGame; // Return same reference to prevent re-renders
          }
          return newGame;
        });
      }
    } catch (err) {
      console.error('Error fetching game:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [gameId, game, parseGameData]);

  // Setup intelligent polling based on game state
  const setupPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const pollingInterval = getPollingInterval(game?.state);

    if (pollingInterval > 0) {
      intervalRef.current = setInterval(() => {
        fetchGame();
      }, pollingInterval);
    }
  }, [game?.state, fetchGame]);

  useEffect(() => {
    fetchGame(true); // Force initial fetch
  }, [gameId]);

  useEffect(() => {
    setupPolling();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setupPolling]);

  return { game, loading, error, refetch: () => fetchGame(true) };
}