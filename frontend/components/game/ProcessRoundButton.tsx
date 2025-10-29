'use client';

import React, { useState } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';

interface ProcessRoundButtonProps {
  gameId: string;
  currentRound: number;
  onSuccess?: () => void;
}

export function ProcessRoundButton({ gameId, currentRound, onSuccess }: ProcessRoundButtonProps) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcessRound = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Note: This uses a placeholder transaction since ProcessRound.cdc should be in the project
      const transactionCode = `
        import MinorityRuleGame from 0xMinorityRuleGame

        transaction(gameId: UInt64) {
            
            let gameManager: &{MinorityRuleGame.GameManagerPublic}
            
            prepare(signer: auth(Storage) &Account) {
                let contractAddress = Address(0xMinorityRuleGame)
                
                // Borrow the game manager from public capability
                self.gameManager = getAccount(contractAddress)
                    .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
                    ?? panic("Could not borrow game manager from public capability")
            }
            
            execute {
                // Get the game
                let game = self.gameManager.borrowGame(gameId: gameId)
                    ?? panic("Game not found")
                
                // Process the round
                game.processRound()
                
                log("Round processed for game ".concat(gameId.toString()))
            }
        }
      `;

      const transactionId = await fcl.mutate({
        cadence: transactionCode,
        args: (arg: any, t: any) => [
          arg(gameId, t.UInt64)
        ],
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      console.log('Process round transaction submitted:', transactionId);
      
      // Wait for transaction to be sealed
      const result = await fcl.tx(transactionId).onceSealed();
      console.log('Process round transaction sealed:', result);
      
      onSuccess?.();
    } catch (err: any) {
      console.error('Process round transaction failed:', err);
      setError(err.message || 'Failed to process round');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      <button
        onClick={handleProcessRound}
        disabled={processing}
        className="w-full py-3 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {processing ? 'Processing Round...' : `Process Round ${currentRound}`}
      </button>
      
      <p className="text-sm text-gray-600 text-center">
        Manually trigger round processing if automatic processing fails
      </p>
    </div>
  );
}