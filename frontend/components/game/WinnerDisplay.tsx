'use client';

import React, { memo, useMemo } from 'react';
import { Game } from '@/types/game';
import { calculatePrizePerWinner, formatAddress, analyzeGame } from '@/lib/utils/gameAnalysis';
import { PlayerProgress } from './PlayerProgress';

interface WinnerDisplayProps {
  game: Game;
}

const WinnerDisplay = memo(function WinnerDisplay({ game }: WinnerDisplayProps) {
  const prizePerWinner = useMemo(() => calculatePrizePerWinner(game), [game]);
  const gameAnalysis = useMemo(() => analyzeGame(game), [game]);
  
  if (game.winners.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Winners</h2>
          <p className="text-gray-600">
            This game ended with no surviving players.
          </p>
        </div>
      </div>
    );
  }
  
  const totalPrizePool = parseFloat(game.entryFee) * game.totalPlayers * 0.97;
  
  return (
    <div className="space-y-6">
      {/* Main Winner Celebration */}
      <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 rounded-lg shadow-lg p-8 text-white">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold mb-2">
            {game.winners.length === 1 ? 'We Have a Winner!' : 'We Have Winners!'}
          </h2>
          <p className="text-yellow-100 mb-6">
            Congratulations to the {game.winners.length} survivor{game.winners.length !== 1 ? 's' : ''} who made it through {gameAnalysis.completedRounds.length} round{gameAnalysis.completedRounds.length !== 1 ? 's' : ''} of minority rule!
          </p>
        </div>
        
        {/* Prize Information */}
        <div className="bg-white/20 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{totalPrizePool.toFixed(2)} FLOW</div>
              <div className="text-yellow-100 text-sm">Total Prize Pool</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{game.winners.length}</div>
              <div className="text-yellow-100 text-sm">Winner{game.winners.length !== 1 ? 's' : ''}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{prizePerWinner.toFixed(2)} FLOW</div>
              <div className="text-yellow-100 text-sm">Per Winner</div>
            </div>
          </div>
        </div>
        
        {/* Winners List */}
        <div className="space-y-3">
          {game.winners.map((winner, index) => (
            <div
              key={winner}
              className="bg-white/20 rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-yellow-300 text-yellow-800 rounded-full flex items-center justify-center font-bold">
                  #{index + 1}
                </div>
                <div>
                  <div className="font-mono text-lg font-semibold">
                    {formatAddress(winner)}
                  </div>
                  <div className="text-yellow-100 text-sm">
                    Winner • {prizePerWinner.toFixed(2)} FLOW
                  </div>
                </div>
              </div>
              <div className="text-2xl">🏆</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Game Statistics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4">Game Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{game.totalPlayers}</div>
            <div className="text-sm text-gray-600">Started</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{gameAnalysis.eliminatedPlayers.length}</div>
            <div className="text-sm text-red-600">Eliminated</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{game.winners.length}</div>
            <div className="text-sm text-green-600">Winners</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{gameAnalysis.completedRounds.length}</div>
            <div className="text-sm text-blue-600">Rounds</div>
          </div>
        </div>
      </div>
      
      {/* Winner Details */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Winner Details</h3>
        {game.winners.map(winner => (
          <PlayerProgress
            key={winner}
            game={game}
            playerAddress={winner}
            showFullHistory={true}
          />
        ))}
      </div>
    </div>
  );
});

export { WinnerDisplay };