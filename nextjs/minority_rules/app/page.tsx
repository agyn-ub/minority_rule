"use client";

import { useState, useEffect } from "react";
import { useFlowUser } from "@/lib/useFlowUser";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Helper functions for game state
const getGameStateName = (state: number): string => {
  switch (state) {
    case 0: return "Zero Phase";
    case 1: return "Commit Phase";
    case 2: return "Reveal Phase";
    case 3: return "Processing Round";
    case 4: return "Completed";
    default: return "Unknown";
  }
};

// Type for game data from Supabase
type Game = {
  game_id: number;
  question_text: string;
  entry_fee: number;
  creator_address: string;
  current_round: number;
  game_state: number; // 0=zeroPhase, 1=commitPhase, 2=revealPhase, 3=processingRound, 4=completed
  commit_deadline: string | null;
  reveal_deadline: string | null;
  total_players: number;
  created_at: string;
};

export default function HomePage() {
  const { user } = useFlowUser();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Fetch games from Supabase
  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('games')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase error:', error);
          setError('Failed to load games');
          return;
        }

        setGames(data || []);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to connect to database');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  // Filter games based on selected filter
  const filteredGames = games.filter(game => {
    if (filter === 'active') {
      return game.game_state === 1 || game.game_state === 2; // commitPhase or revealPhase
    }
    if (filter === 'completed') {
      return game.game_state === 4; // completed
    }
    return true; // 'all'
  });

  // Format game state for display with enhanced styling
  const formatGameState = (state: number, commitDeadline?: string | null) => {
    const now = new Date();

    switch (state) {
      case 0: // zeroPhase
        return {
          text: 'Setting Up',
          color: 'text-gray-700 bg-gray-100 border-gray-200',
          description: 'Game setup in progress'
        };
      case 1: // commitPhase
        if (commitDeadline) {
          const deadline = new Date(commitDeadline);
          const isOpen = now < deadline;
          return isOpen
            ? {
              text: 'Open for Joining',
              color: 'text-green-700 bg-green-100 border-green-200',
              description: 'Players can join and vote'
            }
            : {
              text: 'Commit Ended',
              color: 'text-orange-700 bg-orange-100 border-orange-200',
              description: 'Waiting for reveal phase'
            };
        }
        return {
          text: 'Commit Phase',
          color: 'text-blue-700 bg-blue-100 border-blue-200',
          description: 'Commit phase active'
        };
      case 2: // revealPhase
        return {
          text: 'Reveal Phase',
          color: 'text-purple-700 bg-purple-100 border-purple-200',
          description: 'Players revealing votes'
        };
      case 3: // processingRound
        return {
          text: 'Processing',
          color: 'text-indigo-700 bg-indigo-100 border-indigo-200',
          description: 'Calculating results'
        };
      case 4: // completed
        return {
          text: 'Completed',
          color: 'text-gray-700 bg-gray-100 border-gray-200',
          description: 'Game finished'
        };
      default:
        return {
          text: 'Unknown',
          color: 'text-red-700 bg-red-100 border-red-200',
          description: 'Unknown state'
        };
    }
  };

  // Format address for display (first 6 + last 4 characters)
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!user?.loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Connect Wallet Required
          </h1>
          <p className="text-muted-foreground mb-6">
            Please connect your Flow wallet to browse games.
          </p>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Use the Profile button in the top-right corner
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Browse Games
          </h1>
          <p className="text-muted-foreground">
            Discover and join Minority Rule games on Flow blockchain
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-card rounded-lg p-1 shadow-sm">
            {[
              { key: 'all', label: 'All Games' },
              { key: 'active', label: 'Active Games' },
              { key: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${filter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            <p className="mt-2 text-muted-foreground">Loading games...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Games Grid */}
        {!loading && !error && (
          <>
            {filteredGames.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {filter === 'all' ? 'No games found' : `No ${filter} games found`}
                </p>
                <Link
                  href="/create"
                  className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Create First Game
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGames.map((game) => {
                  const stateInfo = formatGameState(game.game_state, game.commit_deadline);
                  const isActive = game.game_state === 1 || game.game_state === 2; // commitPhase or revealPhase

                  return (
                    <div key={game.game_id} className="bg-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                      {/* Game State Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex flex-col">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${stateInfo.color}`}>
                            {stateInfo.text}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1">
                            {getGameStateName(game.game_state)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Game #{game.game_id}
                        </span>
                      </div>

                      {/* Question */}
                      <h3 className="text-lg font-semibold text-foreground mb-3 line-clamp-2">
                        {game.question_text}
                      </h3>

                      {/* Game Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Entry Fee:</span>
                          <span className="font-medium">{game.entry_fee} FLOW</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Players:</span>
                          <span className="font-medium">{game.total_players}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Round:</span>
                          <span className="font-medium">{game.current_round}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Phase:</span>
                          <span className="font-medium text-xs">{getGameStateName(game.game_state)}</span>
                        </div>
                        {game.commit_deadline && game.game_state === 1 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Join Until:</span>
                            <span className="font-medium text-xs">
                              {new Date(game.commit_deadline).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Creator:</span>
                          <span className="font-mono text-xs">{formatAddress(game.creator_address)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link
                          href={`/games/${game.game_id}`}
                          className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium text-center"
                        >
                          {isActive ? 'Go Game' : 'View Details'}
                        </Link>
                      </div>

                      {/* Created Date */}
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        Created {new Date(game.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Create Game CTA */}
        {!loading && !error && filteredGames.length > 0 && (
          <div className="text-center mt-12">
            <Link
              href="/create"
              className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Create New Game
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
