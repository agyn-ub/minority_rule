"use client";

import { useState, useEffect, use } from "react";
import { useFlowUser } from "@/lib/useFlowUser";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { CopySuccessDialog } from "@/components/ui/info-dialog";
import { 
  joinGameTransaction, 
  submitVoteCommitTransaction, 
  submitVoteRevealTransaction,
  TX_STATES 
} from "@/lib/transactions";
import * as fcl from "@onflow/fcl";
import { sha3_256 } from 'js-sha3';


// GameState enum matching Cadence contract
enum GameState {
  ZeroPhase = 0,
  CommitPhase = 1,
  RevealPhase = 2,
  ProcessingRound = 3,
  Completed = 4
}

// Helper functions for game state
const getGameStateName = (state: number): string => {
  switch (state) {
    case GameState.ZeroPhase: return "Zero Phase";
    case GameState.CommitPhase: return "Commit Phase";
    case GameState.RevealPhase: return "Reveal Phase";
    case GameState.ProcessingRound: return "Processing Round";
    case GameState.Completed: return "Completed";
    default: return "Unknown";
  }
};

const getGameStatusColor = (state: number): string => {
  switch (state) {
    case GameState.ZeroPhase: return "text-gray-700 bg-gray-100 border-gray-300";
    case GameState.CommitPhase: return "text-blue-700 bg-blue-100 border-blue-300";
    case GameState.RevealPhase: return "text-purple-700 bg-purple-100 border-purple-300";
    case GameState.ProcessingRound: return "text-orange-700 bg-orange-100 border-orange-300";
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
  current_round: number;
  game_state: number; // 0=zeroPhase, 1=commitPhase, 2=revealPhase, 3=processingRound, 4=completed
  commit_deadline: string | null;
  reveal_deadline: string | null;
  total_players: number;
  created_at: string;
};

interface PublicGamePageProps {
  params: Promise<{
    gameId: string;
  }>;
}

export default function PublicGamePage({ params }: PublicGamePageProps) {
  const { user } = useFlowUser();
  const resolvedParams = use(params);
  const gameId = resolvedParams.gameId;

  const [game, setGame] = useState<PublicGameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [playerJoinedEvent, setPlayerJoinedEvent] = useState<any>(null);
  const [hasUserJoined, setHasUserJoined] = useState(false);
  const [hasUserCommitted, setHasUserCommitted] = useState(false);
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [userSalt, setUserSalt] = useState('');
  const [commitHash, setCommitHash] = useState('');
  const [hasUserRevealed, setHasUserRevealed] = useState(false);
  const [revealVote, setRevealVote] = useState<boolean | null>(null);
  const [revealSalt, setRevealSalt] = useState('');
  const [showCopySuccessDialog, setShowCopySuccessDialog] = useState(false);
  
  // Transaction state management
  const [txState, setTxState] = useState(TX_STATES.IDLE);
  const [txError, setTxError] = useState<string | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS!;

  // Transaction execution functions
  const handleJoinGame = async () => {
    if (!user?.loggedIn) return;

    try {
      setTxError(null);
      console.log("🚀 Joining game:", { gameId, contractAddress });

      const result = await joinGameTransaction(
        gameId,
        contractAddress,
        {
          onStateChange: (state: string, data?: any) => {
            console.log("Transaction state:", state, data);
            setTxState(state);
          },
          onSuccess: (txId: string, transaction: any) => {
            console.log("✅ Successfully joined game:", txId);
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
      console.log("🚀 Committing vote:", { gameId, commitHash, contractAddress });

      const result = await submitVoteCommitTransaction(
        gameId,
        commitHash,
        contractAddress,
        {
          onStateChange: (state: string, data?: any) => {
            console.log("Transaction state:", state, data);
            setTxState(state);
          },
          onSuccess: (txId: string, transaction: any) => {
            console.log("✅ Successfully committed vote:", txId);
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
      console.log("🚀 Revealing vote:", { gameId, revealVote, revealSalt, contractAddress });

      const result = await submitVoteRevealTransaction(
        gameId,
        revealVote,
        revealSalt,
        contractAddress,
        {
          onStateChange: (state: string, data?: any) => {
            console.log("Transaction state:", state, data);
            setTxState(state);
          },
          onSuccess: (txId: string, transaction: any) => {
            console.log("✅ Successfully revealed vote:", txId);
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

  // Check if current user has already joined this game
  const checkIfUserHasJoined = async () => {
    if (!user?.addr || !gameId) return;

    try {
      const { data, error } = await supabase
        .from('game_players')
        .select('player_address')
        .eq('game_id', parseInt(gameId))
        .eq('player_address', user.addr)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("Error checking if user has joined:", error);
        return;
      }

      setHasUserJoined(data !== null);
    } catch (err) {
      console.error("Error checking user join status:", err);
    }
  };

  // Check if current user has already committed this round
  const checkIfUserHasCommitted = async () => {
    if (!user?.addr || !gameId || !game) return;

    try {
      const { data, error } = await supabase
        .from('commits')
        .select('commit_hash')
        .eq('game_id', parseInt(gameId))
        .eq('round_number', game.current_round)
        .eq('player_address', user.addr)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("Error checking if user has committed:", error);
        return;
      }

      setHasUserCommitted(data !== null);
    } catch (err) {
      console.error("Error checking user commit status:", err);
    }
  };

  // Check if current user has already revealed this round
  const checkIfUserHasRevealed = async () => {
    if (!user?.addr || !gameId || !game) return;

    try {
      const { data, error } = await supabase
        .from('reveals')
        .select('vote_value, salt')
        .eq('game_id', parseInt(gameId))
        .eq('round_number', game.current_round)
        .eq('player_address', user.addr)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("Error checking if user has revealed:", error);
        return;
      }

      setHasUserRevealed(data !== null);
    } catch (err) {
      console.error("Error checking user reveal status:", err);
    }
  };

  // Update game player count in Supabase when player joins
  const updateGamePlayerCountInSupabase = async (eventData: any) => {
    try {
      console.log("=== PLAYER JOINED SUPABASE UPDATE ===");
      console.log("Raw event data received:", JSON.stringify(eventData, null, 2));

      const { data, error } = await supabase
        .from('games')
        .update({ total_players: parseInt(eventData.totalPlayers) })
        .eq('game_id', parseInt(eventData.gameId))
        .select();

      if (error) {
        console.error("=== SUPABASE ERROR DETAILS ===");
        console.error("Full error object:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("Game player count updated successfully in Supabase:", data);
      return data;
    } catch (error) {
      console.error("Failed to update game player count in Supabase:", error);
    }
  };

  // Insert new player into game_players table when player joins
  const insertPlayerIntoGamePlayers = async (eventData: any) => {
    try {
      console.log("=== INSERTING PLAYER INTO game_players TABLE ===");
      console.log("Event data for player insertion:", JSON.stringify(eventData, null, 2));

      const playerData = {
        game_id: parseInt(eventData.gameId),
        player_address: eventData.player,
        joined_at: new Date().toISOString(),
        status: 'active' as const
      };

      console.log("Player data to insert:", JSON.stringify(playerData, null, 2));

      const { data, error } = await supabase
        .from('game_players')
        .insert([playerData])
        .select();

      if (error) {
        console.error("=== GAME_PLAYERS INSERT ERROR ===");
        console.error("Full error object:", JSON.stringify(error, null, 2));
        console.error("Error message:", error?.message);
        console.error("Error code:", error?.code);
        console.error("Error details:", error?.details);
        console.error("===============================");
        throw error;
      }

      console.log("Player inserted successfully into game_players table:", data);
      return data;
    } catch (error) {
      console.error("Failed to insert player into game_players table:", error);
      // Don't throw - we don't want to break the UI if this fails
    }
  };

  // Insert commit into Supabase when VoteCommitted event is detected
  const insertCommitIntoSupabase = async (eventData: any) => {
    try {
      console.log("=== INSERTING COMMIT INTO commits TABLE ===");
      console.log("Event data for commit insertion:", JSON.stringify(eventData, null, 2));

      // First lookup the round_id from rounds table
      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .select('id')
        .eq('game_id', parseInt(eventData.gameId))
        .eq('round_number', parseInt(eventData.round))
        .single();

      if (roundError && roundError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("Error looking up round_id:", roundError);
      }

      const commitData = {
        game_id: parseInt(eventData.gameId),
        round_number: parseInt(eventData.round),
        round_id: roundData?.id || null, // Include round_id if found
        player_address: eventData.player,
        commit_hash: commitHash, // Use the locally stored hash
        committed_at: new Date().toISOString()
      };

      console.log("Commit data to insert:", JSON.stringify(commitData, null, 2));

      const { data, error } = await supabase
        .from('commits')
        .insert([commitData])
        .select();

      if (error) {
        console.error("=== COMMITS INSERT ERROR ===");
        console.error("Full error object:", JSON.stringify(error, null, 2));
        console.error("Error message:", error?.message);
        console.error("Error code:", error?.code);
        console.error("Error details:", error?.details);
        console.error("========================");
        throw error;
      }

      console.log("Commit inserted successfully into commits table:", data);
      return data;
    } catch (error) {
      console.error("Failed to insert commit into commits table:", error);
      // Don't throw - we don't want to break the UI if this fails
    }
  };

  // Insert reveal into Supabase when VoteRevealed event is detected
  const insertRevealIntoSupabase = async (eventData: any) => {
    try {
      console.log("=== INSERTING REVEAL INTO reveals TABLE ===");
      console.log("Event data for reveal insertion:", JSON.stringify(eventData, null, 2));

      // First lookup the round_id from rounds table
      const { data: roundData, error: roundError } = await supabase
        .from('rounds')
        .select('id')
        .eq('game_id', parseInt(eventData.gameId))
        .eq('round_number', parseInt(eventData.round))
        .single();

      if (roundError && roundError.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error("Error looking up round_id:", roundError);
      }

      const revealData = {
        game_id: parseInt(eventData.gameId),
        round_number: parseInt(eventData.round),
        round_id: roundData?.id || null, // Include round_id if found
        player_address: eventData.player,
        vote_value: eventData.vote,
        salt: revealSalt, // Use the locally stored salt
        revealed_at: new Date().toISOString()
      };

      console.log("Reveal data to insert:", JSON.stringify(revealData, null, 2));

      const { data, error } = await supabase
        .from('reveals')
        .insert([revealData])
        .select();

      if (error) {
        console.error("=== REVEALS INSERT ERROR ===");
        console.error("Full error object:", JSON.stringify(error, null, 2));
        console.error("Error message:", error?.message);
        console.error("Error code:", error?.code);
        console.error("Error details:", error?.details);
        console.error("========================");
        throw error;
      }

      console.log("Reveal inserted successfully into reveals table:", data);
      return data;
    } catch (error) {
      console.error("Failed to insert reveal into reveals table:", error);
      // Don't throw - we don't want to break the UI if this fails
    }
  };



  // Update game when new round starts
  const updateNewRoundInSupabase = async (eventData: any) => {
    try {
      console.log("=== NEW ROUND STARTED SUPABASE UPDATE ===");
      console.log("Raw event data received:", JSON.stringify(eventData, null, 2));

      const updateData = {
        game_state: 0, // zeroPhase (waiting for commit deadline to be set)
        current_round: parseInt(eventData.round),
        commit_deadline: null,
        reveal_deadline: null
      };

      console.log("Update data being sent:", JSON.stringify(updateData, null, 2));
      console.log("Updating game_id:", parseInt(eventData.gameId));

      const { data, error } = await supabase
        .from('games')
        .update(updateData)
        .eq('game_id', parseInt(eventData.gameId))
        .select();

      if (error) {
        console.error("=== NEW ROUND STARTED SUPABASE ERROR ===");
        console.error("Full error object:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("New round started updated successfully in Supabase:", data);
      return data;
    } catch (error: any) {
      console.error("Failed to update new round started in Supabase:", error);
    }
  };

  // Process prize distribution and save to database
  const updatePrizeDistributedInSupabase = async (eventData: any, transactionId?: string) => {
    try {
      const { handlePrizeDistribution } = await import('@/lib/prize-distribution-handler');
      await handlePrizeDistribution(eventData, transactionId);
      return true;
    } catch (error: any) {
      console.error("Failed to process prize distributed event:", error);
      return false;
    }
  };

  // Refetch game data
  const refetchGameData = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('game_id', parseInt(gameId))
        .single();

      if (error) throw error;
      if (data) {
        setGame(data);
        console.log("Game data refreshed:", data);
      }
    } catch (err) {
      console.error('Error refetching game data:', err);
    }
  };

  // Listen for game events using FCL native events API
  useEffect(() => {
    if (!contractAddress || !gameId) return;

    const eventTypes = [
      `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.PlayerJoined`,
      `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.VoteCommitted`,
      `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.VoteRevealed`,
      `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.NewRoundStarted`,
      `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.PrizeDistributed`
    ];

    // Use FCL's multiple event subscription API - single connection
    const unsubscribe = fcl.events({
      eventTypes: eventTypes
    }).subscribe(
      async (event) => {
        // Filter by game ID if present
        if (event.data.gameId && parseInt(event.data.gameId) !== parseInt(gameId)) {
          return;
        }

        console.log(`==== ${event.type.split('.').pop()} EVENT DETECTED ====`);
        console.log("Event type:", event.type);
        console.log("Event transaction ID:", event.transactionId);
        console.log("Event data:", event.data);
        console.log("=========================================");

        // Handle different event types
        if (event.type.includes('PlayerJoined')) {
          setPlayerJoinedEvent(event);
          await updateGamePlayerCountInSupabase(event.data);
          await insertPlayerIntoGamePlayers(event.data);

          if (event.data.player === user?.addr) {
            setHasUserJoined(true);
          }
        } else if (event.type.includes('VoteCommitted')) {
          await insertCommitIntoSupabase(event.data);
          if (event.data.player === user?.addr) {
            setHasUserCommitted(true);
          }
        } else if (event.type.includes('VoteRevealed')) {
          await insertRevealIntoSupabase(event.data);
          if (event.data.player === user?.addr) {
            setHasUserRevealed(true);
          }
        } else if (event.type.includes('NewRoundStarted')) {
          await updateNewRoundInSupabase(event.data);
        } else if (event.type.includes('PrizeDistributed')) {
          await updatePrizeDistributedInSupabase(event.data);
        }

        // Refresh game data
        await refetchGameData();
      },
      (error) => {
        console.error(`Error listening for game events:`, error);
      }
    );

    return unsubscribe;
  }, [contractAddress, gameId, user?.addr]);

  // Fetch public game data
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('game_id', parseInt(gameId))
          .single();

        if (gameError) {
          if (gameError.code === 'PGRST116') {
            setError('Game not found');
          } else {
            setError('Failed to load game details');
          }
          return;
        }

        setGame(gameData);

        // Check if current user is the creator
        if (user?.addr && gameData.creator_address === user.addr) {
          setIsCreator(true);
        }

      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to connect to database');
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [gameId, user?.addr]);

  // Check if user has joined when component mounts or user changes
  useEffect(() => {
    if (user?.addr && gameId) {
      checkIfUserHasJoined();
    }
  }, [user?.addr, gameId]);

  // Check if user has committed when component mounts, user changes, or game data changes
  useEffect(() => {
    if (user?.addr && gameId && game) {
      checkIfUserHasCommitted();
    }
  }, [user?.addr, gameId, game]);

  // Check if user has revealed when component mounts, user changes, or game data changes
  useEffect(() => {
    if (user?.addr && gameId && game) {
      checkIfUserHasRevealed();
    }
  }, [user?.addr, gameId, game]);

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

      case GameState.ProcessingRound:
        return {
          status: 'processing',
          text: 'Processing Round',
          color: 'text-purple-700 bg-purple-50 border-purple-200',
          description: 'Round results are being calculated'
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
            <h1 className="text-2xl font-bold text-red-900 mb-4">
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
                <span className="text-muted-foreground">Game #{gameId}</span>
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

                <div className="flex items-center gap-4 mb-4">
                  <h1 className="text-xl font-bold text-foreground">
                    Game #{game.game_id}
                  </h1>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getGameStatusColor(game.game_state)}`}>
                    {getGameStateName(game.game_state)}
                  </span>
                </div>

                {/* Game Creator */}
                <div className="mb-3">
                  <p className="text-sm text-muted-foreground">
                    👤 Game Creator: <code className="px-2 py-1 rounded text-xs">{game.creator_address}</code>
                  </p>
                </div>

                {/* Game Question */}
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-foreground mb-3">Game Question</h2>
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
                <div className="text-xl font-bold text-purple-600 mb-0.5">{game.total_players}</div>
                <div className="text-xs text-purple-700 font-medium">Total Players</div>
              </div>

              {/* Round */}
              <div className="text-center bg-orange-50 rounded-lg p-2 border border-orange-200">
                <div className="text-xl mb-1">🔄</div>
                <div className="text-xl font-bold text-orange-600 mb-0.5">{game.current_round}</div>
                <div className="text-xs text-orange-700 font-medium">Current Round</div>
              </div>

              {/* Prize Pool */}
              <div className="text-center bg-green-50 rounded-lg p-2 border border-green-200">
                <div className="text-xl mb-1">🏆</div>
                <div className="text-xl font-bold text-green-600 mb-0.5">
                  {(game.total_players * game.entry_fee * 0.98).toFixed(1)}
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

          {/* Row 3: Creator Info & Actions */}
          <div className="bg-card rounded-lg shadow-lg p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">

              {/* Actions Section */}
              <div className="flex-shrink-0">
                {/* Join Game Form - Show only if user can join */}
                {game.game_state === GameState.CommitPhase &&
                  game.commit_deadline &&
                  new Date() < new Date(game.commit_deadline) &&
                  user?.loggedIn &&
                  !hasUserJoined && (
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
                        className={`w-full py-3 px-4 rounded-lg transition-colors font-medium ${
                          txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
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

                {/* Player Already Joined Confirmation */}
                {game.game_state === GameState.CommitPhase &&
                  game.commit_deadline &&
                  user?.loggedIn &&
                  hasUserJoined && (
                    <div className="bg-card rounded-lg shadow-lg p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">✅ You've Joined!</h3>
                      <div className="text-center mb-4">
                        <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="font-medium mb-2">Successfully joined this game</p>
                          <p className="text-sm text-green-600">Entry fee: {game.entry_fee} FLOW paid</p>
                        </div>
                      </div>

                      <div className="text-sm text-muted-foreground space-y-2">
                        <p><strong>Next Steps:</strong></p>
                        <p>• Wait for the commit phase to begin</p>
                        <p>• Submit your vote commitment when voting opens</p>
                        <p>• Only minority voters advance to the next round</p>
                        {game.commit_deadline && new Date() < new Date(game.commit_deadline) && (
                          <p>• Voting ends: {new Date(game.commit_deadline).toLocaleString()}</p>
                        )}
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
                  hasUserJoined &&
                  !hasUserCommitted && (
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
                          className={`w-full py-3 px-4 rounded-lg transition-colors font-medium ${
                            !commitHash || txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
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
                  hasUserJoined &&
                  hasUserCommitted && (
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

                {/* Debug: Check all reveal button conditions */}
                {(() => {
                  console.log("Reveal button conditions:", {
                    gameState: game.game_state,
                    isRevealPhase: game.game_state === GameState.RevealPhase,
                    revealDeadline: game.reveal_deadline,
                    deadlineNotPassed: game.reveal_deadline && new Date() < new Date(game.reveal_deadline),
                    userLoggedIn: user?.loggedIn,
                    hasUserJoined,
                    hasUserCommitted,
                    hasNotRevealed: !hasUserRevealed,
                    allConditionsMet: (
                      game.game_state === GameState.RevealPhase &&
                      game.reveal_deadline &&
                      new Date() < new Date(game.reveal_deadline) &&
                      user?.loggedIn &&
                      hasUserJoined &&
                      hasUserCommitted &&
                      !hasUserRevealed
                    )
                  });
                  return null;
                })()}

                {/* Reveal Vote Form - Show only if user has committed and game is in reveal phase */}
                {game.game_state === GameState.RevealPhase &&
                  game.reveal_deadline &&
                  new Date() < new Date(game.reveal_deadline) &&
                  user?.loggedIn &&
                  hasUserJoined &&
                  hasUserCommitted &&
                  !hasUserRevealed && (
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
                          className={`w-full py-3 px-4 rounded-lg transition-colors font-medium ${
                            revealVote === null || revealSalt.length !== 64 || txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
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
                  hasUserJoined &&
                  hasUserCommitted &&
                  hasUserRevealed && (
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
          </div>
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
    </div>
  );
}