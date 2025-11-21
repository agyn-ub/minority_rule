'use client';

import { useState, useEffect, useCallback } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { GET_USER_GAME_HISTORY } from '@/lib/flow/cadence/scripts/GetUserGameHistory';
import { GET_USER_GAME_HISTORY_DETAILED } from '@/lib/flow/cadence/scripts/GetUserGameHistoryDetailed';
import { Game } from '@/types/game';

interface UserGameHistory {
  userAddress: string;
  totalGamesParticipated: number;
  gameIds: number[];
  gameDetails: Game[];
}

interface UseUserGameHistoryOptions {
  userAddress?: string;
  detailed?: boolean;
}

export function useUserGameHistory(options: UseUserGameHistoryOptions = {}) {
  const { userAddress, detailed = false } = options;
  const [gameIds, setGameIds] = useState<number[]>([]);
  const [gameHistory, setGameHistory] = useState<UserGameHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

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
      
      // User-specific fields (if available)
      userVoteHistory: game.userVoteHistory || [],
      userStillInGame: Boolean(game.userStillInGame),
      userIsWinner: Boolean(game.userIsWinner),
      userTotalVotes: Number(game.userTotalVotes || 0)
    };
  }, []);

  const fetchUserGameHistory = useCallback(async (address: string) => {
    if (!address) {
      setGameIds([]);
      setGameHistory(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure FCL is configured
      const apiConfig = fcl.config().get('accessNode.api');
      if (!apiConfig) {
        throw new Error('FCL not configured. Please wait for configuration to load.');
      }

      if (detailed) {
        // Get detailed game history
        const result = await fcl.query({
          cadence: GET_USER_GAME_HISTORY_DETAILED,
          args: (arg: any, t: any) => [
            arg(address, t.Address)
          ]
        });

        if (result) {
          const gameDetails = (result.gameDetails as any[]).map(parseGameData);
          
          setGameHistory({
            userAddress: result.userAddress,
            totalGamesParticipated: Number(result.totalGamesParticipated),
            gameIds: (result.gameIds as any[]).map(id => Number(id)),
            gameDetails
          });
        }
      } else {
        // Get just game IDs
        const result = await fcl.query({
          cadence: GET_USER_GAME_HISTORY,
          args: (arg: any, t: any) => [
            arg(address, t.Address)
          ]
        });

        if (result && Array.isArray(result)) {
          const ids = result.map(id => Number(id));
          setGameIds(ids);
        }
      }
    } catch (err) {
      console.error('Error fetching user game history:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [detailed, parseGameData]);

  useEffect(() => {
    if (userAddress) {
      fetchUserGameHistory(userAddress);
    } else {
      setGameIds([]);
      setGameHistory(null);
      setLoading(false);
    }
  }, [userAddress, fetchUserGameHistory]);

  const refetch = useCallback(() => {
    if (userAddress) {
      fetchUserGameHistory(userAddress);
    }
  }, [userAddress, fetchUserGameHistory]);

  return {
    gameIds,
    gameHistory,
    loading,
    error,
    refetch
  };
}