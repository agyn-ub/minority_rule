"use client";

import { useState, useEffect } from "react";
import { useFlowCurrentUser } from "@onflow/react-sdk";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SetCommitDeadline from "@/components/SetCommitDeadline";

// Type for game data from Supabase
type GameDetails = {
  game_id: number;
  question_text: string;
  entry_fee: number;
  creator_address: string;
  current_round: number;
  game_state: 'commit_phase' | 'reveal_phase' | 'completed';
  commit_deadline: string | null;
  reveal_deadline: string | null;
  total_players: number;
  created_at: string;
  deadline_set_transaction_id?: string;
};

type GamePlayer = {
  player_address: string;
  joined_at: string;
  status: 'active' | 'eliminated' | 'winner';
};

interface GameManagementPageProps {
  params: {
    gameId: string;
  };
}

export default function GameManagementPage({ params }: GameManagementPageProps) {
  const { user } = useFlowCurrentUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params.gameId;
  
  const [game, setGame] = useState<GameDetails | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);

  // Check if we should auto-open deadline form
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'set-deadline') {
      setShowDeadlineForm(true);
    }
  }, [searchParams]);

  // Fetch game details and players
  useEffect(() => {
    const fetchGameData = async () => {
      if (!user?.loggedIn || !user?.addr) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch game details
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('game_id', parseInt(gameId))
          .eq('creator_address', user.addr) // Ensure user owns this game
          .single();

        if (gameError) {
          if (gameError.code === 'PGRST116') {
            setError('Game not found or you do not have permission to manage it');
          } else {
            setError('Failed to load game details');
          }
          return;
        }

        setGame(gameData);

        // Fetch game players
        const { data: playersData, error: playersError } = await supabase
          .from('game_players')
          .select('player_address, joined_at, status')
          .eq('game_id', parseInt(gameId))
          .order('joined_at', { ascending: true });

        if (playersError) {
          console.error('Players fetch error:', playersError);
          // Don't set error for players, as game might not have players yet
        } else {
          setPlayers(playersData || []);
        }

      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to connect to database');
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [user?.loggedIn, user?.addr, gameId]);

  // Determine game status
  const getGameStatus = (game: GameDetails) => {
    if (!game.commit_deadline) {
      return {
        status: 'needs_deadline',
        text: 'Needs Deadline',
        color: 'text-orange-600 bg-orange-50 border-orange-200',
        description: 'Set commit deadline to allow players to join'
      };
    }

    const now = new Date();
    const deadline = new Date(game.commit_deadline);

    if (game.game_state === 'completed') {
      return {
        status: 'completed',
        text: 'Completed',
        color: 'text-gray-600 bg-gray-50 border-gray-200',
        description: 'Game has ended'
      };
    }

    if (now < deadline) {
      return {
        status: 'active',
        text: 'Active - Accepting Players',
        color: 'text-green-600 bg-green-50 border-green-200',
        description: 'Players can join and commit votes'
      };
    }

    return {
      status: 'in_progress',
      text: 'In Progress',
      color: 'text-blue-600 bg-blue-50 border-blue-200',
      description: 'Deadline passed, game is running'
    };
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  // Generate block explorer URL
  const getBlockExplorerUrl = (transactionId: string) => {
    return `https://testnet.flowscan.io/transaction/${transactionId}`;
  };

  if (!user?.loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Wallet Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please connect your Flow wallet to manage your games.
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading game details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-red-900 mb-4">
              Game Not Found
            </h1>
            <p className="text-red-700 mb-6">
              {error || 'This game does not exist or you do not have permission to manage it.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/my-games"
                className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Back to My Games
              </Link>
              <Link
                href="/"
                className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getGameStatus(game);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/" className="text-blue-600 hover:text-blue-700">
                Home
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <Link href="/my-games" className="text-blue-600 hover:text-blue-700">
                  My Games
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-gray-500">Game #{gameId}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">
              Game #{game.game_id} Management
            </h1>
            <div className={`px-4 py-2 rounded-lg border ${statusInfo.color}`}>
              <span className="font-medium text-sm">{statusInfo.text}</span>
            </div>
          </div>
          <p className="text-gray-600">{statusInfo.description}</p>
        </div>

        {/* Game Details Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Game Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                {game.question_text}
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entry Fee</label>
                <p className="text-lg font-semibold text-gray-900">{game.entry_fee} FLOW</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Round</label>
                <p className="text-lg font-semibold text-gray-900">{game.current_round}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Game State</label>
                <p className="text-lg font-semibold text-gray-900 capitalize">{game.game_state.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
              <p className="text-gray-900">{new Date(game.created_at).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commit Deadline</label>
              {game.commit_deadline ? (
                <div>
                  <p className="text-gray-900">{new Date(game.commit_deadline).toLocaleString()}</p>
                  {game.deadline_set_transaction_id && (
                    <a
                      href={getBlockExplorerUrl(game.deadline_set_transaction_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      🔗 View transaction
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-gray-500 text-sm">Not set</p>
                  <button
                    onClick={() => setShowDeadlineForm(true)}
                    className="text-xs bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 transition-colors"
                  >
                    Set Now
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Set Deadline Form */}
        {showDeadlineForm && !game.commit_deadline && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-2 border-orange-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Set Commit Deadline</h2>
              <button
                onClick={() => setShowDeadlineForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <SetCommitDeadline
              gameId={gameId}
              onSuccess={(transactionId) => {
                console.log('Deadline set successfully:', transactionId);
                setShowDeadlineForm(false);
                // Refresh the page to show updated data
                window.location.reload();
              }}
              onError={(error) => {
                console.error('Failed to set deadline:', error);
                alert('Failed to set deadline. Please try again.');
              }}
              buttonText="Set Commit Deadline for Game"
            />
          </div>
        )}

        {/* Players Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Players ({players.length})</h2>
            <div className="text-sm text-gray-600">
              Total Players: {game.total_players}
            </div>
          </div>
          
          {players.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No players have joined this game yet.</p>
              {!game.commit_deadline && (
                <p className="text-sm mt-2">Set a commit deadline to allow players to join.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {players.map((player, index) => (
                    <tr key={player.player_address} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm text-gray-900">
                          {formatAddress(player.player_address)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          player.status === 'active' ? 'bg-green-100 text-green-800' :
                          player.status === 'winner' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {player.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(player.joined_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-3">
            <Link
              href="/my-games"
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              ← Back to My Games
            </Link>
            {statusInfo.status === 'needs_deadline' && (
              <button
                onClick={() => setShowDeadlineForm(true)}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Set Commit Deadline
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <Link
              href={`/games`}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View in Browse Games
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}