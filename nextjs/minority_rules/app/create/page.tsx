"use client";

import { useState } from "react";
import { TransactionButton, useFlowCurrentUser } from "@onflow/react-sdk";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SetCommitDeadline from "@/components/SetCommitDeadline";

// CreateGame transaction cadence
const CREATE_GAME_TRANSACTION = `
import "MinorityRuleGame"
import "FungibleToken"
import "FlowToken"

transaction(questionText: String, entryFee: UFix64, contractAddress: Address) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let gameId: UInt64
    let creator: Address
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.creator = signer.address
        
        // Borrow the game manager from the contract account
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Create the game
        self.gameId = self.gameManager.createGame(
            questionText: questionText,
            entryFee: entryFee,
            creator: self.creator
        )
    }
    
    execute {
        log("Game created with ID: ".concat(self.gameId.toString()))
        log("Creator: ".concat(self.creator.toString()))
        log("Game is now ready - players can join and vote")
        log("Manual processing: Use EndCommitPhase and ProcessRound transactions when needed")
    }
}
`;

export default function CreateGamePage() {
  const { user } = useFlowCurrentUser();
  const [questionText, setQuestionText] = useState("");
  const [entryFee, setEntryFee] = useState("1.0");
  const [createdGameId, setCreatedGameId] = useState<string | null>(null);
  const [isWritingToDatabase, setIsWritingToDatabase] = useState(false);
  const [dbWriteError, setDbWriteError] = useState<string | null>(null);
  const [deadlineSet, setDeadlineSet] = useState(false);
  const [actualGameId, setActualGameId] = useState<string | null>(null);

  const contractAddress = process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS!;

  // Generate block explorer URL for transaction
  const getBlockExplorerUrl = (transactionId: string) => {
    return `https://testnet.flowscan.io/transaction/${transactionId}`;
  };

  // Function to write game data to Supabase
  const writeGameToDatabase = async (gameData: {
    gameId: string;
    transactionId: string;
    questionText: string;
    entryFee: number;
    creatorAddress: string;
  }) => {
    setIsWritingToDatabase(true);
    setDbWriteError(null);

    try {
      const { error } = await supabase
        .from('games')
        .insert({
          game_id: parseInt(gameData.gameId),
          question_text: gameData.questionText,
          entry_fee: gameData.entryFee,
          creator_address: gameData.creatorAddress,
          current_round: 1,
          game_state: 'commit_phase',
          total_players: 0,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Supabase error:', error);
        setDbWriteError('Failed to save game to database');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Database write error:', error);
      setDbWriteError('Database connection failed');
      return false;
    } finally {
      setIsWritingToDatabase(false);
    }
  };

  if (!user?.loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Wallet Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please connect your Flow wallet to create a new game.
          </p>
          <Link
            href="/"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center block"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (createdGameId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-green-900 mb-4">
            🎉 Game Created!
          </h1>
          
          {!deadlineSet ? (
            <>
              <p className="text-gray-600 mb-4">
                Your game has been created! Now set the commit deadline to allow players to start voting.
              </p>
              
              {/* Deadline Setting Form */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-900 mb-4">
                  ⏰ Set Commit Deadline
                </h3>
                
                <SetCommitDeadline
                  gameId={actualGameId || "1"}
                  onSuccess={(transactionId) => {
                    console.log('Deadline set successfully:', transactionId);
                    setDeadlineSet(true);
                  }}
                  onError={(error) => {
                    console.error('Failed to set deadline:', error);
                    alert('Failed to set deadline. Please try again.');
                  }}
                  className="bg-white rounded-lg p-4"
                  buttonText="Set Commit Deadline"
                />
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-4">
                Your game has been successfully created and configured! Players can now join and vote.
              </p>
              
              {/* Completion status */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-green-900 mb-2">
                  ✅ Setup Complete
                </h3>
                <div className="space-y-1 text-sm text-green-700">
                  <p>✅ Game created on blockchain</p>
                  <p>✅ Saved to database</p>
                  <p>✅ Commit deadline set</p>
                </div>
              </div>
            </>
          )}
          
          <p className="text-xs text-gray-500 mb-6">
            Use the block explorer link below to verify the transaction on Flow testnet and see the actual blockchain status.
          </p>
          
          <div className="space-y-3 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 mb-2">
                <strong>✅ Blockchain:</strong> Transaction confirmed
              </p>
              <p className="text-xs font-mono text-green-600 mb-3">
                {createdGameId}
              </p>
              <a
                href={getBlockExplorerUrl(createdGameId)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                🔗 View on Block Explorer
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
            
            {dbWriteError ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">
                  <strong>⚠️ Database:</strong> {dbWriteError}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Game exists on blockchain but may not appear in UI immediately
                </p>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">
                  <strong>✅ Database:</strong> Game saved successfully
                </p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-center text-sm"
            >
              Home
            </Link>
            <Link
              href="/games"
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-center text-sm"
            >
              View Games
            </Link>
            <button
              onClick={() => {
                setCreatedGameId(null);
                setQuestionText("");
                setEntryFee("1.0");
                setDbWriteError(null);
                setIsWritingToDatabase(false);
                setDeadlineSet(false);
                setActualGameId(null);
              }}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isFormValid = questionText.trim().length > 0 && parseFloat(entryFee) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Create New Game
            </h1>
            <p className="text-gray-600">
              Start a new Minority Rule game on Flow blockchain
            </p>
          </div>

          <form className="space-y-6">
            {/* Question Text */}
            <div>
              <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-2">
                Game Question
              </label>
              <textarea
                id="question"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="e.g., Will Bitcoin reach $100k by 2024?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {questionText.length}/200 characters
              </p>
            </div>

            {/* Entry Fee */}
            <div>
              <label htmlFor="entryFee" className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 0.1 FLOW required
              </p>
            </div>

            {/* Creator Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Game Creator</h3>
              <p className="text-xs font-mono text-gray-600">
                {user.addr}
              </p>
            </div>

            {/* Database status */}
            {isWritingToDatabase && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  💾 Saving game to database...
                </p>
              </div>
            )}

            {/* Submit Button */}
            <TransactionButton
              label={
                isWritingToDatabase 
                  ? "Saving to Database..." 
                  : isFormValid 
                    ? "Create Game on Blockchain" 
                    : "Please fill all fields"
              }
              disabled={!isFormValid || isWritingToDatabase}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                isFormValid && !isWritingToDatabase
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              transaction={{
                cadence: CREATE_GAME_TRANSACTION,
                args: (arg, t) => [
                  arg(questionText.trim(), t.String),
                  arg(parseFloat(entryFee).toFixed(8), t.UFix64),
                  arg(contractAddress, t.Address),
                ],
                limit: 999,
              }}
              mutation={{
                onSuccess: async (transactionId) => {
                  console.log("Game created! Transaction ID:", transactionId);
                  
                  // For MVP, we'll generate a simple game ID based on timestamp
                  // In production, this should be extracted from blockchain events
                  const gameId = Date.now().toString();
                  
                  // Store the actual game ID for deadline setting
                  setActualGameId(gameId);
                  
                  // Write to Supabase database
                  const dbSuccess = await writeGameToDatabase({
                    gameId,
                    transactionId,
                    questionText: questionText.trim(),
                    entryFee: parseFloat(entryFee),
                    creatorAddress: user.addr,
                  });

                  if (dbSuccess) {
                    setCreatedGameId(transactionId);
                  }
                  // If database write fails, we still show success since blockchain succeeded
                  // User can see the error message but game is created on-chain
                },
                onError: (error) => {
                  console.error("Game creation failed:", error);
                  alert("Failed to create game. Please try again.");
                },
              }}
            />
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}