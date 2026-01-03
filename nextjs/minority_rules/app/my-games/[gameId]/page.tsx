"use client";
import { useFlowUser } from "@/lib/useFlowUser";
import * as fcl from "@onflow/fcl";

import { useState, useEffect } from "react";
// React SDK removed - using FCL directly
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Game } from "@/lib/supabase";
import {
  setCommitDeadlineTransaction,
  setRevealDeadlineTransaction,
  processRoundTransaction,
  TX_STATES
} from "@/lib/transactions";

// Helper functions
const getGameStateName = (state: number): string => {
  switch (state) {
    case 0: return "Zero Phase";
    case 1: return "Commit Phase";
    case 2: return "Reveal Phase";
    case 3: return "Processing Round";
    case 4: return "Completed";
    default: return "Unknown";
  }
};

const getStateColor = (state: number): string => {
  switch (state) {
    case 0: return "bg-gray-100 text-gray-800";
    case 1: return "bg-blue-100 text-blue-800";
    case 2: return "bg-yellow-100 text-yellow-800";
    case 3: return "bg-orange-100 text-orange-800";
    case 4: return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export default function MyGameDetailsPage() {
  const { user } = useFlowUser();
  const params = useParams();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commitDuration, setCommitDuration] = useState("3600"); // 1 hour default
  const [revealDuration, setRevealDuration] = useState("1800"); // 30 minutes default

  // Transaction state management
  const [txState, setTxState] = useState(TX_STATES.IDLE);
  const [txError, setTxError] = useState<string | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS!;

  // Transaction execution functions
  const handleSetCommitDeadline = async () => {
    if (!commitDuration || !user?.loggedIn) return;

    try {
      setTxError(null);
      console.log("🚀 Setting commit deadline:", { gameId, commitDuration, contractAddress });

      const result = await setCommitDeadlineTransaction(
        gameId,
        commitDuration,
        contractAddress,
        {
          onStateChange: (state: string, data?: any) => {
            console.log("Transaction state:", state, data);
            setTxState(state);
          },
          onSuccess: (txId: string, transaction: any) => {
            console.log("✅ Commit deadline set successfully:", txId);
          },
          onError: (error: any, txId?: string, transaction?: any) => {
            console.error("❌ Failed to set commit deadline:", error);
            setTxError(error.message || "Failed to set commit deadline");
            setTxState(TX_STATES.ERROR);
          }
        }
      );

      if (!result.success) {
        throw result.error;
      }
    } catch (error: any) {
      console.error("Set commit deadline error:", error);
      setTxError(error.message || "Failed to set commit deadline");
      setTxState(TX_STATES.ERROR);
    }
  };

  const handleSetRevealDeadline = async () => {
    if (!revealDuration || !user?.loggedIn) return;

    try {
      setTxError(null);
      console.log("🚀 Setting reveal deadline:", { gameId, revealDuration, contractAddress });

      const result = await setRevealDeadlineTransaction(
        gameId,
        revealDuration,
        contractAddress,
        {
          onStateChange: (state: string, data?: any) => {
            console.log("Transaction state:", state, data);
            setTxState(state);
          },
          onSuccess: (txId: string, transaction: any) => {
            console.log("✅ Reveal deadline set successfully:", txId);
          },
          onError: (error: any, txId?: string, transaction?: any) => {
            console.error("❌ Failed to set reveal deadline:", error);
            setTxError(error.message || "Failed to set reveal deadline");
            setTxState(TX_STATES.ERROR);
          }
        }
      );

      if (!result.success) {
        throw result.error;
      }
    } catch (error: any) {
      console.error("Set reveal deadline error:", error);
      setTxError(error.message || "Failed to set reveal deadline");
      setTxState(TX_STATES.ERROR);
    }
  };

  const handleProcessRound = async () => {
    if (!user?.loggedIn) return;

    try {
      setTxError(null);
      console.log("🚀 Processing round:", { gameId, contractAddress });

      const result = await processRoundTransaction(
        gameId,
        contractAddress,
        {
          onStateChange: (state: string, data?: any) => {
            console.log("Transaction state:", state, data);
            setTxState(state);
          },
          onSuccess: (txId: string, transaction: any) => {
            console.log("✅ Round processed successfully:", txId);
          },
          onError: (error: any, txId?: string, transaction?: any) => {
            console.error("❌ Failed to process round:", error);
            setTxError(error.message || "Failed to process round");
            setTxState(TX_STATES.ERROR);
          }
        }
      );

      if (!result.success) {
        throw result.error;
      }
    } catch (error: any) {
      console.error("Process round error:", error);
      setTxError(error.message || "Failed to process round");
      setTxState(TX_STATES.ERROR);
    }
  };

  // Update game commit deadline in Supabase
  const updateGameCommitDeadlineInSupabase = async (eventData: any) => {
    try {
      console.log("=== COMMIT DEADLINE SUPABASE UPDATE ===");
      console.log("Raw event data received:", JSON.stringify(eventData, null, 2));

      const updateData = {
        game_state: 1, // commitPhase
        commit_deadline: new Date(parseFloat(eventData.deadline) * 1000).toISOString(),
        current_round: parseInt(eventData.round)
      };

      console.log("Update data being sent:", JSON.stringify(updateData, null, 2));
      console.log("Updating game_id:", parseInt(eventData.gameId));

      const { data, error } = await supabase
        .from('games')
        .update(updateData)
        .eq('game_id', parseInt(eventData.gameId))
        .select();

      if (error) {
        console.error("=== COMMIT DEADLINE SUPABASE ERROR ===");
        console.error("Full error object:", JSON.stringify(error, null, 2));
        console.error("Error message:", error?.message);
        console.error("Error code:", error?.code);
        console.error("Error details:", error?.details);
        console.error("Error hint:", error?.hint);
        console.error("==========================================");
        throw error;
      }

      console.log("Commit deadline updated successfully in Supabase:", data);
      return data;
    } catch (error: any) {
      console.error("Failed to update commit deadline in Supabase:", error);
      // Don't throw - we don't want to break the UI if Supabase fails
    }
  };

  // Update game reveal deadline in Supabase
  const updateGameRevealDeadlineInSupabase = async (eventData: any) => {
    try {
      console.log("=== REVEAL DEADLINE SUPABASE UPDATE ===");
      console.log("Raw event data received:", JSON.stringify(eventData, null, 2));

      const updateData = {
        game_state: 2, // revealPhase
        reveal_deadline: new Date(parseFloat(eventData.deadline) * 1000).toISOString(),
        current_round: parseInt(eventData.round)
      };

      console.log("Update data being sent:", JSON.stringify(updateData, null, 2));
      console.log("Updating game_id:", parseInt(eventData.gameId));

      const { data, error } = await supabase
        .from('games')
        .update(updateData)
        .eq('game_id', parseInt(eventData.gameId))
        .select();

      if (error) {
        console.error("=== REVEAL DEADLINE SUPABASE ERROR ===");
        console.error("Full error object:", JSON.stringify(error, null, 2));
        console.error("Error message:", error?.message);
        console.error("Error code:", error?.code);
        console.error("Error details:", error?.details);
        console.error("Error hint:", error?.hint);
        console.error("=========================================");
        throw error;
      }

      console.log("Reveal deadline updated successfully in Supabase:", data);
      return data;
    } catch (error: any) {
      console.error("Failed to update reveal deadline in Supabase:", error);
      // Don't throw - we don't want to break the UI if Supabase fails
    }
  };

  // Update game when round is completed
  const updateRoundCompletedInSupabase = async (eventData: any) => {
    try {
      console.log("=== ROUND COMPLETED SUPABASE UPDATE ===");
      console.log("Raw event data received:", JSON.stringify(eventData, null, 2));

      // First insert round data into rounds table
      const roundData = {
        game_id: parseInt(eventData.gameId),
        round_number: parseInt(eventData.round),
        yes_count: parseInt(eventData.yesCount),
        no_count: parseInt(eventData.noCount),
        minority_vote: eventData.minorityVote,
        votes_remaining: parseInt(eventData.votesRemaining)
      };

      console.log("Inserting round data:", JSON.stringify(roundData, null, 2));

      const { data: roundInsertData, error: roundError } = await supabase
        .from('rounds')
        .insert(roundData)
        .select();

      if (roundError) {
        console.error("=== ROUND INSERT ERROR ===");
        console.error("Full error object:", JSON.stringify(roundError, null, 2));
        throw roundError;
      }

      console.log("Round data inserted successfully:", roundInsertData);

      // Then update game state
      const updateData = {
        game_state: 3, // processingRound
        current_round: parseInt(eventData.round)
      };

      console.log("Updating game state:", JSON.stringify(updateData, null, 2));

      const { data, error } = await supabase
        .from('games')
        .update(updateData)
        .eq('game_id', parseInt(eventData.gameId))
        .select();

      if (error) {
        console.error("=== ROUND COMPLETED SUPABASE ERROR ===");
        console.error("Full error object:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("Round completed updated successfully in Supabase:", data);
      return { gameData: data, roundData: roundInsertData };
    } catch (error: any) {
      console.error("Failed to update round completed in Supabase:", error);
    }
  };

  // Update game when game is completed
  const updateGameCompletedInSupabase = async (eventData: any) => {
    try {
      console.log("=== GAME COMPLETED SUPABASE UPDATE ===");
      console.log("Raw event data received:", JSON.stringify(eventData, null, 2));

      const updateData = {
        game_state: 4, // completed
        total_rounds: parseInt(eventData.totalRounds)
      };

      console.log("Update data being sent:", JSON.stringify(updateData, null, 2));
      console.log("Updating game_id:", parseInt(eventData.gameId));

      const { data, error } = await supabase
        .from('games')
        .update(updateData)
        .eq('game_id', parseInt(eventData.gameId))
        .select();

      if (error) {
        console.error("=== GAME COMPLETED SUPABASE ERROR ===");
        console.error("Full error object:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("Game completed updated successfully in Supabase:", data);
      return data;
    } catch (error: any) {
      console.error("Failed to update game completed in Supabase:", error);
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

  // Log prize distribution (for tracking purposes)
  const updatePrizeDistributedInSupabase = async (eventData: any) => {
    try {
      console.log("=== PRIZE DISTRIBUTED EVENT ===");
      console.log("Raw event data received:", JSON.stringify(eventData, null, 2));

      // Just log the prize distribution - could be stored in a separate table if needed
      console.log(`Prize distributed: ${eventData.amount} FLOW to ${eventData.winner} for game ${eventData.gameId}`);
      
      return true;
    } catch (error: any) {
      console.error("Failed to process prize distributed event:", error);
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

  // Listen for game management events using FCL native events API
  useEffect(() => {
    if (!contractAddress || !gameId) return;

    const eventTypes = [
      `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.CommitDeadlineSet`,
      `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.RevealDeadlineSet`,
      `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.RoundCompleted`,
      `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.GameCompleted`,
      `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.NewRoundStarted`,
      `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.PrizeDistributed`
    ];

    const unsubscribes = eventTypes.map(eventType =>
      fcl.events(eventType).subscribe(
        async (event) => {
          // Filter by game ID
          if (event.data.gameId && parseInt(event.data.gameId) !== parseInt(gameId)) {
            return;
          }

          console.log(`==== GAME ${gameId} EVENT DETECTED ====`);
          console.log("Event type:", eventType);
          console.log("Event transaction ID:", event.transactionId);
          console.log("Event data:", event.data);
          console.log("=========================================");

          // Handle different event types
          if (eventType.includes('CommitDeadlineSet')) {
            await updateGameCommitDeadlineInSupabase(event.data);
          } else if (eventType.includes('RevealDeadlineSet')) {
            await updateGameRevealDeadlineInSupabase(event.data);
          } else if (eventType.includes('RoundCompleted')) {
            await updateRoundCompletedInSupabase(event.data);
          } else if (eventType.includes('GameCompleted')) {
            await updateGameCompletedInSupabase(event.data);
          } else if (eventType.includes('NewRoundStarted')) {
            await updateNewRoundInSupabase(event.data);
          } else if (eventType.includes('PrizeDistributed')) {
            await updatePrizeDistributedInSupabase(event.data);
          }

          // Refresh game data
          await refetchGameData();
        },
        (error) => {
          console.error(`Error listening for game ${gameId} events:`, error);
        }
      )
    );

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [contractAddress, gameId]);

  // Fetch game details
  useEffect(() => {
    const fetchGame = async () => {
      if (!gameId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('game_id', parseInt(gameId))
          .single();

        if (error) throw error;
        if (!data) throw new Error('Game not found');

        setGame(data);
      } catch (err) {
        console.error('Error fetching game:', err);
        setError('Failed to load game details');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

  // Check if current user is the game creator
  const isGameOwner = user?.addr && game?.creator_address === user.addr;

  if (!user?.loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-border">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Connect Wallet Required
          </h1>
          <p className="text-muted-foreground mb-6">
            Please connect your Flow wallet to view games.
          </p>
          <Link
            href="/"
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-center block"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading game details...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-border text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Game Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || "The requested game could not be found."}
          </p>
          <Link
            href="/my-games"
            className="bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to My Games
          </Link>
        </div>
      </div>
    );
  }

  if (!isGameOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-border text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Access Denied
          </h1>
          <p className="text-muted-foreground mb-6">
            You can only manage games that you created.
          </p>
          <div className="flex gap-2">
            <Link
              href="/my-games"
              className="flex-1 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg hover:bg-secondary/90 transition-colors text-center"
            >
              Your Games
            </Link>
            <Link
              href={`/games/${gameId}`}
              className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-center"
            >
              View Game
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/my-games"
              className="text-primary hover:text-primary/80 text-sm"
            >
              ← My Games
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">Game #{gameId}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Game Details
          </h1>
          <p className="text-muted-foreground">
            Configure and control your game settings
          </p>
        </div>

        {/* Game Overview */}
        <div className="bg-card rounded-lg shadow-lg border border-border p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Game #{game.game_id}
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStateColor(game.game_state)}`}>
                {getGameStateName(game.game_state)}
              </span>
            </div>
            <Link
              href={`/games/${gameId}`}
              className="bg-secondary text-secondary-foreground py-2 px-4 rounded-lg hover:bg-secondary/90 transition-colors"
            >
              View Game
            </Link>
          </div>

          <div className="bg-muted rounded-lg p-4 mb-4">
            <h3 className="font-medium text-foreground mb-2">Question:</h3>
            <p className="text-muted-foreground">{game.question_text}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-muted-foreground text-sm">Entry Fee:</span>
              <p className="font-semibold">{game.entry_fee} FLOW</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Round:</span>
              <p className="font-semibold">{game.current_round}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Players:</span>
              <p className="font-semibold">{game.total_players}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Created:</span>
              <p className="font-semibold">
                {new Date(game.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Phase Management */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Set Commit Deadline */}
          {game.game_state === 0 && (
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Start Commit Phase
              </h3>
              <p className="text-muted-foreground mb-4">
                Set the duration for players to submit their vote commitments.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={commitDuration}
                  onChange={(e) => setCommitDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                  placeholder="3600"
                  min="60"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.floor(parseInt(commitDuration || "0") / 60)} minutes
                </p>
              </div>

              <button
                onClick={handleSetCommitDeadline}
                disabled={!commitDuration || txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING}
                className={`w-full py-2 px-4 rounded-lg transition-colors ${!commitDuration || txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
              >
                {txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
                  ? "Setting Deadline..."
                  : "Set Commit Deadline"
                }
              </button>
            </div>
          )}

          {/* Commit Deadline Display - Show when deadline is set */}
          {game.game_state === 1 && game.commit_deadline && (
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                ✅ Commit Phase Active
              </h3>
              <p className="text-muted-foreground mb-4">
                Players can now submit their vote commitments until the deadline.
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Commit Deadline:</span>
                  <span className="font-medium">
                    {new Date(game.commit_deadline).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time Remaining:</span>
                  <span className="font-medium text-orange-600">
                    {new Date(game.commit_deadline) > new Date()
                      ? `${Math.ceil((new Date(game.commit_deadline).getTime() - new Date().getTime()) / 1000 / 60)} minutes`
                      : 'Deadline passed'
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Round:</span>
                  <span className="font-medium">{game.current_round}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700 font-medium">Next Step:</p>
                <p className="text-xs text-blue-600 mt-1">
                  Once the commit deadline passes, set the reveal deadline to allow players to reveal their votes.
                </p>
              </div>
            </div>
          )}

          {/* Set Reveal Deadline - Show only when commit deadline has passed and reveal deadline not set */}
          {game.game_state === 1 && 
           game.commit_deadline && 
           new Date() > new Date(game.commit_deadline) && 
           !game.reveal_deadline && (
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Start Reveal Phase
              </h3>
              <p className="text-muted-foreground mb-4">
                Set the duration for players to reveal their votes.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={revealDuration}
                  onChange={(e) => setRevealDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                  placeholder="1800"
                  min="60"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.floor(parseInt(revealDuration || "0") / 60)} minutes
                </p>
              </div>

              <button
                onClick={handleSetRevealDeadline}
                disabled={!revealDuration || txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING}
                className={`w-full py-2 px-4 rounded-lg transition-colors ${!revealDuration || txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-yellow-600 text-white hover:bg-yellow-700"
                  }`}
              >
                {txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
                  ? "Setting Deadline..."
                  : "Set Reveal Deadline"
                }
              </button>
            </div>
          )}

          {/* Reveal Deadline Display - Show when reveal deadline is set */}
          {game.game_state === 2 && game.reveal_deadline && (
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                ✅ Reveal Phase Active
              </h3>
              <p className="text-muted-foreground mb-4">
                Players can now reveal their vote commitments until the deadline.
              </p>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reveal Deadline:</span>
                  <span className="font-medium">
                    {new Date(game.reveal_deadline).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Time Remaining:</span>
                  <span className="font-medium text-yellow-600">
                    {new Date(game.reveal_deadline) > new Date()
                      ? `${Math.ceil((new Date(game.reveal_deadline).getTime() - new Date().getTime()) / 1000 / 60)} minutes`
                      : 'Deadline passed'
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Round:</span>
                  <span className="font-medium">{game.current_round}</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-700 font-medium">Next Step:</p>
                <p className="text-xs text-yellow-600 mt-1">
                  Once the reveal deadline passes, process the round to calculate results and advance to the next phase.
                </p>
              </div>
            </div>
          )}

          {/* Process Round */}
          {game.game_state === 2 && (
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Process Round
              </h3>
              <p className="text-muted-foreground mb-4">
                Calculate results and advance to next round or end game.
              </p>

              <button
                onClick={handleProcessRound}
                disabled={txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING}
                className={`w-full py-2 px-4 rounded-lg transition-colors ${txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
                    ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                    : "bg-orange-600 text-white hover:bg-orange-700"
                  }`}
              >
                {txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING
                  ? "Processing..."
                  : "Process Round"
                }
              </button>
            </div>
          )}

          {/* Game Completed */}
          {game.game_state === 4 && (
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                🎉 Game Completed
              </h3>
              <p className="text-muted-foreground mb-4">
                This game has finished and prizes have been distributed.
              </p>
              <Link
                href={`/games/${gameId}`}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-center block"
              >
                View Final Results
              </Link>
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
      </div>
    </div>
  );
}