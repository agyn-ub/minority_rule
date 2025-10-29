'use client';

import React, { memo, useMemo } from 'react';
import { Game } from '@/types/game';
import { analyzeGame } from '@/lib/utils/gameAnalysis';
import { RoundResults } from './RoundResults';

interface GameHistoryProps {
  game: Game;
}

const GameHistory = memo(function GameHistory({ game }: GameHistoryProps) {
  const gameAnalysis = useMemo(() => analyzeGame(game), [game]);
  
  if (gameAnalysis.completedRounds.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Game History</h2>
        <p className="text-gray-500 text-center py-8">
          No rounds completed yet. Game history will appear here as rounds are processed.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Game History</h2>
        
        {/* Game Progress Summary */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{gameAnalysis.completedRounds.length}</div>
              <div className="text-sm text-gray-600">Rounds Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{gameAnalysis.survivingPlayers.length}</div>
              <div className="text-sm text-gray-600">Players Remaining</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{gameAnalysis.eliminatedPlayers.length}</div>
              <div className="text-sm text-gray-600">Players Eliminated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{game.totalPlayers}</div>
              <div className="text-sm text-gray-600">Total Players</div>
            </div>
          </div>
        </div>
        
        {/* Elimination Timeline */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Elimination Timeline</h3>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            <div className="flex-shrink-0 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
              Start: {game.totalPlayers} players
            </div>
            {gameAnalysis.completedRounds.map((round, index) => (
              <React.Fragment key={round.round}>
                <div className="w-6 h-0.5 bg-gray-300 flex-shrink-0"></div>
                <div className="flex-shrink-0 px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm">
                  Round {round.round}: -{round.losers.length}
                </div>
              </React.Fragment>
            ))}
            {gameAnalysis.survivingPlayers.length > 0 && (
              <>
                <div className="w-6 h-0.5 bg-gray-300 flex-shrink-0"></div>
                <div className="flex-shrink-0 px-3 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                  Remaining: {gameAnalysis.survivingPlayers.length} players
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Round Results */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Round by Round Results</h2>
        {gameAnalysis.completedRounds
          .sort((a, b) => b.round - a.round) // Show most recent first
          .map(roundResult => (
            <RoundResults key={roundResult.round} roundResult={roundResult} />
          ))}
      </div>
    </div>
  );
});

export { GameHistory };