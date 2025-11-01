'use client';

import React, { memo, useMemo } from 'react';
import Link from 'next/link';
import { Game, GameState } from '@/types/game';
import { formatDistanceToNow } from 'date-fns';

interface GameCardProps {
  game: Game;
}

const GameCard = memo(function GameCard({ game }: GameCardProps) {
  const getStateLabel = useMemo(() => {
    // Use stateName if available for better display
    if (game.stateName) {
      switch (game.stateName) {
        case 'setCommitDeadline':
          return <span className="text-orange-600">Setup: Commit Deadline</span>;
        case 'setRevealDeadline':
          return <span className="text-orange-600">Setup: Reveal Deadline</span>;
        case 'commitPhase':
          return <span className="text-green-600">Commit Phase</span>;
        case 'revealPhase':
          return <span className="text-blue-600">Reveal Phase</span>;
        case 'processingRound':
          return <span className="text-yellow-600">Processing</span>;
        case 'completed':
          return <span className="text-gray-600">Completed</span>;
        default:
          return <span className="text-gray-500">{game.stateName}</span>;
      }
    }
    
    // Fallback to numeric state
    switch (game.state) {
      case GameState.SetCommitDeadline:
        return <span className="text-orange-600">Setup: Commit Deadline</span>;
      case GameState.SetRevealDeadline:
        return <span className="text-orange-600">Setup: Reveal Deadline</span>;
      case GameState.CommitPhase:
        return <span className="text-green-600">Commit Phase</span>;
      case GameState.RevealPhase:
        return <span className="text-blue-600">Reveal Phase</span>;
      case GameState.ProcessingRound:
        return <span className="text-yellow-600">Processing</span>;
      case GameState.Completed:
        return <span className="text-gray-600">Completed</span>;
      default:
        return <span className="text-gray-500">Unknown</span>;
    }
  }, [game.state, game.stateName]);

  const { deadline, isExpired, deadlineText } = useMemo(() => {
    // Use formatted deadlines from enhanced script if available
    if (game.stateName === 'commitPhase' && game.commitDeadlineFormatted) {
      return {
        deadline: new Date(),
        isExpired: false,
        deadlineText: `Commit: ${game.commitDeadlineFormatted}`
      };
    }
    
    if (game.stateName === 'revealPhase' && game.revealDeadlineFormatted) {
      return {
        deadline: new Date(),
        isExpired: false,
        deadlineText: `Reveal: ${game.revealDeadlineFormatted}`
      };
    }
    
    // Show time remaining if available
    if (game.timeRemainingInPhase) {
      return {
        deadline: new Date(),
        isExpired: false,
        deadlineText: game.timeRemainingInPhase
      };
    }
    
    // Fallback to old deadline logic
    if (!game.roundDeadline || game.roundDeadline === '0.0') {
      return { 
        deadline: new Date(), 
        isExpired: false, 
        deadlineText: 'No deadline set' 
      };
    }
    
    const deadline = new Date(parseFloat(game.roundDeadline) * 1000);
    const isExpired = deadline < new Date();
    const deadlineText = isExpired ? 'Expired' : formatDistanceToNow(deadline, { addSuffix: true });
    
    return { deadline, isExpired, deadlineText };
  }, [game.roundDeadline, game.commitDeadlineFormatted, game.revealDeadlineFormatted, game.timeRemainingInPhase, game.stateName]);

  const playerCountText = useMemo(() => {
    return `${game.remainingPlayers.length} / ${game.totalPlayers}`;
  }, [game.remainingPlayers.length, game.totalPlayers]);

  const prizeAmount = useMemo(() => {
    return game.prizePool || game.prizeAmount || '0';
  }, [game.prizePool, game.prizeAmount]);

  return (
    <Link href={`/game/${game.gameId}`}>
      <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="mb-2">
          <h3 className="font-semibold text-lg truncate">{game.questionText}</h3>
          <div className="text-sm text-gray-500">Game #{game.gameId}</div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            {getStateLabel}
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-600">Round:</span>
            <span>{game.currentRound}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Entry Fee:</span>
            <span>{game.entryFee} FLOW</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Players:</span>
            <span>{playerCountText}</span>
          </div>

          {game.state === GameState.VotingOpen && (
            <div className="flex justify-between">
              <span className="text-gray-600">Deadline:</span>
              <span className={isExpired ? 'text-red-600' : ''}>
                {deadlineText}
              </span>
            </div>
          )}

          {game.state === GameState.Completed && game.winners.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <div className="text-gray-600">Winners: {game.winners.length}</div>
              <div className="text-green-600 font-semibold">
                Prize: {prizeAmount} FLOW
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
});

export { GameCard };