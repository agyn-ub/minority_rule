'use client';

import React, { memo, useMemo } from 'react';
import { Game, GameState } from '@/types/game';
import { analyzeGame } from '@/lib/utils/gameAnalysis';

interface GameProgressProps {
  game: Game;
}

const GameProgress = memo(function GameProgress({ game }: GameProgressProps) {
  const gameAnalysis = useMemo(() => analyzeGame(game), [game]);
  
  // Create progress steps
  const steps = useMemo(() => {
    const steps = [];
    
    // Game Start
    steps.push({
      id: 'start',
      title: 'Game Started',
      subtitle: `${game.totalPlayers} players joined`,
      status: 'completed' as const,
      players: game.totalPlayers
    });
    
    // Completed rounds
    gameAnalysis.completedRounds.forEach(round => {
      steps.push({
        id: `round-${round.round}`,
        title: `Round ${round.round}`,
        subtitle: `${round.losers.length} eliminated, ${round.winners.length} advanced`,
        status: 'completed' as const,
        players: round.winners.length,
        vote: round.winningVote ? 'YES' : 'NO'
      });
    });
    
    // Current round (if not completed)
    if (game.state !== GameState.Completed && gameAnalysis.completedRounds.length < game.currentRound) {
      steps.push({
        id: `round-${game.currentRound}`,
        title: `Round ${game.currentRound}`,
        subtitle: game.state === GameState.VotingOpen 
          ? `Voting in progress (${game.currentRoundTotalVotes}/${game.remainingPlayers.length} votes)`
          : 'Processing results...',
        status: game.state === GameState.VotingOpen ? 'in-progress' as const : 'processing' as const,
        players: game.remainingPlayers.length
      });
    }
    
    // Game completion
    if (game.state === GameState.Completed) {
      steps.push({
        id: 'completed',
        title: 'Game Completed',
        subtitle: game.winners.length > 0 
          ? `${game.winners.length} winner${game.winners.length !== 1 ? 's' : ''}`
          : 'No winners',
        status: 'completed' as const,
        players: game.winners.length
      });
    }
    
    return steps;
  }, [game, gameAnalysis]);
  
  const getStepIcon = (step: typeof steps[0]) => {
    switch (step.status) {
      case 'completed':
        if (step.id === 'start') return '🎮';
        if (step.id === 'completed') return game.winners.length > 0 ? '🏆' : '💀';
        return '✅';
      case 'in-progress':
        return '🗳️';
      case 'processing':
        return '⚙️';
      default:
        return '⏳';
    }
  };
  
  const getStepColor = (step: typeof steps[0]) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-300 bg-green-50';
      case 'in-progress':
        return 'border-blue-300 bg-blue-50';
      case 'processing':
        return 'border-yellow-300 bg-yellow-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };
  
  const getConnectorColor = (index: number) => {
    const currentStep = steps[index];
    const nextStep = steps[index + 1];
    
    if (currentStep.status === 'completed' && nextStep?.status === 'completed') {
      return 'bg-green-300';
    } else if (currentStep.status === 'completed') {
      return 'bg-gradient-to-r from-green-300 to-gray-300';
    }
    return 'bg-gray-300';
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-6">Game Progress</h3>
      
      <div className="relative">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step */}
            <div className="relative flex items-center mb-6 last:mb-0">
              {/* Icon */}
              <div className={`flex-shrink-0 w-12 h-12 rounded-full border-2 ${getStepColor(step)} flex items-center justify-center text-lg relative z-10`}>
                {getStepIcon(step)}
              </div>
              
              {/* Content */}
              <div className="ml-4 flex-grow">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-600">{step.subtitle}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">{step.players}</div>
                    <div className="text-xs text-gray-500">players</div>
                    {step.vote && (
                      <div className={`text-xs px-2 py-1 rounded mt-1 ${
                        step.vote === 'YES' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {step.vote} won
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div 
                className={`absolute left-6 w-0.5 h-6 -mt-6 ${getConnectorColor(index)}`}
                style={{ top: `${(index + 1) * 80 + 24}px` }}
              ></div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Progress Bar */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Game Progress</span>
          <span>
            {gameAnalysis.completedRounds.length} / {game.currentRound + (game.state === GameState.Completed ? 0 : 1)} rounds
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${Math.min(100, (gameAnalysis.completedRounds.length / Math.max(1, game.currentRound)) * 100)}%` 
            }}
          ></div>
        </div>
      </div>
    </div>
  );
});

export { GameProgress };