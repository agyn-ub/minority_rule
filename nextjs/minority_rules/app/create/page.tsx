"use client";

import { useState } from "react";
import { useFlowUser } from "@/lib/useFlowUser";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createGameTransaction, TX_STATES } from "@/lib/transactions";
import { supabase } from "@/lib/supabase";

export default function CreateGamePage() {
  const { user } = useFlowUser();
  const router = useRouter();
  const [questionText, setQuestionText] = useState("");
  const [entryFee, setEntryFee] = useState("1.0");
  const [txState, setTxState] = useState(TX_STATES.IDLE);
  const [txError, setTxError] = useState<string | null>(null);
  const [postTxLoading, setPostTxLoading] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);
  const [extractedGameId, setExtractedGameId] = useState<string | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS!;

  // Helper function to extract game ID from transaction
  const extractGameId = (transaction: any): string | null => {
    try {
      // Method 1: Try transaction events first (look for GameCreated event)
      if (transaction?.events) {
        for (const event of transaction.events) {
          if (event.type && event.type.includes('GameCreated') && event.data) {
            return event.data.gameId?.toString() || null;
          }
        }
      }

      // Method 2: Try logs as fallback (look for "Game created with ID: X")
      if (transaction?.events) {
        for (const event of transaction.events) {
          if (event.type && event.type.includes('log') && event.data) {
            const message = event.data.message || '';
            const match = message.match(/Game created with ID: (\d+)/);
            if (match) {
              return match[1];
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting game ID:', error);
      return null;
    }
  };



  // Create game function
  const handleCreateGame = async () => {
    if (!isFormValid || !user?.loggedIn) return;

    try {
      setTxError(null);


      const result = await createGameTransaction(
        questionText,
        entryFee,
        contractAddress,
        {
          onStateChange: (state) => {
            setTxState(state);
          },
          onSuccess: async (_, transaction) => {
            setPostTxLoading(true);
            setLastTransaction(transaction);

            try {
              // 1. Extract game ID from blockchain transaction
              const gameId = extractGameId(transaction);
              setExtractedGameId(gameId);

              if (!gameId) {
                throw new Error('Could not extract game ID from transaction');
              }

              // 2. Save game data to Supabase (creator doesn't auto-join)
              const gameData = {
                game_id: parseInt(gameId),
                question_text: questionText,
                entry_fee: parseFloat(entryFee),
                creator_address: user.addr || '',
                game_state: 0, // Zero Phase - waiting for players to join
                current_round: 1,
                total_players: 0, // No players yet - even creator hasn't joined
                created_at: new Date().toISOString(),
                commit_deadline: null,
                reveal_deadline: null
              };

              const { error } = await supabase
                .from('games')
                .insert(gameData);

              if (error) {
                throw new Error(`Database sync failed: ${error.message}`);
              }

              console.log('✅ Game saved to database successfully');

              // 3. Redirect to new game page
              setTimeout(() => {
                router.push(`/my-games/${gameId}`);
              }, 500); // Small delay to ensure database is ready

            } catch (error: any) {
              console.error('❌ Post-transaction error:', error);
              setTxError(`Game created on blockchain but sync failed: ${error.message}`);
              // Fallback redirect to my-games
              setTimeout(() => {
                router.push('/my-games');
              }, 1000);
            } finally {
              setPostTxLoading(false);
            }
          },
          onError: (error) => {
            setTxError(error.message || "Failed to create game");
            setTxState(TX_STATES.ERROR);
          }
        }
      );

      if (!result.success) {
        throw result.error;
      }

    } catch (error: any) {
      setTxError(error.message || "Failed to create game");
      setTxState(TX_STATES.ERROR);
    }
  };


  if (!user?.loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-border">
          <h1 className="scroll-m-20 font-extrabold tracking-tight mb-4">
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
  const isCreating = txState === TX_STATES.SUBMITTING || txState === TX_STATES.SUBMITTED || txState === TX_STATES.SEALING || postTxLoading;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
          <div className="mb-6">
            <h1 className="scroll-m-20 font-extrabold tracking-tight mb-2">
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
              <p className="text-xs font-mono text-muted-foreground mb-2">
                {user.addr}
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleCreateGame}
              disabled={!isFormValid || isCreating}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${isFormValid && !isCreating
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
                  {postTxLoading && "Saving to database..."}
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