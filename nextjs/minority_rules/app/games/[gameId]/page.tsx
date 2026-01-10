"use client";

import { useState, useEffect, use } from "react";
import { useFlowUser } from "@/lib/useFlowUser";
import { WebSocketGameProvider, useWebSocketGameContext } from "@/contexts/WebSocketProvider";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CopySuccessDialog } from "@/components/ui/info-dialog";
import { GameDebugPanel } from "@/components/ui/debug-panel";
import {
  joinGameTransaction,
  submitVoteCommitTransaction,
  submitVoteRevealTransaction,
  TX_STATES
} from "@/lib/transactions";
import { sha3_256 } from 'js-sha3';


// GameState enum matching Cadence contract
enum GameState {
  ZeroPhase = 0,
  CommitPhase = 1,
  RevealPhase = 2,
  Completed = 3
}

// Helper functions for game state
const getGameStateName = (state: number): string => {
  switch (state) {
    case GameState.ZeroPhase: return "Zero Phase";
    case GameState.CommitPhase: return "Commit Phase";
    case GameState.RevealPhase: return "Reveal Phase";
    case GameState.Completed: return "Completed";
    default: return "Unknown";
  }
};

const getGameStatusColor = (state: number): string => {
  switch (state) {
    case GameState.ZeroPhase: return "text-gray-700 bg-gray-100 border-gray-300";
    case GameState.CommitPhase: return "text-blue-700 bg-blue-100 border-blue-300";
    case GameState.RevealPhase: return "text-purple-700 bg-purple-100 border-purple-300";
    case GameState.Completed: return "text-green-700 bg-green-100 border-green-300";
    default: return "text-red-700 bg-red-100 border-red-300";
  }
};

// Type for game data from Supabase
type PublicGameDetails = {
  game_id: number;
  question_text: string;
  entry_fee: number;
  creator_address: string;
  current_round: number | null;
  game_state: number; // 0=zeroPhase, 1=commitPhase, 2=revealPhase, 3=completed
  commit_deadline: string | null;
  reveal_deadline: string | null;
  total_players: number | null;
  created_at: string | null;
};

// Types for completed game data
type RoundData = {
  id: number;
  game_id: number;
  round_number: number;
  yes_count: number;
  no_count: number;
  minority_vote: boolean; // true if YES was minority, false if NO was minority
  votes_remaining: number;
  completed_at: string | null;
};

type WinnerData = {
  id: number;
  game_id: number;
  winner_address: string;
  amount: number;
  distributed_at: string | null;
  transaction_id: string | null;
  block_height: number | null;
};

type VoteReveal = {
  game_id: number;
  round_number: number;
  player_address: string;
  vote_value: boolean; // true = YES, false = NO
  salt: string;
  revealed_at: string | null;
};

interface PublicGamePageProps {
  params: Promise<{
    gameId: string;
  }>;
}

function PublicGamePageContent() {
  const { user } = useFlowUser();
  const { game, loading, error, participationStatus } = useWebSocketGameContext();

  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [userSalt, setUserSalt] = useState('');
  const [commitHash, setCommitHash] = useState('');
  const [revealVote, setRevealVote] = useState<boolean | null>(null);
  const [revealSalt, setRevealSalt] = useState('');
  const [showCopySuccessDialog, setShowCopySuccessDialog] = useState(false);

  // Transaction state management
  const [txState, setTxState] = useState(TX_STATES.IDLE);
  const [txError, setTxError] = useState<string | null>(null);

  // Completed game data
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [winners, setWinners] = useState<WinnerData[]>([]);
  const [allReveals, setAllReveals] = useState<VoteReveal[]>([]);
  const [completedGameDataLoading, setCompletedGameDataLoading] = useState(false);
  const [isCreator, setIsCreator] = useState(false);

  const contractAddress = process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS!;

  // Transaction execution functions
  const handleJoinGame = async () => {
    if (!user?.loggedIn) return;

    try {
      setTxError(null);

      const result = await joinGameTransaction(
        game?.game_id?.toString() || '',
        contractAddress,
        {
          onStateChange: (state: string, data?: any) => {
            setTxState(state);
          },
          onSuccess: (txId: string, transaction: any) => {
          },
          onError: (error: any, txId?: string, transaction?: any) => {
            console.error("❌ Failed to join game:", error);
            setTxError(error.message || "Failed to join game");
            setTxState(TX_STATES.ERROR);
          }
        }
      );

      if (!result.success) {
        throw result.error;
      }
    } catch (error: any) {
      console.error("Join game error:", error);
      setTxError(error.message || "Failed to join game");
      setTxState(TX_STATES.ERROR);
    }
  };

  const handleCommitVote = async () => {
    if (!user?.loggedIn || !commitHash) return;

    try {
      setTxError(null);

      const result = await submitVoteCommitTransaction(
        game?.game_id?.toString() || '',
        commitHash,
        contractAddress,
        {
          onStateChange: (state: string, data?: any) => {
            setTxState(state);
          },
          onSuccess: (txId: string, transaction: any) => {
          },
          onError: (error: any, txId?: string, transaction?: any) => {
            console.error("❌ Failed to commit vote:", error);
            setTxError(error.message || "Failed to commit vote");
            setTxState(TX_STATES.ERROR);
          }
        }
      );

      if (!result.success) {
        throw result.error;
      }
    } catch (error: any) {
      console.error("Commit vote error:", error);
      setTxError(error.message || "Failed to commit vote");
      setTxState(TX_STATES.ERROR);
    }
  };

  const handleRevealVote = async () => {
    if (!user?.loggedIn || revealVote === null || !revealSalt) return;

    try {
      setTxError(null);

      const result = await submitVoteRevealTransaction(
        game?.game_id?.toString() || '',
        revealVote,
        revealSalt,
        contractAddress,
        {
          onStateChange: (state: string, data?: any) => {
            setTxState(state);
          },
          onSuccess: (txId: string, transaction: any) => {
          },
          onError: (error: any, txId?: string, transaction?: any) => {
            console.error("❌ Failed to reveal vote:", error);
            setTxError(error.message || "Failed to reveal vote");
            setTxState(TX_STATES.ERROR);
          }
        }
      );

      if (!result.success) {
        throw result.error;
      }
    } catch (error: any) {
      console.error("Reveal vote error:", error);
      setTxError(error.message || "Failed to reveal vote");
      setTxState(TX_STATES.ERROR);
    }
  };

  // Use participation status from WebSocket context (real-time)
  const userHasJoined = participationStatus?.hasJoined ?? false;
  const userHasCommitted = participationStatus?.hasCommitted ?? false;
  const userHasRevealed = participationStatus?.hasRevealed ?? false;

  // Log initial state when component mounts
  useEffect(() => {
    console.log("🎮 GAMES PAGE: Component mounted:");
    console.log("  🎯 Game ID:", game?.game_id);
    console.log("  👤 User address:", user?.addr || "No user");
    console.log("  📊 Initial participation status:", {
      hasJoined: userHasJoined,
      hasCommitted: userHasCommitted,
      hasRevealed: userHasRevealed
    });
    if (game) {
      console.log("  📋 Game data:", game);
    }
  }, []); // Empty dependency array to run only once on mount

  // Fetch completed game data (rounds, winners, reveals)
  const fetchCompletedGameData = async () => {
    if (!game?.game_id) return;

    try {
      setCompletedGameDataLoading(true);

      // Fetch rounds data
      const { data: roundsData, error: roundsError } = await supabase
        .from('rounds')
        .select('*')
.eq('game_id', game.game_id)
        .order('round_number', { ascending: true });

      if (roundsError) {
        console.error('Error fetching rounds:', roundsError);
      } else if (roundsData) {
        setRounds(roundsData);
      }

      // Fetch winners/prize distributions
      const { data: winnersData, error: winnersError } = await supabase
        .from('prize_distributions')
        .select('*')
.eq('game_id', game.game_id)
        .order('distributed_at', { ascending: true });

      if (winnersError) {
        console.error('Error fetching winners:', winnersError);
      } else if (winnersData) {
        setWinners(winnersData);
      }

      // Fetch all vote reveals for detailed voting history
      const { data: revealsData, error: revealsError } = await supabase
        .from('reveals')
        .select('*')
.eq('game_id', game.game_id)
        .order('round_number', { ascending: true });

      if (revealsError) {
        console.error('Error fetching reveals:', revealsError);
      } else if (revealsData) {
        setAllReveals(revealsData);
      }

    } catch (err) {
      console.error('Error fetching completed game data:', err);
    } finally {
      setCompletedGameDataLoading(false);
    }
  };


  // Check if current user is the creator when game data loads
  useEffect(() => {
    if (user?.addr && game?.creator_address === user.addr) {
      setIsCreator(true);
    } else {
      setIsCreator(false);
    }
  }, [user?.addr, game?.creator_address]);


  // Fetch completed game data when game state changes to completed
  useEffect(() => {
    if (game?.game_state === GameState.Completed) {
      fetchCompletedGameData();
    }
  }, [game?.game_state, game?.game_id]);

  // Generate commit hash from vote and salt (matches Cadence contract)
  const generateCommitHash = (vote: boolean, salt: string) => {
    const voteString = vote ? "true" : "false";
    const combinedString = voteString + salt;
    // Use SHA3-256 to match Cadence contract: String.encodeHex(HashAlgorithm.SHA3_256.hash(combinedString.utf8))
    const hash = sha3_256(combinedString);
    return hash;
  };

  // Handle vote selection and generate salt/hash
  const handleVoteSelection = (vote: boolean) => {
    setUserVote(vote);

    // Generate a random salt
    const salt = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setUserSalt(salt);

    // Generate commit hash
    const hash = generateCommitHash(vote, salt);
    setCommitHash(hash);
  };

  // Check if game exists and handle error display
  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            <p className="mt-2 text-muted-foreground">Loading game...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h1 className="scroll-m-20 font-extrabold tracking-tight text-red-900 mb-4">
              Game Not Found
            </h1>
            <p className="text-red-700 mb-6">
              {error || 'This game does not exist or has been removed.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/games"
                className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Back to Games
              </Link>
              <Link
                href="/"
                className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine game status for public view using real blockchain state
  const getGameStatus = (game: PublicGameDetails) => {
    const now = new Date();

    switch (game.game_state) {
      case GameState.ZeroPhase:
        return {
          status: 'setup',
          text: 'Setting Up',
          color: 'text-muted-foreground bg-muted border-border',
          description: 'Game creator is still setting up this game'
        };

      case GameState.CommitPhase:
        if (!game.commit_deadline) {
          return {
            status: 'setup',
            text: 'Setting Up',
            color: 'text-muted-foreground bg-muted border-border',
            description: 'Commit deadline not yet set'
          };
        }

        const commitDeadline = new Date(game.commit_deadline);
        if (now < commitDeadline) {
          return {
            status: 'joinable',
            text: 'Open for Joining',
            color: 'text-green-700 bg-green-50 border-green-200',
            description: 'Players can join and submit vote commitments'
          };
        } else {
          return {
            status: 'commit_ended',
            text: 'Commit Phase Ended',
            color: 'text-orange-700 bg-orange-50 border-orange-200',
            description: 'Waiting for reveal phase to start'
          };
        }

      case GameState.RevealPhase:
        return {
          status: 'revealing',
          text: 'Reveal Phase',
          color: 'text-blue-700 bg-blue-50 border-blue-200',
          description: 'Players are revealing their votes'
        };

      case GameState.Completed:
        return {
          status: 'completed',
          text: 'Completed',
          color: 'text-gray-700 bg-gray-50 border-gray-200',
          description: 'This game has ended and prizes distributed'
        };

      default:
        return {
          status: 'unknown',
          text: 'Unknown State',
          color: 'text-red-700 bg-red-50 border-red-200',
          description: 'Game is in an unknown state'
        };
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Component for displaying rounds information table
  const RoundsInformationTable = () => {
    if (completedGameDataLoading) {
      return (
        <div className="bg-card rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">📊 Rounds Summary</h3>
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading rounds data...</p>
          </div>
        </div>
      );
    }

    if (rounds.length === 0) {
      return (
        <div className="bg-card rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">📊 Rounds Summary</h3>
          <p className="text-muted-foreground text-center py-8">No rounds data available</p>
        </div>
      );
    }

    return (
      <div className="bg-card rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">📊 Rounds Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-foreground">Round</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">YES Votes</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">NO Votes</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Minority Vote</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Players Remaining</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Completed</th>
              </tr>
            </thead>
            <tbody>
              {rounds.map((round, index) => (
                <tr key={round.id} className={`border-b border-border ${index % 2 === 0 ? 'bg-muted/20' : ''}`}>
                  <td className="py-3 px-4 text-foreground font-medium">Round {round.round_number}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${round.minority_vote ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                      {round.yes_count} {round.minority_vote ? '(Minority)' : '(Majority)'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-sm font-medium ${!round.minority_vote ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                      {round.no_count} {!round.minority_vote ? '(Minority)' : '(Majority)'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200 rounded text-sm font-medium">
                      {round.minority_vote ? 'YES' : 'NO'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-foreground">{round.votes_remaining} players</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {round.completed_at ? new Date(round.completed_at).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Component for displaying winners and prize distribution
  const WinnersAndPrizeDistribution = () => {
    if (completedGameDataLoading) {
      return (
        <div className="bg-card rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">🏆 Winners & Prize Distribution</h3>
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading winners data...</p>
          </div>
        </div>
      );
    }

    if (winners.length === 0) {
      return (
        <div className="bg-card rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">🏆 Winners & Prize Distribution</h3>
          <p className="text-muted-foreground text-center py-8">No prize distribution data available</p>
        </div>
      );
    }

    const totalPrizeDistributed = winners.reduce((sum, winner) => sum + winner.amount, 0);
    const totalEntryFees = (game.total_players || 0) * game.entry_fee;
    const platformFee = totalEntryFees * 0.02;
    const netPrizePool = totalEntryFees * 0.98;

    return (
      <div className="bg-card rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">🏆 Winners & Prize Distribution</h3>

        {/* Financial Breakdown */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
          <h4 className="font-semibold text-foreground mb-3">💰 Financial Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Entry Fees:</span>
              <span className="font-medium">{totalEntryFees.toFixed(4)} FLOW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform Fee (2%):</span>
              <span className="font-medium text-orange-600">-{platformFee.toFixed(4)} FLOW</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Net Prize Pool:</span>
              <span className="font-medium text-green-600">{netPrizePool.toFixed(4)} FLOW</span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="text-center bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-2xl mb-2">👑</div>
            <div className="text-xl font-bold text-green-600 mb-1">{winners.length}</div>
            <div className="text-sm text-green-700 font-medium">Winner{winners.length !== 1 ? 's' : ''}</div>
          </div>
          <div className="text-center bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-xl font-bold text-blue-600 mb-1">{totalPrizeDistributed.toFixed(4)}</div>
            <div className="text-sm text-blue-700 font-medium">FLOW Distributed</div>
          </div>
          <div className="text-center bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-xl font-bold text-purple-600 mb-1">{(totalPrizeDistributed / winners.length).toFixed(4)}</div>
            <div className="text-sm text-purple-700 font-medium">FLOW per Winner</div>
          </div>
          <div className="text-center bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="text-2xl mb-2">🏪</div>
            <div className="text-xl font-bold text-orange-600 mb-1">{platformFee.toFixed(4)}</div>
            <div className="text-sm text-orange-700 font-medium">Platform Fee</div>
          </div>
        </div>

        {/* Winners Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-foreground">Rank</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Winner Address</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Prize Amount</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Distributed</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Transaction</th>
              </tr>
            </thead>
            <tbody>
              {winners.map((winner, index) => (
                <tr key={winner.id} className={`border-b border-border ${index % 2 === 0 ? 'bg-muted/20' : ''}`}>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-700 font-bold text-sm">
                      {index + 1}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">
                      {formatAddress(winner.winner_address)}
                    </code>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 border border-green-200 rounded text-sm font-medium">
                      {winner.amount.toFixed(4)} FLOW
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {winner.distributed_at ? new Date(winner.distributed_at).toLocaleString() : 'N/A'}
                  </td>
                  <td className="py-3 px-4">
                    {winner.transaction_id ? (
                      <code className="text-xs text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                        {formatAddress(winner.transaction_id)}
                      </code>
                    ) : (
                      <span className="text-xs text-muted-foreground">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Component for displaying detailed voting history
  const DetailedVotingHistory = () => {
    if (completedGameDataLoading) {
      return (
        <div className="bg-card rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">📋 Detailed Voting History</h3>
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading voting history...</p>
          </div>
        </div>
      );
    }

    if (allReveals.length === 0) {
      return (
        <div className="bg-card rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">📋 Detailed Voting History</h3>
          <p className="text-muted-foreground text-center py-8">No voting history data available</p>
        </div>
      );
    }

    // Group reveals by round
    const revealsByRound = allReveals.reduce((acc, reveal) => {
      if (!acc[reveal.round_number]) {
        acc[reveal.round_number] = [];
      }
      acc[reveal.round_number].push(reveal);
      return acc;
    }, {} as Record<number, VoteReveal[]>);

    // Sort rounds
    const sortedRounds = Object.keys(revealsByRound).sort((a, b) => parseInt(a) - parseInt(b));

    return (
      <div className="bg-card rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">📋 Detailed Voting History</h3>

        {/* Summary */}
        <div className="mb-6 p-4 bg-muted/30 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            <strong>Total Votes Revealed:</strong> {allReveals.length} across {sortedRounds.length} round{sortedRounds.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Voting History by Round */}
        <div className="space-y-6">
          {sortedRounds.map((roundStr) => {
            const roundNumber = parseInt(roundStr);
            const roundReveals = revealsByRound[roundNumber];
            const yesVotes = roundReveals.filter(r => r.vote_value).length;
            const noVotes = roundReveals.filter(r => !r.vote_value).length;
            const roundData = rounds.find(r => r.round_number === roundNumber);

            return (
              <div key={roundNumber} className="border border-border rounded-lg overflow-hidden">
                {/* Round Header */}
                <div className="bg-muted/30 px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">Round {roundNumber}</h4>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-600 font-medium">{yesVotes} YES</span>
                      <span className="text-red-600 font-medium">{noVotes} NO</span>
                      {roundData && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs font-medium">
                          {roundData.minority_vote ? 'YES' : 'NO'} was minority
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Votes Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/20 border-b border-border">
                        <th className="text-left py-2 px-4 font-medium text-foreground text-sm">Player</th>
                        <th className="text-left py-2 px-4 font-medium text-foreground text-sm">Vote</th>
                        <th className="text-left py-2 px-4 font-medium text-foreground text-sm">Result</th>
                        <th className="text-left py-2 px-4 font-medium text-foreground text-sm">Revealed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roundReveals.map((reveal, index) => {
                        const isMinorityVote = (reveal.vote_value && roundData?.minority_vote) ||
                          (!reveal.vote_value && !roundData?.minority_vote);

                        return (
                          <tr key={`${reveal.player_address}-${roundNumber}`}
                            className={`border-b border-border ${index % 2 === 0 ? 'bg-muted/10' : ''}`}>
                            <td className="py-2 px-4">
                              <code className="text-xs bg-gray-100 px-1 py-0.5 rounded font-mono">
                                {formatAddress(reveal.player_address)}
                              </code>
                            </td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${reveal.vote_value
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                {reveal.vote_value ? 'YES' : 'NO'}
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${isMinorityVote
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                                }`}>
                                {isMinorityVote ? 'Advanced' : 'Eliminated'}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-xs text-muted-foreground">
                              {reveal.revealed_at ? new Date(reveal.revealed_at).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/" className="text-primary hover:text-primary/80">
                Home
              </Link>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-muted-foreground">Game #{game?.game_id || 'Loading...'}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Game Details */}
        <div className="space-y-6 mb-8">
          {/* Row 1: Game Header */}
          <div className="bg-card rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">

                <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                  <div className="flex items-center gap-4">
                    <h1 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                      Game #{game.game_id}
                    </h1>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getGameStatusColor(game.game_state)}`}>
                      {getGameStateName(game.game_state)}
                    </span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
                    <span className="text-sm font-medium text-blue-800">
                      👤 Creator: <code className="font-mono text-blue-900 font-semibold">{formatAddress(game.creator_address)}</code>
                    </span>
                  </div>
                </div>

                {/* Game Question */}
                <div className="mb-4">
                  <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight mb-3">Game Question</h2>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                    <p className="text-xl text-foreground font-medium leading-relaxed">
                      {game.question_text}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Rules */}
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-foreground mb-3">🎯 How to Play</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-blue-500">1️⃣</span>
                  <span>Answer with <strong>YES</strong> or <strong>NO</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-500">2️⃣</span>
                  <span>Only <strong>minority</strong> players advance</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-500">3️⃣</span>
                  <span>Continue until <strong>1-2 players</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">4️⃣</span>
                  <span>Winners <strong>split prize pool</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Game Statistics */}
          <div className="bg-card rounded-lg shadow-lg p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">📊 Game Statistics</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Entry Fee */}
              <div className="text-center bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="text-xl mb-1">💰</div>
                <div className="text-xl font-bold text-blue-600 mb-0.5">{game.entry_fee}</div>
                <div className="text-xs text-blue-700 font-medium">FLOW Entry Fee</div>
              </div>

              {/* Players */}
              <div className="text-center bg-purple-50 rounded-lg p-2 border border-purple-200">
                <div className="text-xl mb-1">👥</div>
                <div className="text-xl font-bold text-purple-600 mb-0.5">{game.total_players || 0}</div>
                <div className="text-xs text-purple-700 font-medium">Total Players</div>
              </div>

              {/* Round */}
              <div className="text-center bg-orange-50 rounded-lg p-2 border border-orange-200">
                <div className="text-xl mb-1">🔄</div>
                <div className="text-xl font-bold text-orange-600 mb-0.5">{game.current_round || 1}</div>
                <div className="text-xs text-orange-700 font-medium">Current Round</div>
              </div>

              {/* Prize Pool */}
              <div className="text-center bg-green-50 rounded-lg p-2 border border-green-200">
                <div className="text-xl mb-1">🏆</div>
                <div className="text-xl font-bold text-green-600 mb-0.5">
                  {((game.total_players || 0) * game.entry_fee * 0.98).toFixed(1)}
                </div>
                <div className="text-xs text-green-700 font-medium">FLOW Prize Pool</div>
              </div>
            </div>

            {/* Additional Info */}
            {game.commit_deadline && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground">
                  <span>⏰ Join deadline:</span>
                  <span className="font-medium">{new Date(game.commit_deadline).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Game Actions or Completed Game View */}
          {game.game_state === GameState.Completed ? (
            /* Completed Game View */
            <div className="space-y-6">
              <RoundsInformationTable />
              <WinnersAndPrizeDistribution />
              <DetailedVotingHistory />
            </div>
          ) : (
            /* Active Game Actions */
            <div className="bg-card rounded-lg shadow-lg p-6">
              {/* Player Already Joined Confirmation - Full Width */}
              {game.game_state === GameState.CommitPhase &&
                game.commit_deadline &&
                user?.loggedIn &&
                userHasJoined && (
                  <div className="w-full mb-6">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-green-800 mb-4 text-center">✅ You've Successfully Joined This Game!</h3>
                      <div className="text-center mb-6">
                        <div className="text-green-700 bg-white border border-green-300 rounded-lg p-4 inline-block">
                          <p className="font-medium mb-2">Entry Fee Paid: <span className="text-lg font-bold">{game.entry_fee} FLOW</span></p>
                          <p className="text-sm text-green-600">You're now eligible to participate in all game rounds</p>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg p-4 border border-green-200">
                          <h4 className="font-semibold text-green-800 mb-2">🎯 Game Rules Reminder</h4>
                          <div className="text-sm text-green-700 space-y-1">
                            <p>• Answer with YES or NO when voting opens</p>
                            <p>• Only minority voters advance to next round</p>
                            <p>• Winners split the prize pool</p>
                            <p>• Game continues until 1-2 players remain</p>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-green-200">
                          <h4 className="font-semibold text-green-800 mb-2">📋 Next Steps</h4>
                          <div className="text-sm text-green-700 space-y-1">
                            <p>• Wait for the commit phase to begin</p>
                            <p>• Submit your vote commitment when voting opens</p>
                            <p>• Remember to save your salt for reveal phase</p>
                            {game.commit_deadline && new Date() < new Date(game.commit_deadline) && (
                              <p>• Voting ends: {new Date(game.commit_deadline).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              {/* Actions Section - Full Width */}
              <div className="space-y-6">
                {/* Join Game Form - Show only if user can join */}
                {game.game_state === GameState.CommitPhase &&
                  game.commit_deadline &&
                  new Date() < new Date(game.commit_deadline) &&
                  user?.loggedIn &&
                  !userHasJoined && (
                    <div className="bg-card rounded-lg shadow-lg p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Join Game</h3>
                      <div className="text-center mb-4">
                        <div className="text-2xl font-bold text-foreground mb-2">
                          {game.entry_fee} FLOW
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Entry fee required
                        </p>
                      </div>

                      <button
                        onClick={handleJoinGame}
                        disabled={txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING}
                        className={`w-full py-3 px-4 rounded-lg transition-colors font-medium ${txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
                          ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-700"
                          }`}
                      >
                        {txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
                          ? "Joining..."
                          : "Join Game"
                        }
                      </button>

                      <div className="mt-3 text-xs text-muted-foreground text-center">
                        <p>• You need {game.entry_fee} FLOW to join</p>
                        <p>• Once joined, you can vote on the question</p>
                        <p>• Only minority voters advance to next round</p>
                      </div>
                    </div>
                  )}

                {/* Login Required for Join */}
                {game.game_state === GameState.CommitPhase &&
                  game.commit_deadline &&
                  new Date() < new Date(game.commit_deadline) &&
                  !user?.loggedIn && (
                    <div className="bg-card rounded-lg shadow-lg p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">Join Game</h3>
                      <div className="text-center">
                        <p className="text-muted-foreground mb-4">
                          Connect your wallet to join this game
                        </p>
                        <Link
                          href="/"
                          className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium text-center block"
                        >
                          Connect Wallet
                        </Link>
                      </div>
                    </div>
                  )}


                {/* Commit Vote Form - Show only if user has joined and hasn't committed */}
                {game.game_state === GameState.CommitPhase &&
                  game.commit_deadline &&
                  new Date() < new Date(game.commit_deadline) &&
                  user?.loggedIn &&
                  userHasJoined &&
                  !userHasCommitted && (
                    <div className="bg-card rounded-lg shadow-lg p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">💭 Submit Your Vote</h3>
                      <div className="text-center mb-6">
                        <p className="text-muted-foreground mb-4">
                          What's your answer to: <strong>{game.question_text}</strong>
                        </p>

                        {/* Vote Selection */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <button
                            onClick={() => handleVoteSelection(true)}
                            className={`p-4 rounded-lg border-2 transition-all ${userVote === true
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-300 bg-gray-50 hover:border-green-300 hover:bg-green-50'
                              }`}
                          >
                            <div className="text-2xl mb-2">✅</div>
                            <div className="font-semibold">YES</div>
                          </button>

                          <button
                            onClick={() => handleVoteSelection(false)}
                            className={`p-4 rounded-lg border-2 transition-all ${userVote === false
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 bg-gray-50 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-2xl mb-2">❌</div>
                            <div className="font-semibold">NO</div>
                          </button>
                        </div>

                        {userVote !== null && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-700">
                              <strong>Your vote:</strong> {userVote ? 'YES' : 'NO'}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Your vote will be hidden until the reveal phase
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Submit Button */}
                      {userVote !== null && (
                        <button
                          onClick={handleCommitVote}
                          disabled={!commitHash || txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING}
                          className={`w-full py-3 px-4 rounded-lg transition-colors font-medium ${!commitHash || txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
                            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                            }`}
                        >
                          {txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
                            ? "Committing..."
                            : "Submit Vote Commitment"
                          }
                        </button>
                      )}

                      <div className="mt-4 text-xs text-muted-foreground text-center">
                        <p>• Your vote will be hidden until the reveal phase</p>
                        <p>• Remember your choice - you'll need it to reveal later</p>
                        <p>• Only minority voters advance to the next round</p>
                      </div>
                    </div>
                  )}

                {/* Vote Committed Confirmation */}
                {game.game_state === GameState.CommitPhase &&
                  user?.loggedIn &&
                  userHasJoined &&
                  userHasCommitted && (
                    <div className="bg-card rounded-lg shadow-lg p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">✅ Vote Committed!</h3>
                      <div className="text-center">
                        <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <p className="font-medium mb-2">Your vote has been successfully committed</p>
                          <p className="text-sm text-green-600">Your vote is hidden until the reveal phase begins</p>
                        </div>

                        {/* Critical Salt Display */}
                        {userSalt && (
                          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-6">
                            <div className="flex items-center justify-center mb-3">
                              <span className="text-2xl mr-2">🔑</span>
                              <h4 className="text-lg font-bold text-red-800">CRITICAL: Save Your Salt</h4>
                            </div>

                            <div className="bg-white border border-red-200 rounded-lg p-4 mb-4">
                              <p className="text-sm font-medium text-red-700 mb-2">Your Salt (Required for Reveal):</p>
                              <div className="flex items-center gap-2">
                                <code className="flex-1 bg-gray-100 px-3 py-2 rounded border text-sm font-mono break-all">
                                  {userSalt}
                                </code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(userSalt);
                                    setShowCopySuccessDialog(true);
                                  }}
                                  className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 transition-colors text-sm font-medium"
                                >
                                  Copy
                                </button>
                              </div>
                            </div>

                            <div className="text-left text-sm text-red-800 space-y-1">
                              <p className="font-semibold">⚠️ WARNING: You MUST save this salt!</p>
                              <p>• Copy it to a safe place (notes app, password manager, etc.)</p>
                              <p>• You'll need this exact salt to reveal your vote</p>
                              <p>• Losing this salt means you CANNOT reveal and will lose the game</p>
                              <p>• The salt will disappear if you refresh this page</p>
                            </div>
                          </div>
                        )}

                        <div className="text-sm text-muted-foreground space-y-2">
                          <p><strong>Next Steps:</strong></p>
                          <p>• Save your salt in a secure location</p>
                          <p>• Wait for the commit phase to end</p>
                          <p>• Reveal your vote during the reveal phase using your saved salt</p>
                          <p>• Remember your original vote choice: <strong>{userVote !== null ? (userVote ? 'YES' : 'NO') : 'Unknown'}</strong></p>
                          {game.commit_deadline && new Date() < new Date(game.commit_deadline) && (
                            <p>• Commit phase ends: {new Date(game.commit_deadline).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}


                {/* Reveal Vote Form - Show only if user has committed and game is in reveal phase */}
                {game.game_state === GameState.RevealPhase &&
                  game.reveal_deadline &&
                  new Date() < new Date(game.reveal_deadline) &&
                  user?.loggedIn &&
                  userHasJoined &&
                  userHasCommitted &&
                  !userHasRevealed && (
                    <div className="bg-card rounded-lg shadow-lg p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">🔓 Reveal Your Vote</h3>
                      <div className="text-center mb-6">
                        <p className="text-muted-foreground mb-4">
                          Reveal your answer to: <strong>{game.question_text}</strong>
                        </p>

                        {/* Vote Reveal Selection */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <button
                            onClick={() => setRevealVote(true)}
                            className={`p-4 rounded-lg border-2 transition-all ${revealVote === true
                              ? 'border-green-500 bg-green-50 text-green-700'
                              : 'border-gray-300 bg-gray-50 hover:border-green-300 hover:bg-green-50'
                              }`}
                          >
                            <div className="text-2xl mb-2">✅</div>
                            <div className="font-semibold">YES</div>
                          </button>

                          <button
                            onClick={() => setRevealVote(false)}
                            className={`p-4 rounded-lg border-2 transition-all ${revealVote === false
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 bg-gray-50 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-2xl mb-2">❌</div>
                            <div className="font-semibold">NO</div>
                          </button>
                        </div>

                        {/* Salt Input */}
                        <div className="mb-6">
                          <label htmlFor="revealSalt" className="block text-sm font-medium text-foreground mb-2">
                            Salt (from your original commitment)
                          </label>
                          <input
                            id="revealSalt"
                            type="text"
                            value={revealSalt}
                            onChange={(e) => setRevealSalt(e.target.value)}
                            placeholder="Enter the 64-character salt from when you committed"
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground font-mono text-sm"
                            maxLength={64}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            This was generated when you submitted your commitment
                          </p>
                        </div>

                        {revealVote !== null && revealSalt.length === 64 && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-700">
                              <strong>Revealing:</strong> {revealVote ? 'YES' : 'NO'}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                              Make sure this matches your original commitment
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Submit Button */}
                      {revealVote !== null && revealSalt.length === 64 && (
                        <button
                          onClick={handleRevealVote}
                          disabled={revealVote === null || revealSalt.length !== 64 || txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING}
                          className={`w-full py-3 px-4 rounded-lg transition-colors font-medium ${revealVote === null || revealSalt.length !== 64 || txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
                            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                            : "bg-purple-600 text-white hover:bg-purple-700"
                            }`}
                        >
                          {txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
                            ? "Revealing..."
                            : "Reveal Vote"
                          }
                        </button>
                      )}

                      <div className="mt-4 text-xs text-muted-foreground text-center">
                        <p>• You must reveal the same vote and salt you committed earlier</p>
                        <p>• If they don't match, the transaction will fail</p>
                        <p>• Only minority voters advance to the next round</p>
                      </div>
                    </div>
                  )}

                {/* Vote Revealed Confirmation */}
                {game.game_state === GameState.RevealPhase &&
                  user?.loggedIn &&
                  userHasJoined &&
                  userHasCommitted &&
                  userHasRevealed && (
                    <div className="bg-card rounded-lg shadow-lg p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">✅ Vote Revealed!</h3>
                      <div className="text-center">
                        <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <p className="font-medium mb-2">Your vote has been successfully revealed</p>
                          <p className="text-sm text-green-600">Your vote is now public and being counted</p>
                        </div>

                        <div className="text-sm text-muted-foreground space-y-2">
                          <p><strong>Next Steps:</strong></p>
                          <p>• Wait for all players to reveal their votes</p>
                          <p>• Round will be processed when reveal phase ends</p>
                          <p>• Only minority voters advance to next round</p>
                          {game.reveal_deadline && new Date() < new Date(game.reveal_deadline) && (
                            <p>• Reveal phase ends: {new Date(game.reveal_deadline).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Transaction Error Display */}
        {txError && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm font-medium">Transaction Error</p>
            <p className="text-red-600 text-sm mt-1">{txError}</p>
            <button
              onClick={() => setTxError(null)}
              className="mt-2 text-red-700 hover:text-red-800 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Transaction Success Display */}
        {txState === TX_STATES.SUCCESS && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 text-sm font-medium">Transaction Successful!</p>
            <p className="text-green-600 text-sm mt-1">The operation completed successfully.</p>
          </div>
        )}

        {/* Navigation */}
        <div className="text-center mt-6">
          <Link
            href="/games"
            className="text-primary hover:text-primary/80 text-sm"
          >
            ← Back to All Games
          </Link>
        </div>
      </div>

      <CopySuccessDialog
        open={showCopySuccessDialog}
        onOpenChange={setShowCopySuccessDialog}
        item="Salt"
      />

      {/* Debug Panel */}
      <GameDebugPanel 
        gameHookData={{
          game,
          loading,
          error,
          hasUserJoined: userHasJoined,
          hasUserCommitted: userHasCommitted,
          hasUserRevealed: userHasRevealed
        }}
        user={{ addr: user?.addr || undefined, loggedIn: user?.loggedIn || false }}
        gameId={game?.game_id?.toString() || ''}
      />
    </div>
  );
}

export default function PublicGamePage({ params }: PublicGamePageProps) {
  const resolvedParams = use(params);
  const gameId = resolvedParams.gameId;
  const gameIdNum = parseInt(gameId);

  return (
    <WebSocketGameProvider gameId={gameIdNum}>
      <PublicGamePageContent />
    </WebSocketGameProvider>
  );
}