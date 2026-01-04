"use client";

import { useState, useEffect, useCallback } from "react";
import { useFlowUser } from "@/lib/useFlowUser";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Helper functions for game state
const getGameStateName = (state: number): string => {
  switch (state) {
    case 0: return "Zero Phase";
    case 1: return "Commit Phase";
    case 2: return "Reveal Phase";
    case 3: return "Completed";
    default: return "Unknown";
  }
};

// Type for game data from Supabase
type Game = {
  game_id: number;
  question_text: string;
  entry_fee: number;
  creator_address: string;
  current_round: number | null;
  game_state: number; // 0=zeroPhase, 1=commitPhase, 2=revealPhase, 3=completed
  commit_deadline: string | null;
  reveal_deadline: string | null;
  total_players: number | null;
  created_at: string | null;
};

export default function HomePage() {
  const { user } = useFlowUser();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'new' | 'ongoing' | 'completed'>('new');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [gamesPerPage] = useState(12);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'entry_fee' | 'total_players'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minFee, setMinFee] = useState<number | ''>('');
  const [maxFee, setMaxFee] = useState<number | ''>('');

  // Helper function to build database query based on filter
  const buildQuery = () => {
    const now = new Date().toISOString();
    let query = supabase
      .from('games')
      .select('*', { count: 'exact' });

    // Filter by game state based on current tab
    if (filter === 'new') {
      // Games open for joining (commit phase with deadline not passed)
      query = query
        .eq('game_state', 1)
        .not('commit_deadline', 'is', null)
        .gt('commit_deadline', now);
    } else if (filter === 'ongoing') {
      // Games in progress but not open for new players
      query = query.or(
        `and(game_state.eq.1,commit_deadline.lte.${now}),game_state.eq.2`
      );
    } else if (filter === 'completed') {
      query = query.eq('game_state', 3);
    }

    // Text search in question and creator
    if (debouncedSearchQuery.trim()) {
      query = query.or(
        `question_text.ilike.%${debouncedSearchQuery}%,creator_address.ilike.%${debouncedSearchQuery}%`
      );
    }

    // Entry fee range filtering
    if (minFee !== '') {
      query = query.gte('entry_fee', minFee);
    }
    if (maxFee !== '') {
      query = query.lte('entry_fee', maxFee);
    }

    // Sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    const startIndex = (currentPage - 1) * gamesPerPage;
    const endIndex = startIndex + gamesPerPage - 1;
    query = query.range(startIndex, endIndex);

    return query;
  };

  // Fetch games with pagination and filtering
  const fetchGames = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error, count } = await buildQuery();

      if (error) {
        console.error('Supabase error:', error);
        setError('Failed to load games');
        return;
      }

      setGames(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to connect to database');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search query to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch games when dependencies change
  useEffect(() => {
    fetchGames();
  }, [filter, currentPage, debouncedSearchQuery, sortBy, sortOrder, minFee, maxFee]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [filter, debouncedSearchQuery, sortBy, sortOrder, minFee, maxFee]);

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
      case 3: // completed
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
          <h1 className="scroll-m-20 font-extrabold tracking-tight mb-2">
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
              { key: 'new', label: 'New' },
              { key: 'ongoing', label: 'Ongoing' },
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

        {/* Filter Controls */}
        <div className="bg-card rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="text"
                placeholder="Search question or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <Label htmlFor="sort">Sort By</Label>
              <Select
                value={`${sortBy}-${sortOrder}`}
                onValueChange={(value) => {
                  const [field, order] = value.split('-') as [typeof sortBy, typeof sortOrder];
                  setSortBy(field);
                  setSortOrder(order);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select sorting..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at-desc">Newest First</SelectItem>
                  <SelectItem value="created_at-asc">Oldest First</SelectItem>
                  <SelectItem value="entry_fee-desc">Highest Entry Fee</SelectItem>
                  <SelectItem value="entry_fee-asc">Lowest Entry Fee</SelectItem>
                  <SelectItem value="total_players-desc">Most Players</SelectItem>
                  <SelectItem value="total_players-asc">Least Players</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Entry Fee */}
            <div className="space-y-2">
              <Label htmlFor="min-fee">Min Entry Fee</Label>
              <Input
                id="min-fee"
                type="number"
                placeholder="0.0"
                value={minFee}
                onChange={(e) => setMinFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                step="0.1"
                min="0"
              />
            </div>

            {/* Max Entry Fee */}
            <div className="space-y-2">
              <Label htmlFor="max-fee">Max Entry Fee</Label>
              <Input
                id="max-fee"
                type="number"
                placeholder="∞"
                value={maxFee}
                onChange={(e) => setMaxFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                step="0.1"
                min="0"
              />
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>
                Showing {games.length === 0 ? 0 : (currentPage - 1) * gamesPerPage + 1} - {Math.min(currentPage * gamesPerPage, totalCount)} of {totalCount} games
              </span>
              {(searchQuery || minFee !== '' || maxFee !== '') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedSearchQuery('');
                    setMinFee('');
                    setMaxFee('');
                  }}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  Clear filters
                </button>
              )}
            </div>
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
            {games.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">
                  {filter === 'new' ? 'No new games available for joining' :
                    filter === 'ongoing' ? 'No ongoing games in progress' :
                      'No completed games found'}
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
                {games.map((game) => {
                  const stateInfo = formatGameState(game.game_state, game.commit_deadline);
                  const now = new Date();
                  const isNew = game.game_state === 1 && game.commit_deadline && now < new Date(game.commit_deadline);
                  const isOngoing = (game.game_state === 1 && game.commit_deadline && now >= new Date(game.commit_deadline)) || game.game_state === 2;

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
                          {isNew ? 'Join Game' : isOngoing ? 'View Game' : 'View Results'}
                        </Link>
                      </div>

                      {/* Created Date */}
                      <p className="text-xs text-muted-foreground mt-3 text-center">
                        Created {game.created_at ? new Date(game.created_at).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {!loading && !error && totalCount > gamesPerPage && (
              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.ceil(totalCount / gamesPerPage)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 text-sm rounded-md border transition-colors ${currentPage === 1
                          ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {(() => {
                        const totalPages = Math.ceil(totalCount / gamesPerPage);
                        const pages = [];

                        // Always show first page
                        if (totalPages > 0) pages.push(1);

                        // Add ellipsis and/or pages around current page
                        if (currentPage > 3) pages.push('...');

                        // Add pages around current page
                        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                          if (!pages.includes(i)) pages.push(i);
                        }

                        // Add ellipsis and last page
                        if (currentPage < totalPages - 2) pages.push('...');
                        if (totalPages > 1) pages.push(totalPages);

                        return pages.map((page, index) => (
                          <span key={index}>
                            {page === '...' ? (
                              <span className="px-2 text-muted-foreground">...</span>
                            ) : (
                              <button
                                onClick={() => setCurrentPage(page as number)}
                                className={`px-3 py-1 text-sm rounded-md border transition-colors ${currentPage === page
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background text-foreground border-border hover:bg-muted'
                                  }`}
                              >
                                {page}
                              </button>
                            )}
                          </span>
                        ));
                      })()}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / gamesPerPage), currentPage + 1))}
                      disabled={currentPage >= Math.ceil(totalCount / gamesPerPage)}
                      className={`px-3 py-1 text-sm rounded-md border transition-colors ${currentPage >= Math.ceil(totalCount / gamesPerPage)
                          ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Create Game CTA */}
        {!loading && !error && games.length > 0 && (
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
