"use client";

import React, { useState } from 'react';

interface DebugPanelProps {
  title: string;
  data: Record<string, any>;
  timestamp?: string;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ 
  title, 
  data, 
  timestamp = new Date().toLocaleTimeString() 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(timestamp);

  // Update timestamp when data changes
  React.useEffect(() => {
    setLastUpdate(new Date().toLocaleTimeString());
  }, [data]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <div className="bg-gray-900 text-green-400 font-mono text-xs border border-gray-700 rounded-lg mb-4">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <span className="text-yellow-400">🔍</span>
          <span className="font-semibold text-white">{title}</span>
          <span className="text-gray-400">({Object.keys(data).length} properties)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Updated: {lastUpdate}</span>
          <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
            ▶
          </span>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-700">
          {/* Quick Status */}
          <div className="p-3 bg-gray-800 border-b border-gray-700">
            <div className="flex items-center gap-4 text-xs">
              {Object.entries(data).map(([key, value]) => {
                let statusColor = 'text-gray-400';
                if (typeof value === 'boolean') {
                  statusColor = value ? 'text-green-400' : 'text-red-400';
                } else if (key.includes('loading') && value) {
                  statusColor = 'text-yellow-400';
                } else if (key.includes('error') && value) {
                  statusColor = 'text-red-400';
                }
                
                return (
                  <span key={key} className={statusColor}>
                    <strong>{key}:</strong> {String(value === null ? 'null' : value === undefined ? 'undefined' : value)}
                  </span>
                );
              })}
            </div>
          </div>

          {/* JSON View */}
          <div className="p-3 relative">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 font-semibold">Raw Data:</span>
              <button 
                onClick={copyToClipboard}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                Copy JSON
              </button>
            </div>
            <pre className="bg-black p-3 rounded border border-gray-600 max-h-96 overflow-auto">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

interface GameDebugPanelProps {
  gameHookData: {
    game: any;
    loading: boolean;
    error: string | null;
    hasUserJoined: boolean;
    hasUserCommitted: boolean; 
    hasUserRevealed: boolean;
  };
  user?: {
    addr?: string;
    loggedIn?: boolean;
  };
  gameId: string;
}

export const GameDebugPanel: React.FC<GameDebugPanelProps> = ({ 
  gameHookData, 
  user, 
  gameId 
}) => {
  const [showDebug, setShowDebug] = useState(
    process.env.NODE_ENV === 'development'
  );

  // Keyboard shortcut to toggle debug panel
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setShowDebug(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!showDebug) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setShowDebug(true)}
          className="bg-gray-800 text-green-400 px-3 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors text-sm font-mono"
        >
          🔍 Debug
        </button>
      </div>
    );
  }

  const participationStatus = {
    hasJoined: gameHookData.hasUserJoined,
    hasCommitted: gameHookData.hasUserCommitted,
    hasRevealed: gameHookData.hasUserRevealed
  };

  const hookSummary = {
    gameId: parseInt(gameId),
    loading: gameHookData.loading,
    error: gameHookData.error,
    gameExists: !!gameHookData.game,
    gameState: gameHookData.game?.game_state,
    currentRound: gameHookData.game?.current_round,
    totalPlayers: gameHookData.game?.total_players,
    ...participationStatus
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] overflow-y-auto z-50 p-2 bg-gray-900 rounded-lg">
      <div className="mb-2 flex justify-between items-center bg-gray-900 p-2 rounded-t-lg sticky top-0 z-10 -m-2 mb-2">
        <span className="text-xs text-gray-500 font-mono">Debug Panel (Ctrl+Shift+D)</span>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-400 hover:text-white text-lg"
        >
          ×
        </button>
      </div>

      <div className="space-y-2">
        <DebugPanel 
          title="Hook Summary" 
          data={hookSummary}
        />
        
        <DebugPanel 
          title="Full Game Object" 
          data={gameHookData.game || {}}
        />
        
        <DebugPanel 
          title="User Info" 
          data={{
            userAddress: user?.addr || 'Not connected',
            loggedIn: user?.loggedIn || false,
            gameId: gameId
          }}
        />
      </div>
    </div>
  );
};