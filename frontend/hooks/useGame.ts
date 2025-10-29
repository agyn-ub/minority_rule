'use client';

import { useState, useEffect } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { GET_GAME_INFO } from '@/lib/flow/cadence/scripts/GetGameInfo';
import { TESTNET_CONTRACT_ADDRESS } from '@/lib/flow/config';
import { Game } from '@/types/game';

export function useGame(gameId: string) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGame = async () => {
    if (!gameId) return;
    
    try {
      setLoading(true);
      const result = await fcl.query({
        cadence: GET_GAME_INFO,
        args: (arg: any, t: any) => [
          arg(gameId, t.UInt64),
          arg(TESTNET_CONTRACT_ADDRESS, t.Address)
        ]
      });

      if (result) {
        const gameData = result as any;
        setGame({
          gameId: gameData.gameId,
          questionText: gameData.questionText,
          entryFee: gameData.entryFee,
          creator: gameData.creator,
          roundDuration: gameData.roundDuration,
          state: Number(gameData.state),
          currentRound: Number(gameData.currentRound),
          roundDeadline: gameData.roundDeadline,
          totalPlayers: Number(gameData.totalPlayers),
          players: gameData.players || [],
          playerVoteHistory: gameData.playerVoteHistory || {},
          currentRoundYesVotes: Number(gameData.currentRoundYesVotes || 0),
          currentRoundNoVotes: Number(gameData.currentRoundNoVotes || 0),
          currentRoundTotalVotes: Number(gameData.currentRoundTotalVotes || 0),
          remainingPlayers: gameData.remainingPlayers || [],
          winners: gameData.winners || [],
          prizeAmount: gameData.prizeAmount
        });
      }
    } catch (err) {
      console.error('Error fetching game:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGame();
  }, [gameId]);

  // Auto-refetch every 5 seconds if game is active
  useEffect(() => {
    if (game && game.state !== 2) { // Not completed
      const interval = setInterval(() => {
        fetchGame();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [game]);

  return { game, loading, error, refetch: fetchGame };
}