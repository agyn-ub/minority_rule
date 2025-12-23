"use client";

import { useState } from "react";
import { TransactionButton, useFlowCurrentUser } from "@onflow/react-sdk";

// SetCommitDeadline transaction cadence
const SET_COMMIT_DEADLINE_TRANSACTION = `
import "MinorityRuleGame"

transaction(gameId: UInt64, durationSeconds: UFix64, contractAddress: Address) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Borrow the game manager from the contract account
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Get the game
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
    }
    
    execute {
        // Set commit deadline for the game (duration in seconds from now)
        self.game.setCommitDeadline(durationSeconds: durationSeconds)
        
        log("Commit deadline set for game ".concat(gameId.toString())
            .concat(" to ").concat(durationSeconds.toString()).concat(" seconds from now"))
    }
}
`;

interface SetCommitDeadlineProps {
  gameId: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: any) => void;
  className?: string;
  buttonText?: string;
}

export default function SetCommitDeadline({ 
  gameId, 
  onSuccess, 
  onError, 
  className = "",
  buttonText = "Set Commit Deadline"
}: SetCommitDeadlineProps) {
  const { user } = useFlowCurrentUser();
  const [deadlineHours, setDeadlineHours] = useState("24");

  const contractAddress = process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS!;


  const handleSuccess = (transactionId: string) => {
    console.log("Deadline set! Transaction ID:", transactionId);
    onSuccess?.(transactionId);
  };

  const handleError = (error: any) => {
    console.error("Failed to set deadline:", error);
    onError?.(error);
  };

  if (!user?.loggedIn) {
    return (
      <div className="bg-muted border border-border rounded-lg p-4">
        <p className="text-muted-foreground text-sm">
          Please connect your wallet to set commit deadline.
        </p>
      </div>
    );
  }

  const isFormValid = parseFloat(deadlineHours) > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Deadline Input */}
      <div>
        <label htmlFor="deadlineHours" className="block text-sm font-medium text-gray-700 mb-2">
          Deadline (hours from now)
        </label>
        <input
          id="deadlineHours"
          type="number"
          value={deadlineHours}
          onChange={(e) => setDeadlineHours(e.target.value)}
          min="1"
          max="168"
          step="1"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          Recommended: 24-72 hours for players to participate (Max: 7 days)
        </p>
      </div>

      {/* Preview */}
      {isFormValid && (
        <div className="bg-muted border border-border rounded-lg p-3">
          <p className="text-sm text-muted-foreground">
            <strong>Deadline will be set to:</strong>{" "}
            {new Date(Date.now() + parseFloat(deadlineHours) * 60 * 60 * 1000).toLocaleString()}
          </p>
        </div>
      )}

      {/* Transaction Button */}
      <TransactionButton
        label={
          isFormValid 
            ? buttonText
            : "Enter valid hours"
        }
        disabled={!isFormValid}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          isFormValid
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
        transaction={{
          cadence: SET_COMMIT_DEADLINE_TRANSACTION,
          args: (arg, t) => [
            arg(gameId, t.UInt64),
            arg((parseFloat(deadlineHours) * 3600).toFixed(8), t.UFix64), // Convert hours to seconds
            arg(contractAddress, t.Address),
          ],
          limit: 999,
        }}
        mutation={{
          onSuccess: handleSuccess,
          onError: handleError,
        }}
      />

      {/* Help Text */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-sm font-medium text-gray-900 mb-2">ℹ️ About Commit Deadline</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Players can join and vote until the deadline</li>
          <li>• After deadline, no new players can join</li>
          <li>• This sets the commitment phase duration</li>
          <li>• You cannot change the deadline once set</li>
        </ul>
      </div>
    </div>
  );
}