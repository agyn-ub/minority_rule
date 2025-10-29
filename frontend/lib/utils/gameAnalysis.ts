import { Game, GameAnalysis, RoundResult, VoteRecord } from '@/types/game';

/**
 * Analyze a game to extract round results and player progression
 */
export function analyzeGame(game: Game): GameAnalysis {
  const completedRounds: RoundResult[] = [];
  const eliminatedPlayers: string[] = [];
  
  // Get all completed rounds (rounds with results)
  const roundNumbers = Object.keys(game.roundResults).map(Number).sort((a, b) => a - b);
  
  for (const roundNum of roundNumbers) {
    const winningVote = game.roundResults[roundNum];
    const roundResult = analyzeRound(game, roundNum, winningVote);
    completedRounds.push(roundResult);
    
    // Track eliminated players
    roundResult.losers.forEach(loser => {
      if (!eliminatedPlayers.includes(loser)) {
        eliminatedPlayers.push(loser);
      }
    });
  }
  
  return {
    completedRounds,
    eliminatedPlayers,
    survivingPlayers: game.remainingPlayers,
    isGameComplete: game.winners.length > 0,
    currentRoundVotes: {
      yes: game.currentRoundYesVotes,
      no: game.currentRoundNoVotes,
      total: game.currentRoundTotalVotes
    }
  };
}

/**
 * Analyze a specific round to determine winners and losers
 */
export function analyzeRound(game: Game, round: number, winningVote: boolean): RoundResult {
  const winners: string[] = [];
  const losers: string[] = [];
  let yesVotes = 0;
  let noVotes = 0;
  
  // Get players who participated in this round
  const participatingPlayers = round === 1 ? game.players : getPreviousRoundSurvivors(game, round - 1);
  
  // Count votes and determine winners/losers
  for (const player of participatingPlayers) {
    const playerVotes = game.playerVoteHistory[player] || [];
    const roundVote = playerVotes.find(vote => vote.round === round);
    
    if (roundVote) {
      if (roundVote.vote) {
        yesVotes++;
      } else {
        noVotes++;
      }
      
      // If player voted with the minority, they win
      if (roundVote.vote === winningVote) {
        winners.push(player);
      } else {
        losers.push(player);
      }
    }
  }
  
  return {
    round,
    yesVotes,
    noVotes,
    totalVotes: yesVotes + noVotes,
    winningVote,
    winners,
    losers
  };
}

/**
 * Get players who survived to a specific round
 */
export function getPreviousRoundSurvivors(game: Game, round: number): string[] {
  if (round === 0) return game.players;
  
  const analysis = analyzeGame(game);
  const roundsUpTo = analysis.completedRounds.filter(r => r.round <= round);
  
  let survivors = [...game.players];
  
  for (const roundResult of roundsUpTo) {
    survivors = survivors.filter(player => !roundResult.losers.includes(player));
  }
  
  return survivors;
}

/**
 * Get player's voting history formatted for display
 */
export function getPlayerVotingHistory(game: Game, playerAddress: string): VoteRecord[] {
  return game.playerVoteHistory[playerAddress] || [];
}

/**
 * Check if a player was eliminated in a specific round
 */
export function wasPlayerEliminatedInRound(game: Game, playerAddress: string, round: number): boolean {
  const analysis = analyzeGame(game);
  const roundResult = analysis.completedRounds.find(r => r.round === round);
  return roundResult ? roundResult.losers.includes(playerAddress) : false;
}

/**
 * Get the round in which a player was eliminated
 */
export function getPlayerEliminationRound(game: Game, playerAddress: string): number | null {
  const analysis = analyzeGame(game);
  
  for (const roundResult of analysis.completedRounds) {
    if (roundResult.losers.includes(playerAddress)) {
      return roundResult.round;
    }
  }
  
  return null;
}

/**
 * Calculate prize per winner
 */
export function calculatePrizePerWinner(game: Game): number {
  if (game.winners.length === 0) return 0;
  
  const totalPrize = parseFloat(game.entryFee) * game.totalPlayers * 0.97; // 3% fee
  return totalPrize / game.winners.length;
}

/**
 * Format vote for display
 */
export function formatVote(vote: boolean): string {
  return vote ? 'YES' : 'NO';
}

/**
 * Format address for display
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}