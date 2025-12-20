"use client";

import { useState, useEffect } from "react";
import { useFlowCurrentUser } from "@onflow/react-sdk";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Type for game data from Supabase
type MyGame = {
  game_id: number;
  question_text: string;
  entry_fee: number;
  creator_address: string;
  current_round: number;
  game_state: 'commit_phase' | 'reveal_phase' | 'completed';
  commit_deadline: string | null;
  total_players: number;
  created_at: string;
};

export default function MyGamesPage() {
  const { user } = useFlowCurrentUser();
  const [games, setGames] = useState<MyGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'needs_deadline' | 'active' | 'completed'>('all');

  // Fetch user's games from Supabase
  useEffect(() => {
    const fetchMyGames = async () => {
      if (!user?.loggedIn || !user?.addr) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('creator_address', user.addr)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase error:', error);
          setError('Failed to load your games');
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

    fetchMyGames();
  }, [user?.loggedIn, user?.addr]);

  // Determine game status for display
  const getGameStatus = (game: MyGame) => {
    if (!game.commit_deadline) {
      return {
        status: 'needs_deadline',
        text: 'Needs Deadline',
        color: 'text-muted-foreground bg-muted',
        description: 'Set commit deadline to allow players to join'
      };
    }

    const now = new Date();
    const deadline = new Date(game.commit_deadline);

    if (game.game_state === 'completed') {
      return {
        status: 'completed',
        text: 'Completed',
        color: 'text-muted-foreground bg-gray-50',
        description: 'Game has ended'
      };
    }

    if (now < deadline) {
      return {
        status: 'active',
        text: 'Active',
        color: 'text-foreground bg-accent',
        description: 'Players can join and vote'
      };
    }

    return {
      status: 'active',
      text: 'In Progress',
      color: 'text-foreground bg-accent',
      description: 'Game is running'
    };
  };

  // Filter games based on selected filter
  const filteredGames = games.filter(game => {
    if (filter === 'all') return true;
    
    const gameStatus = getGameStatus(game);
    if (filter === 'needs_deadline') return gameStatus.status === 'needs_deadline';
    if (filter === 'active') return gameStatus.status === 'active';
    if (filter === 'completed') return gameStatus.status === 'completed';
    
    return true;
  });

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
            Please connect your Flow wallet to view your games.
          </p>
          <Link
            href="/"
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-center block"
          >
            Go to Homepage
          </Link>
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
            My Games
          </h1>
          <p className="text-muted-foreground">
            Manage and monitor your created Minority Rule games
          </p>
        </div>

        {/* Action Bar */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between">
          {/* Filter Tabs */}
          <div className="flex space-x-1 bg-card rounded-lg p-1 shadow-sm">
            {[
              { key: 'all', label: 'All Games' },
              { key: 'needs_deadline', label: 'Needs Setup' },
              { key: 'active', label: 'Active' },
              { key: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-3 py-2 rounded-md font-medium text-xs sm:text-sm transition-colors ${
                  filter === tab.key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Create New Game Button */}
          <Link
            href="/create"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium text-center"
          >
            Create New Game
          </Link>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            <p className="mt-2 text-muted-foreground">Loading your games...</p>
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
                <div className="mb-4">
                  {games.length === 0 ? (
                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-2">No games created yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Create your first Minority Rule game to get started
                      </p>
                      <Link
                        href="/create"
                        className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                      >
                        Create Your First Game
                      </Link>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        No {filter === 'all' ? '' : filter.replace('_', ' ')} games found
                      </h3>
                      <p className="text-muted-foreground">
                        Try changing the filter or create a new game
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGames.map((game) => {
                  const statusInfo = getGameStatus(game);

                  return (
                    <div key={game.game_id} className="bg-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                      {/* Status Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
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
                        {game.commit_deadline && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Deadline:</span>
                            <span className="font-medium text-xs">
                              {new Date(game.commit_deadline).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status Description */}
                      <p className="text-xs text-muted-foreground mb-4">
                        {statusInfo.description}
                      </p>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link
                          href={`/my-games/${game.game_id}`}
                          className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium text-center"
                        >
                          Manage
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

        {/* Stats Summary */}
        {!loading && !error && games.length > 0 && (
          <div className="mt-12 bg-card rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Your Game Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{games.length}</p>
                <p className="text-sm text-muted-foreground">Total Games</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {games.filter(g => getGameStatus(g).status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Active Games</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {games.filter(g => getGameStatus(g).status === 'needs_deadline').length}
                </p>
                <p className="text-sm text-muted-foreground">Need Setup</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {games.filter(g => getGameStatus(g).status === 'completed').length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}