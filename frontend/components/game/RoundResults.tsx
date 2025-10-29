'use client';

import React, { memo } from 'react';
import { RoundResult } from '@/types/game';
import { formatVote, formatAddress } from '@/lib/utils/gameAnalysis';

interface RoundResultsProps {
  roundResult: RoundResult;
}

const RoundResults = memo(function RoundResults({ roundResult }: RoundResultsProps) {
  const { round, yesVotes, noVotes, totalVotes, winningVote, winners, losers } = roundResult;
  
  const minorityCount = winningVote ? yesVotes : noVotes;
  const majorityCount = winningVote ? noVotes : yesVotes;
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Round {round} Results
        </h3>
        <div className="text-sm text-gray-600">
          {totalVotes} total votes
        </div>
      </div>
      
      {/* Vote Breakdown */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className={`p-3 rounded-lg ${winningVote ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${winningVote ? 'text-green-700' : 'text-gray-600'}`}>
                {yesVotes}
              </div>
              <div className={`text-sm ${winningVote ? 'text-green-600' : 'text-gray-500'}`}>
                YES votes
                {winningVote && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">MINORITY ✓</span>}
              </div>
            </div>
          </div>
          
          <div className={`p-3 rounded-lg ${!winningVote ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
            <div className="text-center">
              <div className={`text-2xl font-bold ${!winningVote ? 'text-green-700' : 'text-gray-600'}`}>
                {noVotes}
              </div>
              <div className={`text-sm ${!winningVote ? 'text-green-600' : 'text-gray-500'}`}>
                NO votes
                {!winningVote && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">MINORITY ✓</span>}
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-center text-sm text-gray-600">
          <span className="font-semibold text-green-600">{formatVote(winningVote)}</span> was the minority vote
          <span className="text-gray-400 mx-2">•</span>
          <span className="font-semibold">{minorityCount}</span> winners, <span className="font-semibold">{majorityCount}</span> eliminated
        </div>
      </div>
      
      {/* Winners and Losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Winners */}
        <div>
          <h4 className="flex items-center text-sm font-semibold text-green-700 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Winners ({winners.length})
          </h4>
          <div className="space-y-2">
            {winners.length > 0 ? (
              winners.map((winner, index) => (
                <div
                  key={winner}
                  className="flex items-center justify-between py-2 px-3 bg-green-50 rounded text-sm"
                >
                  <span className="text-green-600 font-medium">#{index + 1}</span>
                  <span className="font-mono text-xs text-green-800">
                    {formatAddress(winner)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm italic">No winners this round</p>
            )}
          </div>
        </div>
        
        {/* Eliminated Players */}
        <div>
          <h4 className="flex items-center text-sm font-semibold text-red-700 mb-3">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            Eliminated ({losers.length})
          </h4>
          <div className="space-y-2">
            {losers.length > 0 ? (
              losers.map((loser, index) => (
                <div
                  key={loser}
                  className="flex items-center justify-between py-2 px-3 bg-red-50 rounded text-sm"
                >
                  <span className="text-red-600 font-medium">#{index + 1}</span>
                  <span className="font-mono text-xs text-red-800">
                    {formatAddress(loser)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm italic">No eliminations this round</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export { RoundResults };