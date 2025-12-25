"use client";

import { useState, useEffect } from "react";
import { useFlowCurrentUser } from "@onflow/react-sdk";
import Link from "next/link";
import { supabase, type Game } from "@/lib/supabase";

// Helper function to get game state name
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

// Helper function to get state color
const getStateColor = (state: number): string => {
  switch (state) {
    case 0: return "bg-gray-100 text-gray-800";
    case 1: return "bg-blue-100 text-blue-800";
    case 2: return "bg-yellow-100 text-yellow-800";
    case 3: return "bg-orange-100 text-orange-800";
    case 4: return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export default function MyGamesPage() {
  const { user } = useFlowCurrentUser();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch games created by current user
  useEffect(() => {
    const fetchUserGames = async () => {
      if (!user?.addr) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('creator_address', user.addr)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setGames(data || []);
      } catch (err) {
        console.error('Error fetching user games:', err);
        setError('Failed to load your games');
      } finally {
        setLoading(false);
      }
    };

    fetchUserGames();
  }, [user?.addr]);

  if (!user?.loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-border">
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
            View and manage your Minority Rule games
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex gap-4">
          <Link
            href="/create"
            className="bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
          >
            + Create New Game
          </Link>
          <Link
            href="/games"
            className="bg-secondary text-secondary-foreground py-2 px-4 rounded-lg hover:bg-secondary/90 transition-colors"
          >
            View All Games
          </Link>
        </div>

        {/* Games Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Your Games ({games.length})
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
              <p className="mt-2 text-muted-foreground">Loading your games...</p>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <p className="text-destructive">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-primary hover:text-primary/80"
              >
                Try Again
              </button>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                You haven't created any games yet.
              </p>
              <Link
                href="/create"
                className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Create Your First Game
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game) => (
                <div key={game.game_id} className="bg-card rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow border border-border">
                  {/* Card Header */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(game.game_state)}`}>
                      {getGameStateName(game.game_state)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Game #{game.game_id}
                    </span>
                  </div>

                  {/* Question */}
                  <h3 className="text-lg font-semibold text-foreground mb-3 line-clamp-2 min-h-[3rem]">
                    {game.question_text}
                  </h3>

                  {/* Game Stats */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Entry Fee:</span>
                      <span className="font-medium">{game.entry_fee} FLOW</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Current Round:</span>
                      <span className="font-medium">{game.current_round}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Players:</span>
                      <span className="font-medium">{game.total_players}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mb-3">
                    <Link
                      href={`/games/${game.game_id}`}
                      className="flex-1 bg-secondary text-secondary-foreground py-2 px-3 rounded-lg hover:bg-secondary/90 transition-colors text-sm font-medium text-center"
                    >
                      View
                    </Link>
                    <Link
                      href={`/my-games/${game.game_id}`}
                      className="flex-1 bg-primary text-primary-foreground py-2 px-3 rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium text-center"
                    >
                      Manage
                    </Link>
                  </div>

                  {/* Created Date */}
                  <p className="text-xs text-muted-foreground text-center">
                    Created {new Date(game.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          Connected as: {user.addr}
        </div>
      </div>
    </div>
  );
}