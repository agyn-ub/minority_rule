'use client';

interface PlayersListProps {
  players: string[];
  totalPlayers: number;
  title: string;
}

export function PlayersList({ players, totalPlayers, title }: PlayersListProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      <div className="mb-3 text-sm text-gray-600">
        {players.length} of {totalPlayers} players remaining
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {players.length > 0 ? (
          players.map((player, index) => (
            <div
              key={player}
              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded text-sm"
            >
              <span className="text-gray-600">#{index + 1}</span>
              <span className="font-mono text-xs">
                {player.slice(0, 6)}...{player.slice(-4)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">No players yet</p>
        )}
      </div>
    </div>
  );
}