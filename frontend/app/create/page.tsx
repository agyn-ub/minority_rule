'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { CREATE_GAME } from '@/lib/flow/cadence/transactions/CreateGame';
import { useFlowUser } from '@/hooks/useFlowUser';
import Link from 'next/link';

export default function CreateGamePage() {
  const router = useRouter();
  const { user } = useFlowUser();
  const [questionText, setQuestionText] = useState('');
  const [entryFee, setEntryFee] = useState('10.0');
  const [roundDuration, setRoundDuration] = useState('3600'); // 1 hour in seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.addr) {
      setError('Please connect your wallet first');
      return;
    }

    if (!questionText.trim()) {
      setError('Please enter a question');
      return;
    }

    const fee = parseFloat(entryFee);
    if (isNaN(fee) || fee <= 0) {
      setError('Please enter a valid entry fee');
      return;
    }

    const duration = parseFloat(roundDuration);
    if (isNaN(duration) || duration <= 0) {
      setError('Please enter a valid round duration');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const transactionId = await fcl.mutate({
        cadence: CREATE_GAME,
        args: (arg: any, t: any) => [
          arg(questionText, t.String),
          arg(fee.toFixed(8), t.UFix64),
          arg(duration.toFixed(1), t.UFix64)
        ],
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      console.log('Transaction submitted:', transactionId);
      
      // Wait for transaction to be sealed
      const result = await fcl.tx(transactionId).onceSealed();
      console.log('Transaction sealed:', result);
      
      router.push('/');
    } catch (err: any) {
      console.error('Transaction failed:', err);
      setError(err.message || 'Failed to create game');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-gray-900">
              ← Back to Games
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6">Create New Game</h1>
          
          {!user?.addr ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-yellow-800">Please connect your wallet to create a game.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="question" className="block text-sm font-medium text-gray-700">
                  Question
                </label>
                <input
                  type="text"
                  id="question"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  placeholder="e.g., Is the sky blue?"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Players will vote YES or NO on this question
                </p>
              </div>

              <div>
                <label htmlFor="entryFee" className="block text-sm font-medium text-gray-700">
                  Entry Fee (FLOW)
                </label>
                <input
                  type="number"
                  id="entryFee"
                  value={entryFee}
                  onChange={(e) => setEntryFee(e.target.value)}
                  step="0.1"
                  min="0.1"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Players must pay this amount to join the game
                </p>
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                  Round Duration (seconds)
                </label>
                <input
                  type="number"
                  id="duration"
                  value={roundDuration}
                  onChange={(e) => setRoundDuration(e.target.value)}
                  step="60"
                  min="60"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Time limit for each voting round (3600 = 1 hour)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Total Cost:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Entry Fee: {entryFee} FLOW</li>
                  <li>• Scheduling Fund: 1.0 FLOW</li>
                  <li className="font-semibold">• Total: {(parseFloat(entryFee) + 1.0).toFixed(1)} FLOW</li>
                </ul>
                <p className="mt-2 text-xs text-blue-700">
                  The scheduling fund is used to automatically process rounds
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !user?.addr}
                className="w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Game'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}