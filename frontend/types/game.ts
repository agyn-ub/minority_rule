export enum GameState {
  ZeroPhase = 0,      // Contract: zeroPhase - initial state, waiting for commit deadline
  CommitPhase = 1,    // Contract: commitPhase - players can commit votes
  RevealPhase = 2,    // Contract: revealPhase - players reveal their votes
  ProcessingRound = 3, // Contract: processingRound - round being processed
  Completed = 4,      // Contract: completed - game finished
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
  
  // User-specific history fields
  userVoteHistory?: VoteRecord[];
  userStillInGame?: boolean;
  userIsWinner?: boolean;
  userTotalVotes?: number;
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