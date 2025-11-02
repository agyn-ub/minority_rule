'use client';

import { useState, useEffect, useCallback } from 'react';
import * as fcl from '@onflow/fcl';
import { GET_PLAYER_GAME_HISTORY } from '@/lib/flow/cadence/scripts/GetPlayerGameHistory';

interface PlayerGameHistory {
  player: string;
  totalGamesParticipated: number;
  gamesCreated: number;
  gamesPlayed: number;
  gamesWon: number;
  activeParticipation: number;
  allGames: any[];
  createdGamesList: any[];
  playedGamesList: any[];
  wonGamesList: any[];
  activeGamesList: any[];
  winRate: number;
  limit?: number;
  returnedCount: number;
}

export function usePlayerGameHistory(playerAddress?: string, limit: number = 50) {
  const [history, setHistory] = useState<PlayerGameHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!playerAddress) {
      setHistory(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fcl.query({
        cadence: GET_PLAYER_GAME_HISTORY,
        args: (arg: any, t: any) => [
          arg(playerAddress, t.Address),
          arg(limit.toString(), t.UInt64)
        ]
      });

      if (result) {
        setHistory(result as PlayerGameHistory);
      }
    } catch (err) {
      console.error('Error fetching player game history:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [playerAddress, limit]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { 
    history, 
    loading, 
    error, 
    refetch: fetchHistory 
  };
}