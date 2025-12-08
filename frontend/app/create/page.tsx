'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { createGameTransaction } from '@/lib/flow/transactions';
import { useFlowUser } from '@/hooks/useFlowUser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';

export default function CreateGamePage() {
  const router = useRouter();
  const { user } = useFlowUser();
  const [questionText, setQuestionText] = useState('');
  const [entryFee, setEntryFee] = useState('10.0');
  const [gameId, setGameId] = useState<string | null>(null);
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

    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Creating game with:', { questionText, fee: fee.toFixed(8) });
      
      const transactionId = await fcl.mutate({
        ...createGameTransaction(questionText, fee.toFixed(8)),
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      console.log('Transaction submitted:', transactionId);
      
      // Wait for transaction to be sealed
      const result = await fcl.tx(transactionId).onceSealed();
      console.log('Transaction sealed:', result);
      
      // Extract game ID from events if available
      const gameCreatedEvent = result.events.find((e: any) => e.type.includes('GameCreated'));
      if (gameCreatedEvent) {
        const extractedGameId = gameCreatedEvent.data.gameId;
        setGameId(extractedGameId);
        console.log('Game created successfully with ID:', extractedGameId);
        // Redirect to game settings page
        router.push(`/game/${extractedGameId}/settings`);
      } else {
        console.warn('No GameCreated event found, redirecting to home');
        router.push('/');
      }
    } catch (err: any) {
      console.error('Transaction failed:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create game';
      if (err.message) {
        if (err.message.includes('network') || err.message.includes('connection')) {
          errorMessage = 'Network connection error. Please check your connection and try again.';
        } else if (err.message.includes('authorization') || err.message.includes('wallet')) {
          errorMessage = 'Wallet authorization failed. Please check your wallet connection.';
        } else if (err.message.includes('insufficient')) {
          errorMessage = 'Insufficient funds. Please ensure you have enough FLOW tokens.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
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
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create New Game</CardTitle>
            <CardDescription>
              Set up a new Minority Rule game for players to join
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!user?.addr ? (
              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6">
                  <p className="text-yellow-800">Please connect your wallet to create a game.</p>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="question">Question</Label>
                  <Input
                    id="question"
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="e.g., Is the sky blue?"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Players will vote YES or NO on this question
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entryFee">Entry Fee (FLOW)</Label>
                  <Input
                    id="entryFee"
                    type="number"
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    step="0.1"
                    min="0.1"
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    Players must pay this amount to join the game
                  </p>
                </div>

                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg text-blue-900">Game Info</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Entry Fee: {entryFee} FLOW per player</li>
                      <li>• Creator Cost: {entryFee} FLOW (you don't join automatically)</li>
                      <li>• Fee Structure: 2% platform fee (reduced!)</li>
                    </ul>
                    <p className="mt-2 text-xs text-blue-700">
                      After creating, you'll be able to manually control game phases
                    </p>
                  </CardContent>
                </Card>

                {error && (
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-6">
                      <p className="text-red-800">{error}</p>
                    </CardContent>
                  </Card>
                )}

                <Button
                  type="submit"
                  disabled={isSubmitting || !user?.addr}
                  className="w-full"
                  size="lg"
                >
                  {isSubmitting ? 'Creating...' : 'Create Game'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}