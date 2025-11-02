'use client';

import { useState, useEffect, useCallback } from 'react';
import * as fcl from '@onflow/fcl';
import { GET_GAMES_BY_CREATOR } from '@/lib/flow/cadence/scripts/GetGamesByCreator';

interface CreatorGames {
  creator: string;
  totalCreatedGames: number;
  activeGames: number;
  completedGames: number;
  waitingForScheduling: number;
  allGames: any[];
  activeGamesList: any[];
  completedGamesList: any[];
  waitingForSchedulingList: any[];
  limit?: number;
  returnedCount: number;
}

export function useGamesByCreator(creatorAddress?: string, limit: number = 50) {
  const [creatorGames, setCreatorGames] = useState<CreatorGames | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCreatorGames = useCallback(async () => {
    if (!creatorAddress) {
      setCreatorGames(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fcl.query({
        cadence: GET_GAMES_BY_CREATOR,
        args: (arg: any, t: any) => [
          arg(creatorAddress, t.Address),
          arg(limit.toString(), t.UInt64)
        ]
      });

      if (result) {
        setCreatorGames(result as CreatorGames);
      }
    } catch (err) {
      console.error('Error fetching creator games:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [creatorAddress, limit]);

  useEffect(() => {
    fetchCreatorGames();
  }, [fetchCreatorGames]);

  return { 
    creatorGames, 
    loading, 
    error, 
    refetch: fetchCreatorGames 
  };
}