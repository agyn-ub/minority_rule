"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useFlowUser } from '@/lib/useFlowUser';

interface GameData {
  [key: string]: any;
}

// Context for sharing game data via WebSocket
interface WebSocketGameContextType {
  game: GameData | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  connectionStatus: string;
  participationStatus: {
    hasJoined: boolean;
    hasCommitted: boolean;
    hasRevealed: boolean;
  } | null;
}

const WebSocketGameContext = createContext<WebSocketGameContextType | null>(null);

// Provider component that manages WebSocket game data
interface WebSocketGameProviderProps {
  children: React.ReactNode;
  gameId: number;
  userLoading?: boolean;
}

export const WebSocketGameProvider: React.FC<WebSocketGameProviderProps> = ({ children, gameId, userLoading = false }) => {
  const { user } = useFlowUser();
  const [game, setGame] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [participationStatus, setParticipationStatus] = useState<{
    hasJoined: boolean;
    hasCommitted: boolean;
    hasRevealed: boolean;
  } | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const wsUrl = process.env.NEXT_PUBLIC_INDEXER_WS_URL || 'ws://localhost:8080';

  // Debounced game state update to prevent rapid successive updates
  const debouncedGameUpdate = (newGameData: GameData) => {
    if (updateDebounceRef.current) {
      clearTimeout(updateDebounceRef.current);
    }

    updateDebounceRef.current = setTimeout(() => {
      setGame(prev => {
        // Only update if data has actually changed
        if (!prev || JSON.stringify(prev) !== JSON.stringify(newGameData)) {
          return newGameData;
        }
        return prev;
      });
      setLoading(false);
    }, 100); // 100ms debounce
  };

  useEffect(() => {
    console.log('🔍 WebSocket Debug - gameId:', gameId, 'user:', user, 'userLoading:', userLoading);
    
    // Check user participation status
    const checkParticipationStatus = async (gameId: number, userAddress: string, currentRound: number) => {
      try {
        console.log('🔍 Checking participation status for gameId:', gameId, 'userAddress:', userAddress, 'currentRound:', currentRound);
        const { supabase } = await import('@/lib/supabase');

        // Check if user has joined
        const { data: playerData } = await supabase
          .from('game_players')
          .select('player_address')
          .eq('game_id', gameId)
          .eq('player_address', userAddress)
          .single();

        const hasJoined = !!playerData;
        console.log('🔍 Player join check - hasJoined:', hasJoined, 'currentRound:', currentRound);

        let hasCommitted = false;
        let hasRevealed = false;

        if (hasJoined && currentRound) {
          console.log('🔍 Proceeding to check commits and reveals');
          // Check commits for current round
          const { data: commitData } = await supabase
            .from('commits')
            .select('*')
            .eq('game_id', gameId)
            .eq('player_address', userAddress)
            .eq('round_number', currentRound)
            .single();

          console.log(`🔍 Commit data:`, commitData);
          hasCommitted = !!commitData;

          // Check reveals for current round
          const { data: revealData } = await supabase
            .from('reveals')
            .select('*')
            .eq('game_id', gameId)
            .eq('player_address', userAddress)
            .eq('round_number', currentRound)
            .single();

          hasRevealed = !!revealData;
        }

        console.log('🔍 Setting final participation status:', { hasJoined, hasCommitted, hasRevealed });
        setParticipationStatus({
          hasJoined,
          hasCommitted,
          hasRevealed
        });
      } catch (err) {
        console.error('Error checking participation status:', err);
      }
    };

    // Fetch initial game data via HTTP
    const fetchInitialGameData = async () => {
      try {
        setLoading(true);

        // Fetch from Supabase for initial data (WebSocket handles updates)
        const { supabase } = await import('@/lib/supabase');
        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('game_id', gameId)
          .single();

        if (gameError) {
          throw gameError;
        }

        setGame(gameData);

        // Check initial participation status if user is authenticated
        if (user?.addr && gameData && gameData.current_round) {
          console.log('🔍 About to check participation status after initial fetch');
          await checkParticipationStatus(gameData.game_id, user.addr, gameData.current_round);
        } else {
          console.log('🛑 Skipping participation check - user.addr:', !!user?.addr, 'gameData:', !!gameData, 'current_round:', gameData?.current_round);
        }
      } catch (err) {
        console.error('Error fetching initial game data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load game');
      } finally {
        setLoading(false);
      }
    };

    // Wait for user loading to complete before making decisions
    if (userLoading) {
      console.log('🛑 Waiting for user authentication to complete...');
      return;
    }
    
    // If no gameId, we can't proceed
    if (!gameId) {
      console.log('🛑 No gameId provided');
      setLoading(false);
      setError('Invalid game ID');
      return;
    }
    
    // For unauthenticated users, fetch game data directly (public view)
    if (!user?.addr || !user?.loggedIn) {
      console.log('🔍 User not authenticated, fetching game data for public view');
      fetchInitialGameData();
      return;
    }

    const connectWebSocket = () => {
      try {
        // Close existing connection if any
        if (wsRef.current) {
          wsRef.current.close();
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          setConnectionStatus('connected');
          setError(null);

          // Subscribe to game updates
          ws.send(JSON.stringify({
            action: 'subscribe',
            gameId: gameId
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            switch (data.type) {
              case 'welcome':
                break;

              case 'subscription-confirmed':
                // Initial game data fetch since we're now connected
                fetchInitialGameData();
                break;

              case 'game-update':
                if (data.gameId === gameId && data.data) {
                  debouncedGameUpdate(data.data);
                }
                break;

              case 'player-action':
                if (data.gameId === gameId) {
                  handlePlayerAction(data);
                }
                break;

              case 'round-completed':
                if (data.gameId === gameId && data.gameData) {
                  debouncedGameUpdate(data.gameData);
                  // Reset commitment and reveal status for new round
                  setParticipationStatus(prev => prev ? { ...prev, hasCommitted: false, hasRevealed: false } : null);
                }
                break;

              case 'game-completed':
                if (data.gameId === gameId && data.gameData) {
                  debouncedGameUpdate(data.gameData);
                }
                break;

              default:
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          setIsConnected(false);
          setConnectionStatus('disconnected');

          // Attempt to reconnect after 3 seconds
          if (event.code !== 1000) { // Not a normal closure
            reconnectTimeoutRef.current = setTimeout(() => {
              connectWebSocket();
            }, 3000);
          }
        };

        ws.onerror = (error) => {
          console.error(`❌ WebSocket error:`, error);
          setError('WebSocket connection error');
          setConnectionStatus('error');
        };

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setError('Failed to connect to real-time service');
        setConnectionStatus('error');
      }
    };

    // Handle player actions from WebSocket
    const handlePlayerAction = (data: any) => {
      switch (data.action) {
        case 'joined':
          if (data.gameData) {
            debouncedGameUpdate(data.gameData);
          }
          // If this is the current user joining
          if (data.playerAddress === user?.addr) {
            setParticipationStatus(prev => prev ? { ...prev, hasJoined: true } : { hasJoined: true, hasCommitted: false, hasRevealed: false });
          }
          break;
        case 'committed':
          // If this is the current user committing
          if (data.playerAddress === user?.addr) {
            setParticipationStatus(prev => prev ? { ...prev, hasCommitted: true } : { hasJoined: true, hasCommitted: true, hasRevealed: false });
          }
          break;
        case 'revealed':
          // If this is the current user revealing
          if (data.playerAddress === user?.addr) {
            setParticipationStatus(prev => prev ? { ...prev, hasRevealed: true } : { hasJoined: true, hasCommitted: true, hasRevealed: true });
          }
          break;
        default:
      }
    };

    // Start connection
    connectWebSocket();

    // Cleanup function
    return () => {

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (updateDebounceRef.current) {
        clearTimeout(updateDebounceRef.current);
      }

      if (wsRef.current) {
        // Unsubscribe from game
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            action: 'unsubscribe',
            gameId: gameId
          }));
        }
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, [gameId, user?.addr, user?.loggedIn, userLoading, wsUrl]);

  const contextValue: WebSocketGameContextType = {
    game,
    loading,
    error,
    isConnected,
    connectionStatus,
    participationStatus
  };

  return (
    <WebSocketGameContext.Provider value={contextValue}>
      {children}
    </WebSocketGameContext.Provider>
  );
};

// Hook to use WebSocket game context
export const useWebSocketGameContext = () => {
  const context = useContext(WebSocketGameContext);
  if (!context) {
    throw new Error('useWebSocketGameContext must be used within a WebSocketGameProvider');
  }
  return context;
};