"use client";

import { useState, useEffect } from "react";
import { useFlowCurrentUser } from "@onflow/react-sdk";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Type for game data from Supabase
type Game = {
  game_id: number;
  question_text: string;
  entry_fee: number;
  creator_address: string;
  current_round: number;
  game_state: 'commit_phase' | 'reveal_phase' | 'completed';
  total_players: number;
  created_at: string;
};

export default function BrowseGamesPage() {
  const { user } = useFlowCurrentUser();
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
      return game.game_state === 'commit_phase' || game.game_state === 'reveal_phase';
    }
    if (filter === 'completed') {
      return game.game_state === 'completed';
    }
    return true; // 'all'
  });

  // Format game state for display
  const formatGameState = (state: string) => {
    switch (state) {
      case 'commit_phase':
        return { text: 'Voting Open', color: 'text-green-600 bg-green-50' };
      case 'reveal_phase':
        return { text: 'Revealing', color: 'text-blue-600 bg-blue-50' };
      case 'completed':
        return { text: 'Completed', color: 'text-gray-600 bg-gray-50' };
      default:
        return { text: 'Unknown', color: 'text-gray-600 bg-gray-50' };
    }
  };

  // Format address for display (first 6 + last 4 characters)
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (!user?.loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Connect Wallet Required
          </h1>
          <p className="text-gray-600 mb-6">
            Please connect your Flow wallet to browse games.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Games
          </h1>
          <p className="text-gray-600">
            Discover and join Minority Rule games on Flow blockchain
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            {[
              { key: 'all', label: 'All Games' },
              { key: 'active', label: 'Active Games' },
              { key: 'completed', label: 'Completed' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                  filter === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
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
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading games...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Games Grid */}
        {!loading && !error && (
          <>
            {filteredGames.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">
                  {filter === 'all' ? 'No games found' : `No ${filter} games found`}
                </p>
                <Link
                  href="/create"
                  className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create First Game
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredGames.map((game) => {
                  const stateInfo = formatGameState(game.game_state);
                  const isActive = game.game_state === 'commit_phase' || game.game_state === 'reveal_phase';

                  return (
                    <div key={game.game_id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                      {/* Game State Badge */}
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${stateInfo.color}`}>
                          {stateInfo.text}
                        </span>
                        <span className="text-xs text-gray-500">
                          Game #{game.game_id}
                        </span>
                      </div>

                      {/* Question */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                        {game.question_text}
                      </h3>

                      {/* Game Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Entry Fee:</span>
                          <span className="font-medium">{game.entry_fee} FLOW</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Players:</span>
                          <span className="font-medium">{game.total_players}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Round:</span>
                          <span className="font-medium">{game.current_round}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Creator:</span>
                          <span className="font-mono text-xs">{formatAddress(game.creator_address)}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {isActive ? (
                          <button
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            onClick={() => {
                              // TODO: Implement join game
                              alert('Join game functionality coming soon!');
                            }}
                          >
                            Join Game
                          </button>
                        ) : (
                          <button
                            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                            onClick={() => {
                              // TODO: Implement view details
                              alert('View details functionality coming soon!');
                            }}
                          >
                            View Details
                          </button>
                        )}
                      </div>

                      {/* Created Date */}
                      <p className="text-xs text-gray-500 mt-3 text-center">
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
              className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Create New Game
            </Link>
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