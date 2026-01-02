"use client";

import { useState, useEffect } from "react";
import { useFlowUser } from "@/lib/useFlowUser";
import * as fcl from "@onflow/fcl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createGameTransaction, TX_STATES } from "@/lib/transactions";

export default function CreateGamePage() {
  const { user } = useFlowUser();
  const router = useRouter();
  const [questionText, setQuestionText] = useState("");
  const [entryFee, setEntryFee] = useState("1.0");
  const [txState, setTxState] = useState(TX_STATES.IDLE);
  const [txError, setTxError] = useState(null);

  const contractAddress = process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS!;

  // Save game to Supabase
  const saveGameToSupabase = async (eventData: any) => {
    try {
      const gameData = {
        game_id: parseInt(eventData.gameId),
        question_text: eventData.questionText,
        entry_fee: parseFloat(eventData.entryFee),
        creator_address: eventData.creator,
        current_round: 1,
        game_state: parseInt(eventData.phase), // Raw enum value (0-4)
        commit_deadline: null,
        reveal_deadline: null,
        total_players: 0 // Creator must join separately
      };

      console.log("Saving game to Supabase:", gameData);

      const { data, error } = await supabase
        .from('games')
        .insert([gameData])
        .select();

      if (error) {
        console.error("Error saving game to Supabase:", error);
        throw error;
      }

      console.log("Game saved successfully to Supabase:", data);
      return data;
    } catch (error) {
      console.error("Failed to save game to Supabase:", error);
      // Don't throw - we don't want to break the UI if Supabase fails
    }
  };

  // Create game function
  const handleCreateGame = async () => {
    if (!isFormValid || !user?.loggedIn) return;

    try {
      setTxError(null);
      
      console.log("🚀 Creating game with:", { questionText, entryFee, contractAddress });

      const result = await createGameTransaction(
        questionText,
        entryFee,
        contractAddress,
        {
          onStateChange: (state, data) => {
            console.log("Transaction state:", state, data);
            setTxState(state);
          },
          onSuccess: (txId, transaction) => {
            console.log("✅ Game creation successful:", txId);
            // Event listener will handle navigation
          },
          onError: (error, txId, transaction) => {
            console.error("❌ Game creation failed:", error);
            setTxError(error.message || "Failed to create game");
            setTxState(TX_STATES.ERROR);
          }
        }
      );

      if (!result.success) {
        throw result.error;
      }

    } catch (error) {
      console.error("Create game error:", error);
      setTxError(error.message || "Failed to create game");
      setTxState(TX_STATES.ERROR);
    }
  };

  // Listen for GameCreated events using FCL native events API
  useEffect(() => {
    if (!contractAddress) return;

    const eventType = `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.GameCreated`;

    const unsubscribe = fcl.events(eventType).subscribe(
      async (event) => {
        console.log("🎯 GameCreated event received:", event);

        // Only process if the creator is the current user
        if (event.data.creator === user?.addr) {
          console.log("✅ Game created by current user, processing...");

          // Save game to Supabase
          await saveGameToSupabase(event.data);

          // Redirect to manage the new game
          router.push(`/my-games/${event.data.gameId}`);
        }
      },
      (error) => {
        console.error("❌ GameCreated event error:", error);
      }
    );

    return unsubscribe;
  }, [contractAddress, user?.addr, router]);



  if (!user?.loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-border">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Connect Wallet Required
          </h1>
          <p className="text-muted-foreground mb-6">
            Please connect your Flow wallet to create a new game.
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


  const isFormValid = questionText.trim().length > 0 && parseFloat(entryFee) > 0;
  const isCreating = txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Create New Game
            </h1>
            <p className="text-muted-foreground">
              Start a new Minority Rule game on Flow blockchain
            </p>
          </div>

          <form 
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              console.log("Form submission prevented");
            }}
          >
            {/* Question Text */}
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-foreground mb-2">
                Game Question
              </label>
              <textarea
                id="question"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="e.g., Will Bitcoin reach $100k by 2024?"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent resize-none bg-background text-foreground"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {questionText.length}/200 characters
              </p>
            </div>

            {/* Entry Fee */}
            <div>
              <label htmlFor="entryFee" className="block text-sm font-medium text-foreground mb-2">
                Entry Fee (FLOW)
              </label>
              <input
                id="entryFee"
                type="number"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                step="0.1"
                min="0.1"
                placeholder="1.0"
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 0.1 FLOW required
              </p>
            </div>

            {/* Creator Info */}
            <div className="bg-muted rounded-lg p-4">
              <h3 className="text-sm font-medium text-foreground mb-2">Game Creator</h3>
              <p className="text-xs font-mono text-muted-foreground">
                {user.addr}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleCreateGame}
              disabled={!isFormValid || isCreating}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isFormValid && !isCreating
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-400 text-gray-200 cursor-not-allowed"
              }`}
            >
              {isCreating ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {txState === TX_STATES.SUBMITTING && "Submitting..."}
                  {txState === TX_STATES.SUBMITTED && "Processing..."}
                  {txState === TX_STATES.SEALING && "Finalizing..."}
                </span>
              ) : (
                "Create Game"
              )}
            </button>

            {/* Error Display */}
            {txError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{txError}</p>
              </div>
            )}

            {/* Transaction Status */}
            {txState === TX_STATES.SUCCESS && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm">Game created successfully! Redirecting...</p>
              </div>
            )}
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <Link
              href="/"
              className="text-sm text-primary hover:text-primary/80"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}