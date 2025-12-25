"use client";

import { useState, useEffect } from "react";
import { useFlowCurrentUser, TransactionButton, useFlowEvents } from "@onflow/react-sdk";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase, type Game } from "@/lib/supabase";

// Cadence transactions
const SET_COMMIT_DEADLINE_TRANSACTION = `
import "MinorityRuleGame"

transaction(gameId: UInt64, durationSeconds: UFix64, contractAddress: Address) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
    }
    
    execute {
        self.game.setCommitDeadline(durationSeconds: durationSeconds)
        
        log("Commit deadline set for game ".concat(gameId.toString())
            .concat(" to ").concat(durationSeconds.toString()).concat(" seconds from now"))
    }
}
`;

const SET_REVEAL_DEADLINE_TRANSACTION = `
import "MinorityRuleGame"

transaction(gameId: UInt64, durationSeconds: UFix64, contractAddress: Address) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
    }
    
    execute {
        self.game.setRevealDeadline(durationSeconds: durationSeconds)
        
        log("Reveal deadline set for game ".concat(gameId.toString())
            .concat(" to ").concat(durationSeconds.toString()).concat(" seconds from now"))
    }
}
`;

const PROCESS_ROUND_TRANSACTION = `
import "MinorityRuleGame"

transaction(gameId: UInt64, contractAddress: Address) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
            
        game.processRound()
    }
    
    execute {
        log("Round processed for game ".concat(gameId.toString()))
    }
}
`;

// Helper functions
const getGameStateName = (state: number): string => {
  switch (state) {
    case 0: return "Zero Phase";
    case 1: return "Commit Phase";
    case 2: return "Reveal Phase";
    case 3: return "Processing Round";
    case 4: return "Completed";
    default: return "Unknown";
  }
};

const getStateColor = (state: number): string => {
  switch (state) {
    case 0: return "bg-gray-100 text-gray-800";
    case 1: return "bg-blue-100 text-blue-800";
    case 2: return "bg-yellow-100 text-yellow-800";
    case 3: return "bg-orange-100 text-orange-800";
    case 4: return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

export default function MyGameDetailsPage() {
  const { user } = useFlowCurrentUser();
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commitDuration, setCommitDuration] = useState("3600"); // 1 hour default
  const [revealDuration, setRevealDuration] = useState("1800"); // 30 minutes default

  const contractAddress = process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS!;

  // Initialize Flow events to configure discovery endpoints (required for transactions)
  const eventType = contractAddress
    ? `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.GameCreated`
    : null;

  if (eventType && contractAddress) {
    useFlowEvents({
      eventTypes: [eventType],
      startHeight: 0,
      onEvent: () => {
        // Minimal event handler just to initialize Flow discovery config
      },
      onError: (error) => {
        console.error("Flow events error:", error);
      }
    });
  }

  // Fetch game details
  useEffect(() => {
    const fetchGame = async () => {
      if (!gameId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('game_id', parseInt(gameId))
          .single();

        if (error) throw error;
        if (!data) throw new Error('Game not found');
        
        setGame(data);
      } catch (err) {
        console.error('Error fetching game:', err);
        setError('Failed to load game details');
      } finally {
        setLoading(false);
      }
    };

    fetchGame();
  }, [gameId]);

  // Check if current user is the game creator
  const isGameOwner = user?.addr && game?.creator_address === user.addr;

  if (!user?.loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-border">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Connect Wallet Required
          </h1>
          <p className="text-muted-foreground mb-6">
            Please connect your Flow wallet to view games.
          </p>
          <Link
            href="/"
            className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-center block"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading game details...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-border text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Game Not Found
          </h1>
          <p className="text-muted-foreground mb-6">
            {error || "The requested game could not be found."}
          </p>
          <Link
            href="/my-games"
            className="bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Back to My Games
          </Link>
        </div>
      </div>
    );
  }

  if (!isGameOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full mx-4 border border-border text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Access Denied
          </h1>
          <p className="text-muted-foreground mb-6">
            You can only manage games that you created.
          </p>
          <div className="flex gap-2">
            <Link
              href="/my-games"
              className="flex-1 bg-secondary text-secondary-foreground py-2 px-4 rounded-lg hover:bg-secondary/90 transition-colors text-center"
            >
              Your Games
            </Link>
            <Link
              href={`/games/${gameId}`}
              className="flex-1 bg-primary text-primary-foreground py-2 px-4 rounded-lg hover:bg-primary/90 transition-colors text-center"
            >
              View Game
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/my-games"
              className="text-primary hover:text-primary/80 text-sm"
            >
              ← My Games
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm text-muted-foreground">Game #{gameId}</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Game Details
          </h1>
          <p className="text-muted-foreground">
            Configure and control your game settings
          </p>
        </div>

        {/* Game Overview */}
        <div className="bg-card rounded-lg shadow-lg border border-border p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Game #{game.game_id}
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStateColor(game.game_state)}`}>
                {getGameStateName(game.game_state)}
              </span>
            </div>
            <Link
              href={`/games/${gameId}`}
              className="bg-secondary text-secondary-foreground py-2 px-4 rounded-lg hover:bg-secondary/90 transition-colors"
            >
              View Game
            </Link>
          </div>
          
          <div className="bg-muted rounded-lg p-4 mb-4">
            <h3 className="font-medium text-foreground mb-2">Question:</h3>
            <p className="text-muted-foreground">{game.question_text}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-muted-foreground text-sm">Entry Fee:</span>
              <p className="font-semibold">{game.entry_fee} FLOW</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Round:</span>
              <p className="font-semibold">{game.current_round}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Players:</span>
              <p className="font-semibold">{game.total_players}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Created:</span>
              <p className="font-semibold">
                {new Date(game.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Phase Management */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Set Commit Deadline */}
          {game.game_state === 0 && (
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Start Commit Phase
              </h3>
              <p className="text-muted-foreground mb-4">
                Set the duration for players to submit their vote commitments.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={commitDuration}
                  onChange={(e) => setCommitDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                  placeholder="3600"
                  min="60"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.floor(parseInt(commitDuration || "0") / 60)} minutes
                </p>
              </div>

              <TransactionButton
                label="Set Commit Deadline"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                transaction={{
                  cadence: SET_COMMIT_DEADLINE_TRANSACTION,
                  args: (arg, t) => [
                    arg(parseInt(gameId), t.UInt64),
                    arg(parseFloat(commitDuration || "3600").toFixed(8), t.UFix64),
                    arg(contractAddress, t.Address),
                  ],
                  limit: 999,
                }}
                mutation={{
                  onSuccess: (transactionId) => {
                    console.log("Commit deadline set! Transaction ID:", transactionId);
                    alert("Commit deadline set successfully!");
                  },
                  onError: (error) => {
                    console.error("Failed to set commit deadline:", error);
                    alert("Failed to set commit deadline. Please try again.");
                  },
                }}
              />
            </div>
          )}

          {/* Set Reveal Deadline */}
          {game.game_state === 1 && (
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Start Reveal Phase
              </h3>
              <p className="text-muted-foreground mb-4">
                Set the duration for players to reveal their votes.
              </p>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={revealDuration}
                  onChange={(e) => setRevealDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground"
                  placeholder="1800"
                  min="60"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.floor(parseInt(revealDuration || "0") / 60)} minutes
                </p>
              </div>

              <TransactionButton
                label="Set Reveal Deadline"
                className="w-full bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 transition-colors"
                transaction={{
                  cadence: SET_REVEAL_DEADLINE_TRANSACTION,
                  args: (arg, t) => [
                    arg(parseInt(gameId), t.UInt64),
                    arg(parseFloat(revealDuration || "1800").toFixed(8), t.UFix64),
                    arg(contractAddress, t.Address),
                  ],
                  limit: 999,
                }}
                mutation={{
                  onSuccess: (transactionId) => {
                    console.log("Reveal deadline set! Transaction ID:", transactionId);
                    alert("Reveal deadline set successfully!");
                  },
                  onError: (error) => {
                    console.error("Failed to set reveal deadline:", error);
                    alert("Failed to set reveal deadline. Please try again.");
                  },
                }}
              />
            </div>
          )}

          {/* Process Round */}
          {game.game_state === 2 && (
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Process Round
              </h3>
              <p className="text-muted-foreground mb-4">
                Calculate results and advance to next round or end game.
              </p>

              <TransactionButton
                label="Process Round"
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                transaction={{
                  cadence: PROCESS_ROUND_TRANSACTION,
                  args: (arg, t) => [
                    arg(parseInt(gameId), t.UInt64),
                    arg(contractAddress, t.Address),
                  ],
                  limit: 999,
                }}
                mutation={{
                  onSuccess: (transactionId) => {
                    console.log("Round processed! Transaction ID:", transactionId);
                    alert("Round processed successfully!");
                  },
                  onError: (error) => {
                    console.error("Failed to process round:", error);
                    alert("Failed to process round. Please try again.");
                  },
                }}
              />
            </div>
          )}

          {/* Game Completed */}
          {game.game_state === 4 && (
            <div className="bg-card rounded-lg shadow-lg border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                🎉 Game Completed
              </h3>
              <p className="text-muted-foreground mb-4">
                This game has finished and prizes have been distributed.
              </p>
              <Link
                href={`/games/${gameId}`}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-center block"
              >
                View Final Results
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}