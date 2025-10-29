'use client';

import { useState, useEffect } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { GET_ALL_GAMES } from '@/lib/flow/cadence/scripts/GetAllGames';
import { TESTNET_CONTRACT_ADDRESS } from '@/lib/flow/config';
import { Game } from '@/types/game';

export function useGames(maxGames: number = 100) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGames = async () => {
    try {
      setLoading(true);
      
      // Ensure FCL is configured
      const apiConfig = fcl.config().get('accessNode.api');
      if (!apiConfig) {
        throw new Error('FCL not configured. Please wait for configuration to load.');
      }
      
      console.log('Querying games from:', apiConfig);
      
      const result = await fcl.query({
        cadence: GET_ALL_GAMES,
        args: (arg: any, t: any) => [
          arg(TESTNET_CONTRACT_ADDRESS, t.Address),
          arg(maxGames.toString(), t.UInt64)
        ]
      });

      if (result) {
        const formattedGames = (result as any[]).map(game => ({
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
        }));
        setGames(formattedGames);
      }
    } catch (err) {
      console.error('Error fetching games:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Small delay to ensure FCL configuration is loaded
    const timer = setTimeout(() => {
      fetchGames();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [maxGames]);

  return { games, loading, error, refetch: fetchGames };
}