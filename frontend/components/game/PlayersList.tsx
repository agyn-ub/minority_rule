'use client';

import React, { memo, useMemo } from 'react';

interface PlayersListProps {
  players: string[];
  totalPlayers: number;
  title: string;
}

const PlayerItem = memo(function PlayerItem({ player, index }: { player: string; index: number }) {
  const shortAddress = useMemo(() => {
    return `${player.slice(0, 6)}...${player.slice(-4)}`;
  }, [player]);

  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm">
      <span className="text-gray-600">#{index + 1}</span>
      <span className="font-mono text-xs">
        {shortAddress}
      </span>
    </div>
  );
});

const PlayersList = memo(function PlayersList({ players, totalPlayers, title }: PlayersListProps) {
  const playersCount = useMemo(() => {
    return `${players.length} of ${totalPlayers} players remaining`;
  }, [players.length, totalPlayers]);

  const playerItems = useMemo(() => {
    if (players.length === 0) {
      return <p className="text-gray-500 text-sm">No players yet</p>;
    }

    return players.map((player, index) => (
      <PlayerItem key={player} player={player} index={index} />
    ));
  }, [players]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="mb-3 text-sm text-gray-600">
        {playersCount}
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {playerItems}
      </div>
    </div>
  );
});

export { PlayersList };