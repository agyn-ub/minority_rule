"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useFlowUser } from '@/lib/useFlowUser';

interface GameEvent {
  type: 'game_created';
  payload: any;
  timestamp: string;
}

interface RealtimeGameContextType {
  isConnected: boolean;
  connectionStatus: string;
  lastEvent: GameEvent | null;
}

const RealtimeGameContext = createContext<RealtimeGameContextType>({
  isConnected: false,
  connectionStatus: 'disconnected',
  lastEvent: null,
});

export const useRealtimeGame = () => {
  const context = useContext(RealtimeGameContext);
  if (!context) {
    throw new Error('useRealtimeGame must be used within a RealtimeGameProvider');
  }
  return context;
};

export const RealtimeGameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useFlowUser();
  const router = useRouter();
  const channelRef = useRef<any>(null);
  
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastEvent, setLastEvent] = useState<GameEvent | null>(null);

  useEffect(() => {
    if (!user?.addr) {
      return;
    }


    // Clean up existing channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create unique channel name with timestamp
    const channelName = `global-games-${user.addr}-${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'games',
        filter: `creator_address=eq.${user.addr}`
      }, (payload) => {
        
        const gameEvent: GameEvent = {
          type: 'game_created',
          payload: payload.new,
          timestamp: new Date().toISOString(),
        };
        
        setLastEvent(gameEvent);
        
        // Auto-redirect to the new game
        if (payload.new?.game_id) {
          router.push(`/my-games/${payload.new.game_id}`);
        }
      })
      .subscribe((status) => {
        setConnectionStatus(status);
        setIsConnected(status === 'SUBSCRIBED');
        
        // Retry connection if failed
        if (status === 'CHANNEL_ERROR') {
          setTimeout(() => {
            channel.subscribe();
          }, 2000);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.addr, router]);

  return (
    <RealtimeGameContext.Provider
      value={{
        isConnected,
        connectionStatus,
        lastEvent,
      }}
    >
      {children}
    </RealtimeGameContext.Provider>
  );
};