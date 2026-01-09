"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Type for player statistics
type PlayerStats = {
  player_address: string;
  display_name: string | null;
  total_games: number | null;
  total_wins: number | null;
  total_earnings: number | null;
  win_rate: number;
  avg_earnings_per_game: number;
  last_active: string | null;
  rank: number;
};


export default function PlayersPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [playersPerPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'total_wins' | 'total_earnings' | 'win_rate' | 'total_games'>('total_earnings');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Helper function to format address
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format FLOW amount
  const formatFlow = (amount: number) => {
    return amount.toFixed(4);
  };

  // Handle player row click - navigate to player page
  const handlePlayerClick = (player: PlayerStats) => {
    router.push(`/players/${player.player_address}`);
  };

  // Fetch players with aggregated statistics
  const fetchPlayers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build the query for aggregated player statistics
      let query = `
        WITH player_stats AS (
          SELECT 
            up.player_address,
            up.display_name,
            up.total_games,
            up.total_wins,
            COALESCE(prize_totals.total_earnings, 0) as total_earnings,
            CASE 
              WHEN up.total_games > 0 THEN ROUND((up.total_wins::decimal / up.total_games::decimal) * 100, 2)
              ELSE 0 
            END as win_rate,
            CASE 
              WHEN up.total_games > 0 THEN ROUND(COALESCE(prize_totals.total_earnings, 0) / up.total_games, 4)
              ELSE 0 
            END as avg_earnings_per_game,
            last_games.last_active
          FROM user_profiles up
          LEFT JOIN (
            SELECT 
              winner_address,
              SUM(amount) as total_earnings
            FROM prize_distributions
            GROUP BY winner_address
          ) prize_totals ON up.player_address = prize_totals.winner_address
          LEFT JOIN (
            SELECT 
              gp.player_address,
              MAX(g.created_at) as last_active
            FROM game_players gp
            JOIN games g ON gp.game_id = g.game_id
            GROUP BY gp.player_address
          ) last_games ON up.player_address = last_games.player_address
          WHERE up.total_games > 0
        )
        SELECT *,
          ROW_NUMBER() OVER (ORDER BY ${sortBy} ${sortOrder.toUpperCase()}) as rank
        FROM player_stats
      `;

      // Add search filter
      if (debouncedSearchQuery.trim()) {
        query += ` WHERE (player_address ILIKE '%${debouncedSearchQuery}%' OR display_name ILIKE '%${debouncedSearchQuery}%')`;
      }

      // Add pagination
      const startIndex = (currentPage - 1) * playersPerPage;
      query += ` LIMIT ${playersPerPage} OFFSET ${startIndex}`;

      const { data, error: queryError } = await (supabase as any).rpc('execute_sql', { sql: query });
      
      if (queryError) {
        console.error('Query error:', queryError);
        // Fallback to simpler query if custom function doesn't exist
        return await fetchPlayersSimple();
      }

      setPlayers(data || []);
      
      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as count
        FROM user_profiles up
        WHERE up.total_games > 0
      `;
      
      if (debouncedSearchQuery.trim()) {
        countQuery += ` AND (up.player_address ILIKE '%${debouncedSearchQuery}%' OR up.display_name ILIKE '%${debouncedSearchQuery}%')`;
      }

      const { data: countData } = await (supabase as any).rpc('execute_sql', { sql: countQuery });
      setTotalCount(countData?.[0]?.count || 0);

    } catch (err) {
      console.error('Fetch error:', err);
      await fetchPlayersSimple();
    } finally {
      setLoading(false);
    }
  };

  // Simplified fallback query using standard Supabase methods
  const fetchPlayersSimple = async () => {
    try {
      let query = supabase
        .from('user_profiles')
        .select('*', { count: 'exact' })
        .gt('total_games', 0);

      // Add search filter
      if (debouncedSearchQuery.trim()) {
        query = query.or(`player_address.ilike.%${debouncedSearchQuery}%,display_name.ilike.%${debouncedSearchQuery}%`);
      }

      // Add sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Add pagination
      const startIndex = (currentPage - 1) * playersPerPage;
      const endIndex = startIndex + playersPerPage - 1;
      query = query.range(startIndex, endIndex);

      const { data, error, count } = await query;

      if (error) {
        console.error('Simple query error:', error);
        setError('Failed to load players');
        return;
      }

      // Transform data to match expected format
      const transformedData = (data || []).map((player, index) => ({
        ...player,
        win_rate: (player.total_games || 0) > 0 ? ((player.total_wins || 0) / (player.total_games || 0)) * 100 : 0,
        avg_earnings_per_game: (player.total_games || 0) > 0 ? (player.total_earnings || 0) / (player.total_games || 0) : 0,
        last_active: null, // Will be null in simplified version
        rank: startIndex + index + 1
      }));

      setPlayers(transformedData);
      setTotalCount(count || 0);

    } catch (err) {
      console.error('Simple fetch error:', err);
      setError('Failed to connect to database');
    }
  };

  // Fetch players when dependencies change
  useEffect(() => {
    fetchPlayers();
  }, [currentPage, debouncedSearchQuery, sortBy, sortOrder]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedSearchQuery, sortBy, sortOrder]);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="scroll-m-20 font-extrabold tracking-tight mb-2">
            Players
          </h1>
          <p className="text-muted-foreground">
            View statistics and rankings of Minority Rule players
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-lg shadow-sm p-4 border">
            <div className="text-2xl mb-2">👥</div>
            <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
            <div className="text-sm text-muted-foreground">Total Players</div>
          </div>
          
          <div className="bg-card rounded-lg shadow-sm p-4 border">
            <div className="text-2xl mb-2">🎮</div>
            <div className="text-2xl font-bold text-green-600">
              {players.reduce((sum, p) => sum + (p.total_games || 0), 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Games Played</div>
          </div>
          
          <div className="bg-card rounded-lg shadow-sm p-4 border">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-2xl font-bold text-purple-600">
              {formatFlow(players.reduce((sum, p) => sum + (p.total_earnings || 0), 0))} FLOW
            </div>
            <div className="text-sm text-muted-foreground">Total Prizes Distributed</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="bg-card rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search">Search Players</Label>
              <Input
                id="search"
                type="text"
                placeholder="Search by address or name..."
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
                  <SelectItem value="total_earnings-desc">Highest Earnings</SelectItem>
                  <SelectItem value="total_earnings-asc">Lowest Earnings</SelectItem>
                  <SelectItem value="total_wins-desc">Most Wins</SelectItem>
                  <SelectItem value="total_wins-asc">Least Wins</SelectItem>
                  <SelectItem value="win_rate-desc">Highest Win Rate</SelectItem>
                  <SelectItem value="win_rate-asc">Lowest Win Rate</SelectItem>
                  <SelectItem value="total_games-desc">Most Games</SelectItem>
                  <SelectItem value="total_games-asc">Least Games</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setDebouncedSearchQuery('');
                  }}
                  className="w-full px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                >
                  Clear Search
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            <p className="mt-2 text-muted-foreground">Loading players...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <p className="text-destructive">{error}</p>
            <button
              onClick={() => fetchPlayers()}
              className="mt-2 text-primary hover:text-primary/80"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Players Table */}
        {!loading && !error && (
          <>
            <div className="bg-card rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">#</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Player</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Games</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Wins</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Win Rate</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Earnings</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Avg/Game</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          No players found
                        </td>
                      </tr>
                    ) : (
                      players.map((player) => (
                        <tr 
                          key={player.player_address} 
                          className="border-b hover:bg-muted/25 transition-colors cursor-pointer"
                          onClick={() => handlePlayerClick(player)}
                        >
                          <td className="px-4 py-3 text-sm font-medium">
                            {player.rank}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-sm">
                                {player.display_name || formatAddress(player.player_address)}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {formatAddress(player.player_address)}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            {player.total_games || 0}
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className="font-medium text-green-600">
                              {player.total_wins || 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm">
                            <span className={`font-medium ${
                              player.win_rate >= 50 ? 'text-green-600' : 'text-orange-600'
                            }`}>
                              {player.win_rate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-medium text-purple-600">
                            {formatFlow(player.total_earnings || 0)} FLOW
                          </td>
                          <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                            {formatFlow(player.avg_earnings_per_game)} FLOW
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {totalCount > playersPerPage && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {Math.ceil(totalCount / playersPerPage)}
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                        currentPage === 1
                          ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      Previous
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center space-x-1">
                      {(() => {
                        const totalPages = Math.ceil(totalCount / playersPerPage);
                        const pages = [];
                        
                        if (totalPages > 0) pages.push(1);
                        if (currentPage > 3) pages.push('...');
                        
                        for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                          if (!pages.includes(i)) pages.push(i);
                        }
                        
                        if (currentPage < totalPages - 2) pages.push('...');
                        if (totalPages > 1) pages.push(totalPages);
                        
                        return pages.map((page, index) => (
                          <span key={index}>
                            {page === '...' ? (
                              <span className="px-2 text-muted-foreground">...</span>
                            ) : (
                              <button
                                onClick={() => setCurrentPage(page as number)}
                                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                                  currentPage === page
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
                      onClick={() => setCurrentPage(Math.min(Math.ceil(totalCount / playersPerPage), currentPage + 1))}
                      disabled={currentPage >= Math.ceil(totalCount / playersPerPage)}
                      className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                        currentPage >= Math.ceil(totalCount / playersPerPage)
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
      </div>
    </div>
  );
}