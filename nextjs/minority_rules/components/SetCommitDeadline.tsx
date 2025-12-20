"use client";

import { useState } from "react";
import { TransactionButton, useFlowCurrentUser } from "@onflow/react-sdk";
import { supabase } from "@/lib/supabase";

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
  const [isProcessing, setIsProcessing] = useState(false);

  const contractAddress = process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS!;

  // Update database with deadline information
  const updateDatabase = async (transactionId: string) => {
    try {
      const deadlineDate = new Date();
      deadlineDate.setHours(deadlineDate.getHours() + parseFloat(deadlineHours));
      
      const { error } = await supabase
        .from('games')
        .update({
          commit_deadline: deadlineDate.toISOString(),
          deadline_set_transaction_id: transactionId
        })
        .eq('game_id', parseInt(gameId));

      if (error) {
        console.error('Failed to update deadline in database:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Database update error:', error);
      return false;
    }
  };

  const handleSuccess = async (transactionId: string) => {
    console.log("Deadline set! Transaction ID:", transactionId);
    setIsProcessing(true);
    
    try {
      // Update database
      const dbSuccess = await updateDatabase(transactionId);
      
      if (dbSuccess) {
        // Call the success callback if provided
        onSuccess?.(transactionId);
      } else {
        // Database update failed, but blockchain transaction succeeded
        console.warn('Blockchain transaction succeeded but database update failed');
        onSuccess?.(transactionId);
      }
    } catch (error) {
      console.error('Post-transaction processing failed:', error);
      onError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleError = (error: any) => {
    console.error("Failed to set deadline:", error);
    setIsProcessing(false);
    onError?.(error);
  };

  if (!user?.loggedIn) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
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
          disabled={isProcessing}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <p className="text-xs text-gray-500 mt-1">
          Recommended: 24-72 hours for players to participate (Max: 7 days)
        </p>
      </div>

      {/* Preview */}
      {isFormValid && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-700">
            <strong>Deadline will be set to:</strong>{" "}
            {new Date(Date.now() + parseFloat(deadlineHours) * 60 * 60 * 1000).toLocaleString()}
          </p>
        </div>
      )}

      {/* Transaction Button */}
      <TransactionButton
        label={
          isProcessing 
            ? "Processing..." 
            : isFormValid 
              ? buttonText
              : "Enter valid hours"
        }
        disabled={!isFormValid || isProcessing}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          isFormValid && !isProcessing
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
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