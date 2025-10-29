'use client';

import Link from 'next/link';
import { Game, GameState } from '@/types/game';
import { formatDistanceToNow } from 'date-fns';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const getStateLabel = () => {
    switch (game.state) {
      case GameState.VotingOpen:
        return <span className="text-green-600">Voting Open</span>;
      case GameState.ProcessingRound:
        return <span className="text-yellow-600">Processing</span>;
      case GameState.Completed:
        return <span className="text-gray-600">Completed</span>;
      default:
        return <span className="text-gray-500">Unknown</span>;
    }
  };

  const deadline = new Date(parseFloat(game.roundDeadline) * 1000);
  const isExpired = deadline < new Date();

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
            {getStateLabel()}
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
            <span>{game.remainingPlayers.length} / {game.totalPlayers}</span>
          </div>

          {game.state === GameState.VotingOpen && (
            <div className="flex justify-between">
              <span className="text-gray-600">Deadline:</span>
              <span className={isExpired ? 'text-red-600' : ''}>
                {isExpired ? 'Expired' : formatDistanceToNow(deadline, { addSuffix: true })}
              </span>
            </div>
          )}

          {game.state === GameState.Completed && game.winners.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <div className="text-gray-600">Winners: {game.winners.length}</div>
              <div className="text-green-600 font-semibold">
                Prize: {game.prizeAmount || '0'} FLOW
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}