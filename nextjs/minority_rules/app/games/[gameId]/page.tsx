"use client";

import { useState, useEffect, use } from "react";
import { useFlowCurrentUser } from "@onflow/react-sdk";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Type for game data from Supabase
type PublicGameDetails = {
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
};

interface PublicGamePageProps {
  params: Promise<{
    gameId: string;
  }>;
}

export default function PublicGamePage({ params }: PublicGamePageProps) {
  const { user } = useFlowCurrentUser();
  const resolvedParams = use(params);
  const gameId = resolvedParams.gameId;
  
  const [game, setGame] = useState<PublicGameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);

  // Fetch public game data
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('game_id', parseInt(gameId))
          .single();

        if (gameError) {
          if (gameError.code === 'PGRST116') {
            setError('Game not found');
          } else {
            setError('Failed to load game details');
          }
          return;
        }

        setGame(gameData);
        
        // Check if current user is the creator
        if (user?.addr && gameData.creator_address === user.addr) {
          setIsCreator(true);
        }

      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to connect to database');
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [gameId, user?.addr]);

  // Determine game status for public view
  const getGameStatus = (game: PublicGameDetails) => {
    if (!game.commit_deadline) {
      return {
        status: 'setup',
        text: 'Setting Up',
        color: 'text-muted-foreground bg-muted border-border',
        description: 'Game creator is still setting up this game'
      };
    }

    const now = new Date();
    const deadline = new Date(game.commit_deadline);

    if (game.game_state === 'completed') {
      return {
        status: 'completed',
        text: 'Completed',
        color: 'text-muted-foreground bg-gray-50 border-gray-200',
        description: 'This game has ended'
      };
    }

    if (now < deadline && game.game_state === 'commit_phase') {
      return {
        status: 'open',
        text: 'Open for Joining',
        color: 'text-foreground bg-accent border-border',
        description: 'Players can join and submit votes'
      };
    }

    return {
      status: 'in_progress',
      text: 'In Progress',
      color: 'text-foreground bg-accent border-border',
      description: 'Game is currently running'
    };
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            <p className="mt-2 text-muted-foreground">Loading game...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-red-900 mb-4">
              Game Not Found
            </h1>
            <p className="text-red-700 mb-6">
              {error || 'This game does not exist or has been removed.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/games"
                className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Back to Games
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
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/" className="text-primary hover:text-primary/80">
                Home
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <Link href="/games" className="text-primary hover:text-primary/80">
                  Browse Games
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-muted-foreground">Game #{gameId}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Game Header */}
        <div className="bg-card rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-foreground">
              Game #{game.game_id}
            </h1>
            <div className={`px-4 py-2 rounded-lg border ${statusInfo.color}`}>
              <span className="font-medium text-sm">{statusInfo.text}</span>
            </div>
          </div>
          
          {/* Creator Notice */}
          {isCreator && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-blue-800 text-sm">
                  👑 You are the creator of this game
                </p>
                <Link
                  href={`/my-games/${gameId}`}
                  className="text-primary hover:text-primary/80 text-sm font-medium"
                >
                  Manage Game →
                </Link>
              </div>
            </div>
          )}

          <p className="text-muted-foreground">{statusInfo.description}</p>
        </div>

        {/* Game Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Game Info */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Game Question</h2>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-lg text-foreground font-medium">
                  {game.question_text}
                </p>
              </div>

              {/* Game Rules */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-foreground mb-3">How to Play</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Answer the question with YES or NO</p>
                  <p>• Only players in the minority advance to the next round</p>
                  <p>• Game continues until 1-2 players remain</p>
                  <p>• Winners split the prize pool</p>
                </div>
              </div>
            </div>
          </div>

          {/* Game Stats */}
          <div className="space-y-6">
            {/* Entry Requirements */}
            <div className="bg-card rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Entry Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Fee:</span>
                  <span className="font-semibold text-lg">{game.entry_fee} FLOW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Players:</span>
                  <span className="font-medium">{game.total_players}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Round:</span>
                  <span className="font-medium">{game.current_round}</span>
                </div>
                {game.commit_deadline && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Join Deadline:</span>
                    <span className="font-medium text-xs">
                      {new Date(game.commit_deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Prize Pool */}
            <div className="bg-card rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Prize Pool</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground mb-2">
                  {(game.total_players * game.entry_fee * 0.98).toFixed(2)} FLOW
                </div>
                <p className="text-sm text-muted-foreground">
                  Total prize for winners
                </p>
              </div>
            </div>

            {/* Creator Info */}
            <div className="bg-card rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Game Creator</h3>
              <div className="text-center">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {formatAddress(game.creator_address)}
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Created {new Date(game.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="bg-card rounded-lg shadow-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Actions</h3>
          
          {!user?.loggedIn ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Connect your wallet to join this game</p>
              <p className="text-sm text-muted-foreground">Use the profile button in the navigation bar</p>
            </div>
          ) : isCreator ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">You created this game</p>
              <Link
                href={`/my-games/${gameId}`}
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Manage Game
              </Link>
            </div>
          ) : statusInfo.status === 'open' ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Join this game and submit your vote</p>
              <button
                onClick={() => alert('Join game functionality coming soon!')}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Join Game ({game.entry_fee} FLOW)
              </button>
            </div>
          ) : statusInfo.status === 'setup' ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>This game is still being set up by the creator</p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>This game is no longer accepting new players</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="text-center">
          <Link
            href="/games"
            className="text-primary hover:text-primary/80 text-sm"
          >
            ← Back to All Games
          </Link>
        </div>
      </div>
    </div>
  );
}