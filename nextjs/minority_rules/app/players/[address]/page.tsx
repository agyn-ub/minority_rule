"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Types for player data
type PlayerDetail = {
  player_address: string;
  display_name: string | null;
  total_games: number | null;
  total_wins: number | null;
  total_earnings: number | null;
  created_at: string | null;
  games_created: number;
};

type GameHistory = {
  game_id: number;
  question_text: string;
  entry_fee: number;
  game_state: number;
  status: string | null; // 'active', 'eliminated', 'winner'
  prize_amount: number;
  created_at: string;
  joined_at: string;
};

type CreatedGame = {
  game_id: number;
  question_text: string;
  entry_fee: number;
  game_state: number;
  total_players: number | null;
  created_at: string | null;
};

type RoundDetail = {
  round_number: number;
  yes_count: number;
  no_count: number;
  minority_vote: boolean; // true if YES was minority
  votes_remaining: number;
  completed_at: string | null;
  player_vote?: boolean; // player's vote this round (true=YES, false=NO)
  player_survived: boolean;
};

type VotingDetail = {
  round_number: number;
  commit_hash: string;
  committed_at: string;
  vote_value: boolean; // true=YES, false=NO
  salt: string;
  revealed_at: string | null;
};

type GameDetailData = {
  rounds: RoundDetail[];
  voting_details: VotingDetail[];
  total_rounds: number;
  final_status: string;
  total_prize: number;
};

export default function PlayerStatsPage() {
  const params = useParams();
  const router = useRouter();
  const playerAddress = params.address as string;

  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [createdGames, setCreatedGames] = useState<CreatedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Game history pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage] = useState(10);
  const [totalHistoryCount, setTotalHistoryCount] = useState(0);

  // Created games pagination  
  const [createdPage, setCreatedPage] = useState(1);
  const [createdPerPage] = useState(10);
  const [totalCreatedCount, setTotalCreatedCount] = useState(0);

  // Current tab
  const [activeTab, setActiveTab] = useState<'history' | 'created'>('history');

  // Expanded games state
  const [expandedGames, setExpandedGames] = useState<Set<number>>(new Set());
  const [gameDetails, setGameDetails] = useState<Map<number, GameDetailData>>(new Map());
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());

  // Helper functions
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatFlow = (amount: number) => {
    return amount.toFixed(4);
  };

  const getGameStateName = (state: number): string => {
    switch (state) {
      case 0: return "Zero Phase";
      case 1: return "Commit Phase";
      case 2: return "Reveal Phase";
      case 3: return "Completed";
      default: return "Unknown";
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'winner': return 'bg-green-100 text-green-800';
      case 'eliminated': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGameStateColor = (state: number): string => {
    switch (state) {
      case 0: return 'bg-gray-100 text-gray-800';
      case 1: return 'bg-blue-100 text-blue-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Fetch detailed game data for a specific game
  const fetchGameDetails = async (gameId: number) => {
    try {
      setLoadingDetails(prev => new Set([...prev, gameId]));

      // Fetch rounds data
      const { data: rounds, error: roundsError } = await supabase
        .from('rounds')
        .select('*')
        .eq('game_id', gameId)
        .order('round_number', { ascending: true });

      if (roundsError) {
        console.error('Rounds error:', roundsError);
        return;
      }

      // Fetch player's commits for this game
      const { data: commits, error: commitsError } = await supabase
        .from('commits')
        .select('*')
        .eq('game_id', gameId)
        .eq('player_address', playerAddress)
        .order('round_number', { ascending: true });

      if (commitsError) {
        console.error('Commits error:', commitsError);
      }

      // Fetch player's reveals for this game
      const { data: reveals, error: revealsError } = await supabase
        .from('reveals')
        .select('*')
        .eq('game_id', gameId)
        .eq('player_address', playerAddress)
        .order('round_number', { ascending: true });

      if (revealsError) {
        console.error('Reveals error:', revealsError);
      }

      // Get player's final status and prize
      const gameHistoryItem = gameHistory.find(g => g.game_id === gameId);
      const finalStatus = gameHistoryItem?.status || 'unknown';
      const totalPrize = gameHistoryItem?.prize_amount || 0;

      // Create reveals map for easier lookup
      const revealsMap = (reveals || []).reduce((acc, reveal) => {
        acc[reveal.round_number] = reveal;
        return acc;
      }, {} as Record<number, any>);

      // Create commits map for easier lookup
      const commitsMap = (commits || []).reduce((acc, commit) => {
        acc[commit.round_number] = commit;
        return acc;
      }, {} as Record<number, any>);

      // Process rounds data to include player's vote and survival info
      const roundDetails: RoundDetail[] = (rounds || []).map(round => {
        const playerReveal = revealsMap[round.round_number];
        const playerVote = playerReveal?.vote_value;
        
        // Determine if player survived this round
        // Player survives if they voted with the minority
        const votedWithMinority = playerVote !== undefined && 
          ((round.minority_vote && playerVote) || (!round.minority_vote && !playerVote));
        
        return {
          round_number: round.round_number,
          yes_count: round.yes_count,
          no_count: round.no_count,
          minority_vote: round.minority_vote,
          votes_remaining: round.votes_remaining,
          completed_at: round.completed_at,
          player_vote: playerVote,
          player_survived: votedWithMinority
        };
      });

      // Process voting details
      const votingDetails: VotingDetail[] = (reveals || []).map(reveal => ({
        round_number: reveal.round_number,
        commit_hash: commitsMap[reveal.round_number]?.commit_hash || '',
        committed_at: commitsMap[reveal.round_number]?.committed_at || '',
        vote_value: reveal.vote_value,
        salt: reveal.salt,
        revealed_at: reveal.revealed_at
      }));

      const gameDetailData: GameDetailData = {
        rounds: roundDetails,
        voting_details: votingDetails,
        total_rounds: roundDetails.length,
        final_status: finalStatus,
        total_prize: totalPrize
      };

      setGameDetails(prev => new Map(prev.set(gameId, gameDetailData)));

    } catch (err) {
      console.error('Game details fetch error:', err);
    } finally {
      setLoadingDetails(prev => {
        const newSet = new Set(prev);
        newSet.delete(gameId);
        return newSet;
      });
    }
  };

  // Toggle game expansion
  const toggleGameExpansion = async (gameId: number) => {
    const isExpanded = expandedGames.has(gameId);
    
    if (isExpanded) {
      // Collapse
      setExpandedGames(prev => {
        const newSet = new Set(prev);
        newSet.delete(gameId);
        return newSet;
      });
    } else {
      // Expand
      setExpandedGames(prev => new Set([...prev, gameId]));
      
      // Fetch details if not already cached
      if (!gameDetails.has(gameId)) {
        await fetchGameDetails(gameId);
      }
    }
  };

  // Fetch player profile data
  const fetchPlayerProfile = async () => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('player_address', playerAddress)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        setError('Player not found');
        return;
      }

      // Count games created by this player
      const { count: gamesCreated } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('creator_address', playerAddress);

      setPlayer({
        ...profile,
        games_created: gamesCreated || 0
      });

    } catch (err) {
      console.error('Profile fetch error:', err);
      setError('Failed to load player data');
    }
  };

  // Fetch game history with pagination
  const fetchGameHistory = async () => {
    try {
      // Get total count
      const { count } = await supabase
        .from('game_players')
        .select('*', { count: 'exact', head: true })
        .eq('player_address', playerAddress);

      setTotalHistoryCount(count || 0);

      // Get paginated history
      const startIndex = (historyPage - 1) * historyPerPage;
      const { data: gameHistory, error: historyError } = await supabase
        .from('game_players')
        .select(`
          game_id,
          status,
          joined_at,
          games (
            question_text,
            entry_fee,
            game_state,
            created_at
          )
        `)
        .eq('player_address', playerAddress)
        .order('joined_at', { ascending: false })
        .range(startIndex, startIndex + historyPerPage - 1);

      if (historyError) {
        console.error('History error:', historyError);
        return;
      }

      // Fetch prize distributions for this player
      const { data: prizes, error: prizeError } = await supabase
        .from('prize_distributions')
        .select('game_id, amount')
        .eq('winner_address', playerAddress);

      if (prizeError) {
        console.error('Prize error:', prizeError);
      }

      // Create a map of prizes by game_id
      const prizeMap = (prizes || []).reduce((acc, prize) => {
        acc[prize.game_id] = prize.amount;
        return acc;
      }, {} as Record<number, number>);

      // Transform game history
      const transformedHistory: GameHistory[] = (gameHistory || []).map(item => ({
        game_id: item.game_id,
        question_text: item.games?.question_text || 'Unknown',
        entry_fee: item.games?.entry_fee || 0,
        game_state: item.games?.game_state || 0,
        status: item.status,
        prize_amount: prizeMap[item.game_id] || 0,
        created_at: item.games?.created_at || new Date().toISOString(),
        joined_at: item.joined_at || new Date().toISOString()
      }));

      setGameHistory(transformedHistory);

    } catch (err) {
      console.error('History fetch error:', err);
    }
  };

  // Fetch created games with pagination
  const fetchCreatedGames = async () => {
    try {
      // Get total count
      const { count } = await supabase
        .from('games')
        .select('*', { count: 'exact', head: true })
        .eq('creator_address', playerAddress);

      setTotalCreatedCount(count || 0);

      // Get paginated created games
      const startIndex = (createdPage - 1) * createdPerPage;
      const { data: created, error: createdError } = await supabase
        .from('games')
        .select('game_id, question_text, entry_fee, game_state, total_players, created_at')
        .eq('creator_address', playerAddress)
        .order('created_at', { ascending: false })
        .range(startIndex, startIndex + createdPerPage - 1);

      if (createdError) {
        console.error('Created games error:', createdError);
        return;
      }

      setCreatedGames(created || []);

    } catch (err) {
      console.error('Created games fetch error:', err);
    }
  };

  // Load all data
  useEffect(() => {
    const loadPlayerData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPlayerProfile(),
        fetchGameHistory(),
        fetchCreatedGames()
      ]);
      setLoading(false);
    };

    if (playerAddress) {
      loadPlayerData();
    }
  }, [playerAddress]);

  // Update game history when page changes
  useEffect(() => {
    if (player) {
      fetchGameHistory();
    }
  }, [historyPage]);

  // Update created games when page changes
  useEffect(() => {
    if (player) {
      fetchCreatedGames();
    }
  }, [createdPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            <p className="mt-2 text-muted-foreground">Loading player statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center py-12">
            <h1 className="scroll-m-20 font-extrabold tracking-tight mb-4">
              Player Not Found
            </h1>
            <p className="text-muted-foreground mb-6">
              {error || 'This player does not exist or has not played any games.'}
            </p>
            <Link
              href="/players"
              className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Back to Players
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Link href="/players" className="hover:text-foreground transition-colors">
              Players
            </Link>
            <span>›</span>
            <span className="text-foreground">
              {player.display_name || formatAddress(playerAddress)}
            </span>
          </nav>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="scroll-m-20 font-extrabold tracking-tight">
              {player.display_name || formatAddress(playerAddress)}
            </h1>
            <span className="text-sm font-mono text-muted-foreground bg-muted px-2 py-1 rounded">
              {formatAddress(playerAddress)}
            </span>
          </div>
          <p className="text-muted-foreground">
            Player statistics and game history
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-lg shadow-sm p-6 border">
            <div className="text-3xl mb-2">🎮</div>
            <div className="text-3xl font-bold text-blue-600">{player.total_games || 0}</div>
            <div className="text-sm text-muted-foreground">Total Games</div>
          </div>
          
          <div className="bg-card rounded-lg shadow-sm p-6 border">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-3xl font-bold text-green-600">{player.total_wins || 0}</div>
            <div className="text-sm text-muted-foreground">Wins</div>
          </div>
          
          <div className="bg-card rounded-lg shadow-sm p-6 border">
            <div className="text-3xl mb-2">💰</div>
            <div className="text-3xl font-bold text-purple-600">{formatFlow(player.total_earnings || 0)}</div>
            <div className="text-sm text-muted-foreground">Total Earnings</div>
          </div>
          
          <div className="bg-card rounded-lg shadow-sm p-6 border">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-3xl font-bold text-orange-600">{player.games_created}</div>
            <div className="text-sm text-muted-foreground">Games Created</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-lg shadow-sm p-6 border text-center">
            <div className="text-2xl font-bold mb-1">
              {(player.total_games || 0) > 0 
                ? (((player.total_wins || 0) / (player.total_games || 0)) * 100).toFixed(1)
                : 0}%
            </div>
            <div className="text-sm text-muted-foreground">Win Rate</div>
          </div>
          
          <div className="bg-card rounded-lg shadow-sm p-6 border text-center">
            <div className="text-2xl font-bold mb-1">
              {(player.total_games || 0) > 0 
                ? formatFlow((player.total_earnings || 0) / (player.total_games || 0))
                : '0.0000'} FLOW
            </div>
            <div className="text-sm text-muted-foreground">Avg Earnings per Game</div>
          </div>
          
          <div className="bg-card rounded-lg shadow-sm p-6 border text-center">
            <div className="text-2xl font-bold mb-1">
              {player.created_at ? new Date(player.created_at).toLocaleDateString() : 'N/A'}
            </div>
            <div className="text-sm text-muted-foreground">Player Since</div>
          </div>
        </div>

        {/* Tabs for History and Created Games */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-card rounded-lg p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Game History ({totalHistoryCount})
            </button>
            <button
              onClick={() => setActiveTab('created')}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                activeTab === 'created'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Created Games ({totalCreatedCount})
            </button>
          </div>
        </div>

        {/* Game History Tab */}
        {activeTab === 'history' && (
          <div>
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 mb-6">
              Game History
            </h2>
            
            {gameHistory.length > 0 ? (
              <>
                <div className="bg-card rounded-lg shadow-sm border overflow-hidden mb-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Game</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Question</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Entry Fee</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Prize</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gameHistory.map((game) => {
                          const isExpanded = expandedGames.has(game.game_id);
                          const isLoading = loadingDetails.has(game.game_id);
                          const details = gameDetails.get(game.game_id);

                          return (
                            <React.Fragment key={game.game_id}>
                              <tr className="border-b hover:bg-muted/25 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleGameExpansion(game.game_id)}
                                      className="w-6 h-6 flex items-center justify-center rounded border bg-background hover:bg-muted transition-colors"
                                      disabled={isLoading}
                                    >
                                      {isLoading ? (
                                        <div className="w-3 h-3 border border-t-foreground rounded-full animate-spin"></div>
                                      ) : isExpanded ? (
                                        <span className="text-xs">−</span>
                                      ) : (
                                        <span className="text-xs">+</span>
                                      )}
                                    </button>
                                    <Link 
                                      href={`/games/${game.game_id}`}
                                      className="text-sm font-medium text-primary hover:text-primary/80"
                                    >
                                      #{game.game_id}
                                    </Link>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  <div className="max-w-xs truncate" title={game.question_text}>
                                    {game.question_text}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-center text-sm">
                                  {formatFlow(game.entry_fee)} FLOW
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(game.status || 'unknown')}`}>
                                    {(game.status || 'unknown').charAt(0).toUpperCase() + (game.status || 'unknown').slice(1)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center text-sm">
                                  {game.prize_amount > 0 ? (
                                    <span className="font-medium text-green-600">
                                      {formatFlow(game.prize_amount)} FLOW
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                                  {new Date(game.joined_at).toLocaleDateString()}
                                </td>
                              </tr>
                              
                              {/* Expanded Details Row */}
                              {isExpanded && details && (
                                <tr>
                                  <td colSpan={6} className="px-4 py-6 bg-muted/25">
                                    <div className="space-y-6">
                                      {/* Game Overview */}
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <div className="text-center">
                                          <div className="text-lg font-semibold">{details.total_rounds}</div>
                                          <div className="text-sm text-muted-foreground">Total Rounds</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-lg font-semibold capitalize">{details.final_status}</div>
                                          <div className="text-sm text-muted-foreground">Final Status</div>
                                        </div>
                                        <div className="text-center">
                                          <div className="text-lg font-semibold text-green-600">
                                            {formatFlow(details.total_prize)} FLOW
                                          </div>
                                          <div className="text-sm text-muted-foreground">Prize Won</div>
                                        </div>
                                      </div>

                                      {/* Round Progression */}
                                      <div>
                                        <h4 className="font-semibold mb-3">Round Progression</h4>
                                        <div className="space-y-2">
                                          {details.rounds.map((round) => (
                                            <div key={round.round_number} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                                              <div className="font-medium text-sm w-16">
                                                Round {round.round_number}
                                              </div>
                                              
                                              <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                  round.player_vote === true ? 'bg-blue-100 text-blue-800' :
                                                  round.player_vote === false ? 'bg-orange-100 text-orange-800' :
                                                  'bg-gray-100 text-gray-800'
                                                }`}>
                                                  {round.player_vote === true ? 'YES' : round.player_vote === false ? 'NO' : 'N/A'}
                                                </span>
                                                
                                                <span className={`text-lg ${round.player_survived ? 'text-green-600' : 'text-red-600'}`}>
                                                  {round.player_survived ? '✅' : '❌'}
                                                </span>
                                              </div>
                                              
                                              <div className="text-sm text-muted-foreground">
                                                {round.yes_count} YES / {round.no_count} NO
                                              </div>
                                              
                                              <div className="text-sm">
                                                <span className={`font-medium ${
                                                  round.minority_vote ? 'text-blue-600' : 'text-orange-600'
                                                }`}>
                                                  {round.minority_vote ? 'YES' : 'NO'} minority
                                                </span>
                                              </div>
                                              
                                              <div className="text-sm text-muted-foreground ml-auto">
                                                {round.votes_remaining} remaining
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Voting Details */}
                                      {details.voting_details.length > 0 && (
                                        <div>
                                          <h4 className="font-semibold mb-3">Voting Details</h4>
                                          <div className="bg-background rounded-lg border overflow-hidden">
                                            <div className="overflow-x-auto">
                                              <table className="w-full">
                                                <thead className="bg-muted/50 border-b">
                                                  <tr>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Round</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Commit Hash</th>
                                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Vote</th>
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Salt</th>
                                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Committed</th>
                                                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Revealed</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {details.voting_details.map((vote) => (
                                                    <tr key={vote.round_number} className="border-b">
                                                      <td className="px-3 py-2 text-sm font-medium">{vote.round_number}</td>
                                                      <td className="px-3 py-2 text-xs font-mono">
                                                        {vote.commit_hash ? `${vote.commit_hash.slice(0, 8)}...` : 'N/A'}
                                                      </td>
                                                      <td className="px-3 py-2 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                          vote.vote_value ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                                                        }`}>
                                                          {vote.vote_value ? 'YES' : 'NO'}
                                                        </span>
                                                      </td>
                                                      <td className="px-3 py-2 text-xs font-mono">
                                                        {vote.salt ? `${vote.salt.slice(0, 8)}...` : 'N/A'}
                                                      </td>
                                                      <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                                                        {vote.committed_at ? new Date(vote.committed_at).toLocaleTimeString() : 'N/A'}
                                                      </td>
                                                      <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                                                        {vote.revealed_at ? new Date(vote.revealed_at).toLocaleTimeString() : 'N/A'}
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Game History Pagination */}
                {totalHistoryCount > historyPerPage && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {historyPage} of {Math.ceil(totalHistoryCount / historyPerPage)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                        disabled={historyPage === 1}
                        className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                          historyPage === 1
                            ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                            : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm">
                        {historyPage} / {Math.ceil(totalHistoryCount / historyPerPage)}
                      </span>
                      <button
                        onClick={() => setHistoryPage(Math.min(Math.ceil(totalHistoryCount / historyPerPage), historyPage + 1))}
                        disabled={historyPage >= Math.ceil(totalHistoryCount / historyPerPage)}
                        className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                          historyPage >= Math.ceil(totalHistoryCount / historyPerPage)
                            ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                            : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">This player has not joined any games yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Created Games Tab */}
        {activeTab === 'created' && (
          <div>
            <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0 mb-6">
              Created Games
            </h2>
            
            {createdGames.length > 0 ? (
              <>
                <div className="bg-card rounded-lg shadow-sm border overflow-hidden mb-6">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Game</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Question</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Entry Fee</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Players</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {createdGames.map((game) => (
                          <tr key={game.game_id} className="border-b hover:bg-muted/25 transition-colors">
                            <td className="px-4 py-3">
                              <Link 
                                href={`/games/${game.game_id}`}
                                className="text-sm font-medium text-primary hover:text-primary/80"
                              >
                                #{game.game_id}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="max-w-xs truncate" title={game.question_text}>
                                {game.question_text}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {formatFlow(game.entry_fee)} FLOW
                            </td>
                            <td className="px-4 py-3 text-center text-sm">
                              {game.total_players || 0}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGameStateColor(game.game_state)}`}>
                                {getGameStateName(game.game_state)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-muted-foreground">
                              {game.created_at ? new Date(game.created_at).toLocaleDateString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Created Games Pagination */}
                {totalCreatedCount > createdPerPage && (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Page {createdPage} of {Math.ceil(totalCreatedCount / createdPerPage)}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCreatedPage(Math.max(1, createdPage - 1))}
                        disabled={createdPage === 1}
                        className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                          createdPage === 1
                            ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                            : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm">
                        {createdPage} / {Math.ceil(totalCreatedCount / createdPerPage)}
                      </span>
                      <button
                        onClick={() => setCreatedPage(Math.min(Math.ceil(totalCreatedCount / createdPerPage), createdPage + 1))}
                        disabled={createdPage >= Math.ceil(totalCreatedCount / createdPerPage)}
                        className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                          createdPage >= Math.ceil(totalCreatedCount / createdPerPage)
                            ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                            : 'bg-background text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">This player has not created any games yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}