'use client';

import React, { memo, useMemo } from 'react';
import { Game } from '@/types/game';
import { formatAddress } from '@/lib/utils/gameAnalysis';

interface VotingStatusProps {
  game: Game;
}

const VotingStatus = memo(function VotingStatus({ game }: VotingStatusProps) {
  const votingAnalysis = useMemo(() => {
    const currentRound = game.currentRound;
    const eligiblePlayers = game.remainingPlayers;
    const votedPlayers: string[] = [];
    const notVotedPlayers: string[] = [];
    
    // Debug logging for Game 19
    if (game.gameId === '19') {
      console.log('🔍 VotingStatus Debug for Game 19:', {
        currentRound,
        eligiblePlayers,
        playerVoteHistory: game.playerVoteHistory,
        playerVoteHistoryKeys: Object.keys(game.playerVoteHistory),
        currentRoundYesVotes: game.currentRoundYesVotes,
        currentRoundNoVotes: game.currentRoundNoVotes
      });
    }
    
    // Check each eligible player's voting status for current round
    eligiblePlayers.forEach(player => {
      const playerVotes = game.playerVoteHistory[player] || [];
      const hasVotedThisRound = playerVotes.some(vote => vote.round === currentRound);
      
      // Debug each player for Game 19
      if (game.gameId === '19') {
        console.log(`🔍 Player ${player}:`, {
          playerVotes,
          hasVotedThisRound,
          votesForCurrentRound: playerVotes.filter(vote => vote.round === currentRound)
        });
      }
      
      if (hasVotedThisRound) {
        votedPlayers.push(player);
      } else {
        notVotedPlayers.push(player);
      }
    });
    
    return {
      eligiblePlayers: eligiblePlayers.length,
      votedPlayers,
      notVotedPlayers,
      votingComplete: notVotedPlayers.length === 0,
      votingProgress: eligiblePlayers.length > 0 ? (votedPlayers.length / eligiblePlayers.length) * 100 : 0
    };
  }, [game]);

  const getPlayerVoteDetails = (playerAddress: string) => {
    const playerVotes = game.playerVoteHistory[playerAddress] || [];
    const currentRoundVote = playerVotes.find(vote => vote.round === game.currentRound);
    return currentRoundVote;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Round {game.currentRound} Voting Status</h3>
      
      {/* Progress Overview */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span>Voting Progress</span>
          <span>{votingAnalysis.votedPlayers.length}/{votingAnalysis.eligiblePlayers} players voted</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${votingAnalysis.votingProgress}%` }}
          ></div>
        </div>
        <div className="text-center mt-2">
          <span className={`text-sm font-medium ${
            votingAnalysis.votingComplete ? 'text-green-600' : 'text-orange-600'
          }`}>
            {votingAnalysis.votingComplete ? '✅ All players have voted!' : `⏳ ${votingAnalysis.notVotedPlayers.length} players still need to vote`}
          </span>
        </div>
      </div>

      {/* Vote Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{game.currentRoundYesVotes}</div>
          <div className="text-sm text-green-700">YES Votes</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{game.currentRoundNoVotes}</div>
          <div className="text-sm text-red-700">NO Votes</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{game.currentRoundTotalVotes}</div>
          <div className="text-sm text-blue-700">Total Votes</div>
        </div>
      </div>

      {/* Players Who Have Voted */}
      {votingAnalysis.votedPlayers.length > 0 && (
        <div className="mb-6">
          <h4 className="flex items-center text-sm font-semibold text-green-700 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            Players Who Voted ({votingAnalysis.votedPlayers.length})
          </h4>
          <div className="space-y-2">
            {votingAnalysis.votedPlayers.map(player => {
              const voteDetails = getPlayerVoteDetails(player);
              return (
                <div
                  key={player}
                  className="flex items-center justify-between py-2 px-3 bg-green-50 rounded text-sm"
                >
                  <span className="font-mono text-xs text-green-800">
                    {formatAddress(player)}
                  </span>
                  <div className="flex items-center space-x-2">
                    {voteDetails && (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        voteDetails.vote 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {voteDetails.vote ? 'YES' : 'NO'}
                      </span>
                    )}
                    <span className="text-green-600">✅</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Players Who Haven't Voted */}
      {votingAnalysis.notVotedPlayers.length > 0 && (
        <div>
          <h4 className="flex items-center text-sm font-semibold text-red-700 mb-3">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            Players Who Haven't Voted ({votingAnalysis.notVotedPlayers.length})
          </h4>
          <div className="space-y-2">
            {votingAnalysis.notVotedPlayers.map((player, index) => (
              <div
                key={player}
                className="flex items-center justify-between py-2 px-3 bg-red-50 rounded text-sm"
              >
                <span className="font-mono text-xs text-red-800">
                  {formatAddress(player)}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                    Waiting...
                  </span>
                  <span className="text-red-600">⏳</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All players voted - show completion message */}
      {votingAnalysis.votingComplete && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl mb-2">🎉</div>
              <p className="text-green-800 font-medium">All players have cast their votes!</p>
              <p className="text-green-600 text-sm mt-1">Round {game.currentRound} is ready for processing.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export { VotingStatus };