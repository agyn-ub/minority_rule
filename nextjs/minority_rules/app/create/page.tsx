"use client";

import { useState } from "react";
import { TransactionButton, useFlowCurrentUser, useFlowEvents } from "@onflow/react-sdk";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const [gameCreatedEvent, setGameCreatedEvent] = useState<any>(null);

  const contractAddress = process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS!;

  // Create validated event type
  const eventType = contractAddress
    ? `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.GameCreated`
    : null;

  // Listen for GameCreated events from our contract (with enhanced logging)
  if (eventType && contractAddress) {
    useFlowEvents({
      eventTypes: [eventType],
      startHeight: 0,
      onEvent: async (event) => {
        console.log("==== GAMECREATED EVENT DETECTED ====");
        console.log("Event type:", event.type);
        console.log("Event transaction ID:", event.transactionId);
        console.log("Event data:", event.data);
        console.log("Full event object:", event);
        console.log("=====================================");

        // Store the latest event for display
        setGameCreatedEvent(event);

        const gameId = event.data.gameId;
        console.log("Extracted real game ID from event:", gameId);

      },
      onError: (error) => {
        console.error("Error listening for GameCreated events:", error);
      }
    });
  }

  // Generate block explorer URL for transaction
  const getBlockExplorerUrl = (transactionId: string) => {
    return `https://testnet.flowscan.io/transaction/${transactionId}`;
  };


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

  // Show success screen after game creation
  if (gameCreatedEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-border">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            🎉 Game Created!
          </h1>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <strong className="text-green-700">Game ID:</strong>
                <p className="font-mono text-green-600">{gameCreatedEvent.data.gameId}</p>
              </div>
              <div>
                <strong className="text-green-700">Entry Fee:</strong>
                <p className="font-mono text-green-600">{gameCreatedEvent.data.entryFee} FLOW</p>
              </div>
              <div className="col-span-2">
                <strong className="text-green-700">Creator:</strong>
                <p className="font-mono text-green-600 break-all">{gameCreatedEvent.data.creator}</p>
              </div>
            </div>
            <div className="mt-3">
              <strong className="text-green-700">Question:</strong>
              <p className="text-green-600">{gameCreatedEvent.data.questionText}</p>
            </div>
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
              className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-center text-sm"
            >
              View Games
            </Link>
            <button
              onClick={() => {
                setQuestionText("");
                setEntryFee("1.0");
                setGameCreatedEvent(null);
              }}
              className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-sm"
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

          <form className="space-y-6">
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
            <TransactionButton
              label="Create Game"
              className=
              "w-full py-3 px-4 rounded-lg font-medium transition-colors"
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
                onSuccess: (transactionId) => {
                  console.log("Game created! Transaction ID:", transactionId);
                },
                onError: (error) => {
                  console.error("Game creation failed:", error);
                  alert("Failed to create game. Please try again.");
                },
              }}
            />
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