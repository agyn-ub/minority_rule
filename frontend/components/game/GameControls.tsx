'use client';

import React, { useState, memo } from 'react';
import { Game, GameState } from '@/types/game';
import { ProcessRoundButton } from './ProcessRoundButton';

interface GameControlsProps {
  game: Game;
  onGameUpdate?: () => void;
}

const GameControls = memo(function GameControls({ game, onGameUpdate }: GameControlsProps) {
  const [showControls, setShowControls] = useState(false);
  
  const canProcessRound = game.state === GameState.VotingOpen && 
    new Date() > new Date(parseFloat(game.roundDeadline) * 1000);
  
  const hasVotingActivity = game.currentRoundTotalVotes > 0;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Game Controls</h3>
        <button
          onClick={() => setShowControls(!showControls)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showControls ? 'Hide' : 'Show'} Controls
        </button>
      </div>
      
      {showControls && (
        <div className="space-y-4">
          {/* Game Status Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Game Status</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">State:</span>
                <span className="ml-2 font-semibold">
                  {game.state === GameState.VotingOpen && 'Voting Open'}
                  {game.state === GameState.ProcessingRound && 'Processing Round'}
                  {game.state === GameState.Completed && 'Completed'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Round:</span>
                <span className="ml-2 font-semibold">{game.currentRound}</span>
              </div>
              <div>
                <span className="text-gray-600">Deadline:</span>
                <span className="ml-2 font-semibold">
                  {new Date(parseFloat(game.roundDeadline) * 1000).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Votes:</span>
                <span className="ml-2 font-semibold">
                  {game.currentRoundTotalVotes}/{game.remainingPlayers.length}
                </span>
              </div>
            </div>
          </div>
          
          {/* Round Processing */}
          {canProcessRound && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-900 mb-2">⏰ Round Processing Available</h4>
              <p className="text-orange-800 text-sm mb-4">
                The round deadline has passed. You can manually process the round.
              </p>
              <ProcessRoundButton 
                gameId={game.gameId}
                currentRound={game.currentRound}
                onSuccess={onGameUpdate}
              />
            </div>
          )}
          
          {/* Voting Progress */}
          {game.state === GameState.VotingOpen && !canProcessRound && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">🗳️ Voting in Progress</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Votes Cast:</span>
                  <span className="font-semibold">{game.currentRoundTotalVotes}/{game.remainingPlayers.length}</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, (game.currentRoundTotalVotes / Math.max(1, game.remainingPlayers.length)) * 100)}%` 
                    }}
                  ></div>
                </div>
                <p className="text-blue-800 text-xs">
                  Waiting for {game.remainingPlayers.length - game.currentRoundTotalVotes} more vote{game.remainingPlayers.length - game.currentRoundTotalVotes !== 1 ? 's' : ''} or round deadline
                </p>
              </div>
            </div>
          )}
          
          {/* Processing State */}
          {game.state === GameState.ProcessingRound && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">⚙️ Round Processing</h4>
              <p className="text-yellow-800 text-sm">
                The round is currently being processed. Results will appear shortly.
              </p>
            </div>
          )}
          
          {/* Game Completed */}
          {game.state === GameState.Completed && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">🏁 Game Completed</h4>
              <p className="text-green-800 text-sm">
                This game has ended. 
                {game.winners.length > 0 
                  ? ` ${game.winners.length} winner${game.winners.length !== 1 ? 's' : ''} have been declared.`
                  : ' No winners were declared.'
                }
              </p>
            </div>
          )}
          
          {/* Debug Information */}
          <details className="p-4 bg-gray-50 rounded-lg">
            <summary className="font-semibold text-gray-900 cursor-pointer">🔧 Debug Information</summary>
            <div className="mt-4 space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Game ID:</span>
                <span className="ml-2 font-mono">{game.gameId}</span>
              </div>
              <div>
                <span className="text-gray-600">Round Deadline (timestamp):</span>
                <span className="ml-2 font-mono">{game.roundDeadline}</span>
              </div>
              <div>
                <span className="text-gray-600">Current Time (timestamp):</span>
                <span className="ml-2 font-mono">{Math.floor(Date.now() / 1000)}</span>
              </div>
              <div>
                <span className="text-gray-600">Round Results:</span>
                <span className="ml-2 font-mono">{JSON.stringify(game.roundResults)}</span>
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
});

export { GameControls };