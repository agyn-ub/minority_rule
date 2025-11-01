export enum GameState {
  SetCommitDeadline = 0,
  SetRevealDeadline = 1,
  CommitPhase = 2,
  RevealPhase = 3,
  ProcessingRound = 4,
  Completed = 5,
  
  // Legacy aliases for backwards compatibility
  VotingOpen = 2, // maps to CommitPhase
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
  roundDuration?: string; // Optional as it may not be in all game versions
  state: GameState;
  currentRound: number;
  roundDeadline?: string; // Optional deadline field
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
  
  // Enhanced fields from GetGameInfo script
  stateName?: string;
  commitCount?: number;
  revealCount?: number;
  prizePool?: string;
  prizesDistributed?: boolean;
  commitDeadline?: string;
  commitDeadlineFormatted?: string;
  revealDeadline?: string;
  revealDeadlineFormatted?: string;
  timeRemainingInPhase?: string;
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