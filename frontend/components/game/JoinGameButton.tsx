'use client';

import { useState } from 'react';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { JOIN_GAME } from '@/lib/flow/cadence/transactions/JoinGame';
import { useRouter } from 'next/navigation';

interface JoinGameButtonProps {
  gameId: string;
  entryFee: string;
}

export function JoinGameButton({ gameId, entryFee }: JoinGameButtonProps) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setIsJoining(true);
    setError(null);

    try {
      const transactionId = await fcl.mutate({
        cadence: JOIN_GAME,
        args: (arg: any, t: any) => [
          arg(gameId, t.UInt64)
        ],
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      console.log('Join transaction submitted:', transactionId);
      
      // Wait for transaction to be sealed
      const result = await fcl.tx(transactionId).onceSealed();
      console.log('Join transaction sealed:', result);
      
      router.refresh();
    } catch (err: any) {
      console.error('Join transaction failed:', err);
      setError(err.message || 'Failed to join game');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}
      
      <button
        onClick={handleJoin}
        disabled={isJoining}
        className="w-full py-3 px-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold"
      >
        {isJoining ? 'Joining...' : `Join Game (${entryFee} FLOW)`}
      </button>
      
      <p className="mt-2 text-sm text-gray-600">
        Join now to participate in Round 1 voting!
      </p>
    </div>
  );
}