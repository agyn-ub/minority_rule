'use client';

import React, { memo, useMemo } from 'react';
import { Game, VoteRecord } from '@/types/game';
import { getPlayerVotingHistory, getPlayerEliminationRound, formatVote, formatAddress } from '@/lib/utils/gameAnalysis';

interface PlayerProgressProps {
  game: Game;
  playerAddress: string;
  showFullHistory?: boolean;
}

const PlayerProgress = memo(function PlayerProgress({ 
  game, 
  playerAddress, 
  showFullHistory = false 
}: PlayerProgressProps) {
  const playerVotes = useMemo(() => 
    getPlayerVotingHistory(game, playerAddress), [game, playerAddress]
  );
  
  const eliminationRound = useMemo(() => 
    getPlayerEliminationRound(game, playerAddress), [game, playerAddress]
  );
  
  const isEliminated = eliminationRound !== null;
  const isWinner = game.winners.includes(playerAddress);
  const isStillActive = game.remainingPlayers.includes(playerAddress) && !isWinner;
  
  const getStatusColor = () => {
    if (isWinner) return 'text-green-600 bg-green-50 border-green-200';
    if (isEliminated) return 'text-red-600 bg-red-50 border-red-200';
    if (isStillActive) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };
  
  const getStatusText = () => {
    if (isWinner) return '🏆 Winner';
    if (isEliminated) return `❌ Eliminated Round ${eliminationRound}`;
    if (isStillActive) return '🔥 Still Active';
    return '❓ Unknown Status';
  };
  
  if (!showFullHistory && playerVotes.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-gray-300">
      {/* Player Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 font-mono text-sm">
            {formatAddress(playerAddress)}
          </h3>
          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getStatusColor()}`}>
            {getStatusText()}
          </div>
        </div>
        
        {playerVotes.length > 0 && (
          <div className="text-right">
            <div className="text-sm text-gray-600">
              {playerVotes.length} vote{playerVotes.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}
      </div>
      
      {/* Voting History */}
      {playerVotes.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Voting History</h4>
          <div className="space-y-1">
            {playerVotes.map((vote, index) => {
              const roundResult = game.roundResults[vote.round];
              const wasWinningVote = roundResult !== undefined && vote.vote === roundResult;
              
              return (
                <div
                  key={`${vote.round}-${index}`}
                  className={`flex items-center justify-between py-2 px-3 rounded text-sm ${
                    wasWinningVote 
                      ? 'bg-green-50 border border-green-200' 
                      : roundResult !== undefined 
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-gray-600 font-medium">
                      Round {vote.round}
                    </span>
                    <span className={`font-semibold ${
                      vote.vote ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {formatVote(vote.vote)}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {roundResult !== undefined && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        wasWinningVote 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {wasWinningVote ? 'Advanced' : 'Eliminated'}
                      </span>
                    )}
                    
                    <span className="text-xs text-gray-500">
                      {new Date(vote.timestamp * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* No voting history */}
      {playerVotes.length === 0 && showFullHistory && (
        <div className="text-center py-4">
          <p className="text-gray-500 text-sm">No votes cast yet</p>
        </div>
      )}
    </div>
  );
});

export { PlayerProgress };