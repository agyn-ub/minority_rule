'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import * as fcl from '@onflow/fcl';
import { useFlowUser } from '@/hooks/useFlowUser';
import { useGame } from '@/hooks/useGame';
import { setRevealDeadlineTransaction } from '@/lib/flow/transactions';

export default function RevealDeadlinesPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useFlowUser();
  const gameId = params.id as string;
  const { game, loading, error, refetch } = useGame(gameId);
  
  const [revealMinutes, setRevealMinutes] = useState(10);
  const [revealMinutesInput, setRevealMinutesInput] = useState<string>('10');
  const [isSettingReveal, setIsSettingReveal] = useState(false);
  const [isProcessingRound, setIsProcessingRound] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isCreator = user?.addr && game?.creator === user.addr;
  const gameState = game?.state;

  useEffect(() => {
    if (!loading && (!game || !isCreator)) {
      router.push('/');
    }
  }, [game, isCreator, loading, router]);

  const handleSetRevealDeadline = async () => {
    if (!gameId) return;

    // Parse input value
    const minutes = parseInt(revealMinutesInput) || 10;
    setRevealMinutes(minutes);
    setRevealMinutesInput(minutes.toString());
    
    setIsSettingReveal(true);
    setSettingsError(null);
    
    try {
      const durationSeconds = minutes * 60;
      
      const transactionId = await fcl.mutate({
        ...setRevealDeadlineTransaction(gameId, durationSeconds.toFixed(1)),
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      await fcl.tx(transactionId).onceSealed();
      setSuccessMessage(`Reveal deadline set to ${minutes} minutes from now`);
      // Transaction is sealed, refetch immediately
      refetch();
    } catch (err: any) {
      setSettingsError(`Failed to set reveal deadline: ${err.message}`);
    } finally {
      setIsSettingReveal(false);
    }
  };

  const handleProcessRound = async () => {
    if (!gameId) return;

    setIsProcessingRound(true);
    setSettingsError(null);
    
    try {
      const PROCESS_ROUND = `
        import "MinorityRuleGame"

        transaction(gameId: UInt64, contractAddress: Address) {
          prepare(signer: auth(Storage, Capabilities) &Account) {
            let gameManager = getAccount(contractAddress)
              .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
              ?? panic("Could not borrow game manager from public capability")
            
            let game = gameManager.borrowGame(gameId: gameId)
              ?? panic("Game not found")
            
            game.processRound()
          }
          
          execute {
            log("Round processed for game ".concat(gameId.toString()))
          }
        }
      `;
      
      const transactionId = await fcl.mutate({
        cadence: PROCESS_ROUND,
        args: (arg: any, t: any) => [
          arg(gameId, t.UInt64),
          arg("0xf63159eb10f911cd", t.Address)
        ],
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      await fcl.tx(transactionId).onceSealed();
      setSuccessMessage(`Round processed successfully`);
      refetch();
    } catch (err: any) {
      setSettingsError(`Failed to process round: ${err.message}`);
    } finally {
      setIsProcessingRound(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load game</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href={`/game/${gameId}/settings`} className="text-xl font-bold text-gray-900">
              ← Back to Settings
            </Link>
            <Link 
              href={`/game/${gameId}`}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              View Game
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Reveal Phase Deadlines</h1>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Game ID:</span> {gameId}
            </div>
            <div>
              <span className="font-medium">Question:</span> {game.questionText}
            </div>
            <div>
              <span className="font-medium">Entry Fee:</span> {game.entryFee} FLOW
            </div>
            <div>
              <span className="font-medium">Current State:</span> 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                gameState === 0 ? 'bg-yellow-100 text-yellow-800' :
                gameState === 1 ? 'bg-blue-100 text-blue-800' :
                gameState === 2 ? 'bg-purple-100 text-purple-800' :
                'bg-green-100 text-green-800'
              }`}>
                {gameState === 0 ? 'Commit Phase' :
                 gameState === 1 ? 'Reveal Phase' :
                 gameState === 2 ? 'Processing' :
                 'Completed'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-bold">Reveal Phase Settings</h2>
            {gameState === 1 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Active Phase
              </span>
            )}
          </div>
          <p className="text-gray-600 mb-6">
            Set deadlines for when players must reveal their votes after the commit phase.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {game.revealDeadline && Number(game.revealDeadline) > 0 ? (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Current Reveal Deadline</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Reveal deadline is already set for this game
                </p>

                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Deadline:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {game.revealDeadlineFormatted || new Date(Number(game.revealDeadline) * 1000).toLocaleString()}
                    </span>
                  </div>
                  {game.timeRemainingInPhase && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Time Remaining:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {game.timeRemainingInPhase}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">User Information</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Set visible deadline for players to see when reveal phase ends
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reveal Duration (minutes)
                    </label>
                    <input
                      type="text"
                      value={revealMinutesInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Only allow numbers (old school way - no letters)
                        if (val === '' || /^\d+$/.test(val)) {
                          setRevealMinutesInput(val);
                        }
                      }}
                      onBlur={(e) => {
                        const num = parseInt(e.target.value) || 10;
                        setRevealMinutes(num);
                        setRevealMinutesInput(num.toString());
                      }}
                      min="1"
                      max="1440"
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <button
                    onClick={handleSetRevealDeadline}
                    disabled={isSettingReveal || gameState !== 1}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                  >
                    {isSettingReveal ? 'Setting...' : 'Set Reveal Deadline'}
                  </button>
                </div>
              </div>
            )}

            {game.revealDeadline && Number(game.revealDeadline) > 0 ? (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Round Processing</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Deadline is set - round can be processed manually after deadline or when all players reveal
                </p>

                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Deadline set for:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {new Date(Number(game.revealDeadline) * 1000).toLocaleString()}
                    </span>
                  </div>
                  {game.timeRemainingInPhase && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Time remaining:</span>
                      <span className="ml-2 text-sm text-gray-900">
                        {game.timeRemainingInPhase}
                      </span>
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500">
                      Round processing must be done manually after the deadline passes or when all players reveal.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Manual Round Processing</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Manually process the round when ready
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto-process in (minutes)
                    </label>
                    <input
                      type="text"
                      value={revealMinutesInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Only allow numbers (old school way - no letters)
                        if (val === '' || /^\d+$/.test(val)) {
                          setRevealMinutesInput(val);
                        }
                      }}
                      onBlur={(e) => {
                        const num = parseInt(e.target.value) || 10;
                        setRevealMinutes(num);
                        setRevealMinutesInput(num.toString());
                      }}
                      min="1"
                      max="1440"
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <button
                    onClick={handleProcessRound}
                    disabled={isProcessingRound || gameState !== 1}
                    className="w-full py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 transition-colors"
                  >
                    {isProcessingRound ? 'Processing...' : 'Process Round Now'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {settingsError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <p className="text-red-800">{settingsError}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {gameState !== 1 && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Reveal Phase Not Active</h2>
            <p className="text-gray-600">
              Reveal deadline settings are only available during the reveal phase.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}