export enum GameState {
  VotingOpen = 0,
  ProcessingRound = 1,
  Completed = 2,
}

export interface VoteRecord {
  round: number;
  vote: boolean;
  timestamp: number;
}

export interface Game {
  gameId: string;
  questionText: string;
  entryFee: string;
  creator: string;
  roundDuration: string;
  state: GameState;
  currentRound: number;
  roundDeadline: string;
  totalPlayers: number;
  players: string[];
  playerVoteHistory: Record<string, VoteRecord[]>;
  currentRoundYesVotes: number;
  currentRoundNoVotes: number;
  currentRoundTotalVotes: number;
  remainingPlayers: string[];
  winners: string[];
  prizeAmount?: string;
  roundResults: Record<number, boolean>; // round -> winning vote (true=YES, false=NO)
}

export interface RoundResult {
  round: number;
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  winningVote: boolean; // true=YES, false=NO
  winners: string[]; // players who voted with minority
  losers: string[]; // players who were eliminated
}

export interface GameAnalysis {
  completedRounds: RoundResult[];
  eliminatedPlayers: string[];
  survivingPlayers: string[];
  isGameComplete: boolean;
  currentRoundVotes: { yes: number; no: number; total: number };
}

export interface PlayerStatus {
  hasJoined: boolean;
  hasVotedThisRound: boolean;
  isEliminated: boolean;
  isWinner: boolean;
  voteHistory: VoteRecord[];
}