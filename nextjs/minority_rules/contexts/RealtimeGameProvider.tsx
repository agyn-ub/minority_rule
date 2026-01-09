"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useFlowUser } from '@/lib/useFlowUser';

interface GameData {
  [key: string]: any;
}

// New hook for single game management (Option 1 pattern)
export const useRealtimeGameSingle = (gameId?: number) => {
  const { user } = useFlowUser();
  const [game, setGame] = React.useState<GameData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [hasJoined, setHasJoined] = React.useState(false);
  const [hasCommitted, setHasCommitted] = React.useState(false);
  const [hasRevealed, setHasRevealed] = React.useState(false);
  const channelRef = useRef<any>(null);

  React.useEffect(() => {
    if (!gameId || !user?.addr) {
      setLoading(false);
      return;
    }

    const fetchGameAndSubscribe = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initial fetch from Supabase
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('game_id', gameId)
          .single();

        if (gameError) {
          throw gameError;
        }

        setGame(gameData);

        // Check if user has joined this game
        const { data: playerData } = await supabase
          .from('game_players')
          .select('player_address')
          .eq('game_id', gameId)
          .eq('player_address', user.addr || '')
          .single();

        setHasJoined(!!playerData);

        if (playerData && gameData.current_round) {
          // Check commits for current round
          const { data: commitData } = await supabase
            .from('commits')
            .select('*')
            .eq('game_id', gameId)
            .eq('player_address', user.addr || '')
            .eq('round_number', gameData.current_round)
            .single();

          setHasCommitted(!!commitData);

          // Check reveals for current round
          const { data: revealData } = await supabase
            .from('reveals')
            .select('*')
            .eq('game_id', gameId)
            .eq('player_address', user.addr || '')
            .eq('round_number', gameData.current_round)
            .single();

          setHasRevealed(!!revealData);
        }

        // Clean up existing channel
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
        }

        // Set up real-time subscription for this specific game
        const channelName = `game-${gameId}-${user.addr}`;
        const channel = supabase
          .channel(channelName)
          // Game updates
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'games',
            filter: `game_id=eq.${gameId}`
          }, (payload) => {
            if (payload.new) {
              setGame(payload.new as GameData);
            }
          })
          // Player joins
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'game_players',
            filter: `game_id=eq.${gameId}`
          }, (payload) => {
            const playerData = payload.new as any;
            if (playerData.player_address === user.addr) {
              setHasJoined(true);
            }
            // Update total players count
            setGame(prev => prev ? {
              ...prev,
              total_players: (prev.total_players || 0) + 1
            } : prev);
          })
          // Commits
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'commits',
            filter: `game_id=eq.${gameId}`
          }, (payload) => {
            const commitData = payload.new as any;
            if (commitData.player_address === user.addr) {
              setGame(prev => {
                if (prev && commitData.round_number === prev.current_round) {
                  setHasCommitted(true);
                }
                return prev;
              });
            }
          })
          // Reveals
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'reveals',
            filter: `game_id=eq.${gameId}`
          }, (payload) => {
            const revealData = payload.new as any;
            if (revealData.player_address === user.addr) {
              setGame(prev => {
                if (prev && revealData.round_number === prev.current_round) {
                  setHasRevealed(true);
                }
                return prev;
              });
            }
          })
          .subscribe();

        channelRef.current = channel;

      } catch (err) {
        console.error('Error fetching game:', err);
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setLoading(false);
      }
    };

    fetchGameAndSubscribe();

    // Cleanup on unmount or gameId change
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [gameId, user?.addr]);

  // Helper functions
  const hasUserJoined = React.useCallback(() => hasJoined, [hasJoined]);
  const hasUserCommitted = React.useCallback(() => hasCommitted, [hasCommitted]);
  const hasUserRevealed = React.useCallback(() => hasRevealed, [hasRevealed]);

  return {
    game,
    loading,
    error,
    hasUserJoined,
    hasUserCommitted,
    hasUserRevealed
  };
};

// Simple connection status hook for create page
export const useRealtimeConnection = () => {
  const { user } = useFlowUser();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user?.addr) {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      return;
    }

    // Clean up existing channel if any
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('Error removing existing channel:', error);
      }
    }

    // Simple channel just for connection monitoring
    const channelName = `connection-status-${user.addr}`;
    const channel = supabase
      .channel(channelName)
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
        setConnectionStatus(status);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔗 REALTIME CONNECTION: Status:', status);
        }
        
        // Retry connection if failed
        if (status === 'CHANNEL_ERROR') {
          setTimeout(() => {
            try {
              channel.subscribe();
            } catch (error) {
              console.warn('Connection retry failed:', error);
            }
          }, 2000);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          console.warn('Error cleaning up connection channel:', error);
        }
        channelRef.current = null;
      }
    };
  }, [user?.addr]);

  return { isConnected, connectionStatus };
};