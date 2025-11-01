'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import * as fcl from '@onflow/fcl';
import { useFlowUser } from '@/hooks/useFlowUser';
import { useGame } from '@/hooks/useGame';
import { SET_COMMIT_DEADLINE } from '@/lib/flow/cadence/transactions/SetCommitDeadline';
import { SET_REVEAL_DEADLINE } from '@/lib/flow/cadence/transactions/SetRevealDeadline';
import { SCHEDULE_COMMIT_DEADLINE } from '@/lib/flow/cadence/transactions/ScheduleCommitDeadline';
import { SCHEDULE_REVEAL_DEADLINE } from '@/lib/flow/cadence/transactions/ScheduleRevealDeadline';

export default function GameSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useFlowUser();
  const gameId = params.id as string;
  const { game, loading, error } = useGame(gameId);
  
  const [commitMinutes, setCommitMinutes] = useState(15);
  const [revealMinutes, setRevealMinutes] = useState(10);
  const [isSettingCommit, setIsSettingCommit] = useState(false);
  const [isSettingReveal, setIsSettingReveal] = useState(false);
  const [isSchedulingCommit, setIsSchedulingCommit] = useState(false);
  const [isSchedulingReveal, setIsSchedulingReveal] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if user is the game creator
  const isCreator = user?.addr && game?.creator === user.addr;
  const gameState = game?.state;

  useEffect(() => {
    if (!loading && (!game || !isCreator)) {
      router.push('/');
    }
  }, [game, isCreator, loading, router]);

  const handleSetCommitDeadline = async () => {
    if (!gameId) return;
    
    setIsSettingCommit(true);
    setSettingsError(null);
    
    try {
      const durationSeconds = commitMinutes * 60;
      
      const transactionId = await fcl.mutate({
        cadence: SET_COMMIT_DEADLINE,
        args: (arg: any, t: any) => [
          arg(gameId, t.UInt64),
          arg(durationSeconds.toFixed(1), t.UFix64)
        ],
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      await fcl.tx(transactionId).onceSealed();
      setSuccessMessage(`Commit deadline set to ${commitMinutes} minutes from now`);
    } catch (err: any) {
      setSettingsError(`Failed to set commit deadline: ${err.message}`);
    } finally {
      setIsSettingCommit(false);
    }
  };

  const handleSetRevealDeadline = async () => {
    if (!gameId) return;
    
    setIsSettingReveal(true);
    setSettingsError(null);
    
    try {
      const durationSeconds = revealMinutes * 60;
      
      const transactionId = await fcl.mutate({
        cadence: SET_REVEAL_DEADLINE,
        args: (arg: any, t: any) => [
          arg(gameId, t.UInt64),
          arg(durationSeconds.toFixed(1), t.UFix64)
        ],
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      await fcl.tx(transactionId).onceSealed();
      setSuccessMessage(`Reveal deadline set to ${revealMinutes} minutes from now`);
    } catch (err: any) {
      setSettingsError(`Failed to set reveal deadline: ${err.message}`);
    } finally {
      setIsSettingReveal(false);
    }
  };

  const handleScheduleCommitDeadline = async () => {
    if (!gameId) return;
    
    setIsSchedulingCommit(true);
    setSettingsError(null);
    
    try {
      const delaySeconds = commitMinutes * 60;
      
      const transactionId = await fcl.mutate({
        cadence: SCHEDULE_COMMIT_DEADLINE,
        args: (arg: any, t: any) => [
          arg(gameId, t.UInt64),
          arg(delaySeconds.toFixed(1), t.UFix64)
        ],
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      await fcl.tx(transactionId).onceSealed();
      setSuccessMessage(`Scheduled automatic transition to reveal phase in ${commitMinutes} minutes`);
    } catch (err: any) {
      setSettingsError(`Failed to schedule commit deadline: ${err.message}`);
    } finally {
      setIsSchedulingCommit(false);
    }
  };

  const handleScheduleRevealDeadline = async () => {
    if (!gameId) return;
    
    setIsSchedulingReveal(true);
    setSettingsError(null);
    
    try {
      const delaySeconds = revealMinutes * 60;
      
      const transactionId = await fcl.mutate({
        cadence: SCHEDULE_REVEAL_DEADLINE,
        args: (arg: any, t: any) => [
          arg(gameId, t.UInt64),
          arg(delaySeconds.toFixed(1), t.UFix64)
        ],
        proposer: fcl.authz,
        payer: fcl.authz,
        authorizations: [fcl.authz],
        limit: 1000
      });

      await fcl.tx(transactionId).onceSealed();
      setSuccessMessage(`Scheduled automatic round processing in ${revealMinutes} minutes`);
    } catch (err: any) {
      setSettingsError(`Failed to schedule reveal deadline: ${err.message}`);
    } finally {
      setIsSchedulingReveal(false);
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
            <Link href="/" className="text-xl font-bold text-gray-900">
              ← Back to Dashboard
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
          <h1 className="text-2xl font-bold mb-4">Game Settings</h1>
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

        {/* Commit Phase Settings */}
        {gameState === 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold">Commit Phase Settings</h2>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                Active Phase
              </span>
            </div>
            <p className="text-gray-600 mb-6">
              Set deadlines for the commit phase. Players need time to join and submit their vote commitments.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Information Deadline */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">User Information</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Set visible deadline for players to see when commit phase ends
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Commit Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={commitMinutes}
                      onChange={(e) => setCommitMinutes(parseInt(e.target.value) || 15)}
                      min="1"
                      max="1440"
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <button
                    onClick={handleSetCommitDeadline}
                    disabled={isSettingCommit}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                  >
                    {isSettingCommit ? 'Setting...' : 'Set Commit Deadline'}
                  </button>
                </div>
              </div>

              {/* Automatic Scheduling */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Automatic Scheduling (Forte)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Schedule automatic transition to reveal phase
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto-trigger in (minutes)
                    </label>
                    <input
                      type="number"
                      value={commitMinutes}
                      onChange={(e) => setCommitMinutes(parseInt(e.target.value) || 15)}
                      min="1"
                      max="1440"
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <button
                    onClick={handleScheduleCommitDeadline}
                    disabled={isSchedulingCommit}
                    className="w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors"
                  >
                    {isSchedulingCommit ? 'Scheduling...' : 'Schedule Auto-Transition'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reveal Phase Settings */}
        {gameState === 1 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-bold">Reveal Phase Settings</h2>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                Active Phase
              </span>
            </div>
            <p className="text-gray-600 mb-6">
              The reveal phase is now active. Set deadlines for when players must reveal their votes.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* User Information Deadline */}
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
                      type="number"
                      value={revealMinutes}
                      onChange={(e) => setRevealMinutes(parseInt(e.target.value) || 10)}
                      min="1"
                      max="1440"
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <button
                    onClick={handleSetRevealDeadline}
                    disabled={isSettingReveal || gameState === 2 || gameState === 3}
                    className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
                  >
                    {isSettingReveal ? 'Setting...' : 'Set Reveal Deadline'}
                  </button>
                </div>
              </div>

              {/* Automatic Scheduling */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-3">Automatic Scheduling (Forte)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Schedule automatic round processing
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Auto-process in (minutes)
                    </label>
                    <input
                      type="number"
                      value={revealMinutes}
                      onChange={(e) => setRevealMinutes(parseInt(e.target.value) || 10)}
                      min="1"
                      max="1440"
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <button
                    onClick={handleScheduleRevealDeadline}
                    disabled={isSchedulingReveal}
                    className="w-full py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 transition-colors"
                  >
                    {isSchedulingReveal ? 'Scheduling...' : 'Schedule Auto-Processing'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
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

        {/* Game Completed */}
        {gameState === 3 && (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Game Completed</h2>
            <p className="text-gray-600">
              This game has finished. No more settings can be changed.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}