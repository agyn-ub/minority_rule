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
}

export interface PlayerStatus {
  hasJoined: boolean;
  hasVotedThisRound: boolean;
  isEliminated: boolean;
  isWinner: boolean;
  voteHistory: VoteRecord[];
}