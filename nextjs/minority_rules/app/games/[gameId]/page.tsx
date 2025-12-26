"use client";

import { useState, useEffect, use } from "react";
import { useFlowCurrentUser, TransactionButton, useFlowEvents } from "@onflow/react-sdk";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// Join Game transaction cadence
const JOIN_GAME_TRANSACTION = `
import "MinorityRuleGame"
import "FungibleToken"
import "FlowToken"

transaction(gameId: UInt64, contractAddress: Address) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let paymentVault: @FlowToken.Vault
    let game: &MinorityRuleGame.Game
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Get entry fee from game
        let gameInfo = self.game.getGameInfo()
        let entryFee = gameInfo["entryFee"]! as! UFix64
        
        // Withdraw payment from player's FlowToken vault
        let flowVault = signer.storage.borrow<&FlowToken.Vault>(from: /storage/flowTokenVault)
            ?? panic("Could not borrow FlowToken vault from storage")
        
        self.paymentVault <- flowVault.withdraw(amount: entryFee)
    }
    
    execute {
        self.game.joinGame(player: self.paymentVault.owner!.address, payment: <-self.paymentVault)
        
        log("Player joined game ".concat(gameId.toString()))
    }
}
`;

// Helper functions for game state
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

// Type for game data from Supabase
type PublicGameDetails = {
  game_id: number;
  question_text: string;
  entry_fee: number;
  creator_address: string;
  current_round: number;
  game_state: number; // 0=zeroPhase, 1=commitPhase, 2=revealPhase, 3=processingRound, 4=completed
  commit_deadline: string | null;
  reveal_deadline: string | null;
  total_players: number;
  created_at: string;
};

interface PublicGamePageProps {
  params: Promise<{
    gameId: string;
  }>;
}

export default function PublicGamePage({ params }: PublicGamePageProps) {
  const { user } = useFlowCurrentUser();
  const resolvedParams = use(params);
  const gameId = resolvedParams.gameId;

  const [game, setGame] = useState<PublicGameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [playerJoinedEvent, setPlayerJoinedEvent] = useState<any>(null);

  const contractAddress = process.env.NEXT_PUBLIC_MINORITY_RULE_GAME_ADDRESS!;

  // Update game player count in Supabase when player joins
  const updateGamePlayerCountInSupabase = async (eventData: any) => {
    try {
      console.log("=== PLAYER JOINED SUPABASE UPDATE ===");
      console.log("Raw event data received:", JSON.stringify(eventData, null, 2));

      const { data, error } = await supabase
        .from('games')
        .update({ total_players: parseInt(eventData.totalPlayers) })
        .eq('game_id', parseInt(eventData.gameId))
        .select();

      if (error) {
        console.error("=== SUPABASE ERROR DETAILS ===");
        console.error("Full error object:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("Game player count updated successfully in Supabase:", data);
      return data;
    } catch (error) {
      console.error("Failed to update game player count in Supabase:", error);
    }
  };

  // Refetch game data
  const refetchGameData = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('game_id', parseInt(gameId))
        .single();

      if (error) throw error;
      if (data) {
        setGame(data);
        console.log("Game data refreshed:", data);
      }
    } catch (err) {
      console.error('Error refetching game data:', err);
    }
  };

  // Listen for PlayerJoined events
  const playerJoinedEventType = contractAddress
    ? `A.${contractAddress.replace('0x', '')}.MinorityRuleGame.PlayerJoined`
    : null;

  if (playerJoinedEventType && contractAddress) {
    useFlowEvents({
      eventTypes: [playerJoinedEventType],
      startHeight: 0,
      onEvent: async (event) => {
        console.log("==== PLAYER JOINED EVENT DETECTED ====");
        console.log("Event type:", event.type);
        console.log("Event transaction ID:", event.transactionId);
        console.log("Event data:", event.data);
        console.log("Full event object:", event);
        console.log("======================================");

        // Store the latest event for display
        setPlayerJoinedEvent(event);

        // Update game in Supabase
        await updateGamePlayerCountInSupabase(event.data);

        // Refresh game data if this is for our current game
        if (event.data.gameId && parseInt(event.data.gameId) === parseInt(gameId)) {
          await refetchGameData();
        }
      },
      onError: (error) => {
        console.error("Error listening for PlayerJoined events:", error);
      }
    });
  }

  // Fetch public game data
  useEffect(() => {
    const fetchGameData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: gameData, error: gameError } = await supabase
          .from('games')
          .select('*')
          .eq('game_id', parseInt(gameId))
          .single();

        if (gameError) {
          if (gameError.code === 'PGRST116') {
            setError('Game not found');
          } else {
            setError('Failed to load game details');
          }
          return;
        }

        setGame(gameData);

        // Check if current user is the creator
        if (user?.addr && gameData.creator_address === user.addr) {
          setIsCreator(true);
        }

      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to connect to database');
      } finally {
        setLoading(false);
      }
    };

    fetchGameData();
  }, [gameId, user?.addr]);

  // Determine game status for public view using real blockchain state
  const getGameStatus = (game: PublicGameDetails) => {
    const now = new Date();
    
    switch (game.game_state) {
      case 0: // zeroPhase
        return {
          status: 'setup',
          text: 'Setting Up',
          color: 'text-muted-foreground bg-muted border-border',
          description: 'Game creator is still setting up this game'
        };
      
      case 1: // commitPhase
        if (!game.commit_deadline) {
          return {
            status: 'setup',
            text: 'Setting Up',
            color: 'text-muted-foreground bg-muted border-border',
            description: 'Commit deadline not yet set'
          };
        }
        
        const commitDeadline = new Date(game.commit_deadline);
        if (now < commitDeadline) {
          return {
            status: 'open',
            text: 'Open for Joining',
            color: 'text-green-700 bg-green-50 border-green-200',
            description: 'Players can join and submit vote commitments'
          };
        } else {
          return {
            status: 'commit_ended',
            text: 'Commit Phase Ended',
            color: 'text-orange-700 bg-orange-50 border-orange-200',
            description: 'Waiting for reveal phase to start'
          };
        }
      
      case 2: // revealPhase
        return {
          status: 'revealing',
          text: 'Reveal Phase',
          color: 'text-blue-700 bg-blue-50 border-blue-200',
          description: 'Players are revealing their votes'
        };
      
      case 3: // processingRound
        return {
          status: 'processing',
          text: 'Processing Round',
          color: 'text-purple-700 bg-purple-50 border-purple-200',
          description: 'Round results are being calculated'
        };
      
      case 4: // completed
        return {
          status: 'completed',
          text: 'Completed',
          color: 'text-gray-700 bg-gray-50 border-gray-200',
          description: 'This game has ended and prizes distributed'
        };
      
      default:
        return {
          status: 'unknown',
          text: 'Unknown State',
          color: 'text-red-700 bg-red-50 border-red-200',
          description: 'Game is in an unknown state'
        };
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            <p className="mt-2 text-muted-foreground">Loading game...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-red-900 mb-4">
              Game Not Found
            </h1>
            <p className="text-red-700 mb-6">
              {error || 'This game does not exist or has been removed.'}
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/games"
                className="bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
              >
                Back to Games
              </Link>
              <Link
                href="/"
                className="bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getGameStatus(game);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link href="/" className="text-primary hover:text-primary/80">
                Home
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <Link href="/games" className="text-primary hover:text-primary/80">
                  Browse Games
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="mx-2 text-gray-400">/</span>
                <span className="text-muted-foreground">Game #{gameId}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Game Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Main Game Info */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg shadow-lg p-6">
              <h1 className="text-2xl font-bold text-foreground">
                Game #{game.game_id}
              </h1>
              <br />
              <h2 className="text-xl font-semibold text-foreground mb-4">Game Question</h2>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-lg text-foreground font-medium">
                  {game.question_text}
                </p>
              </div>

              {/* Game Rules */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-foreground mb-3">How to Play</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Answer the question with YES or NO</p>
                  <p>• Only players in the minority advance to the next round</p>
                  <p>• Game continues until 1-2 players remain</p>
                  <p>• Winners split the prize pool</p>
                </div>
              </div>
            </div>
          </div>

          {/* Game Stats */}
          <div className="space-y-6">
            {/* Entry Requirements */}
            <div className="bg-card rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Entry Details</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Fee:</span>
                  <span className="font-semibold text-lg">{game.entry_fee} FLOW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Players:</span>
                  <span className="font-medium">{game.total_players}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Round:</span>
                  <span className="font-medium">{game.current_round}</span>
                </div>
                {game.commit_deadline && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Join Deadline:</span>
                    <span className="font-medium text-xs">
                      {new Date(game.commit_deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Prize Pool */}
            <div className="bg-card rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Prize Pool</h3>
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground mb-2">
                  {(game.total_players * game.entry_fee * 0.98).toFixed(2)} FLOW
                </div>
                <p className="text-sm text-muted-foreground">
                  Total prize for winners
                </p>
              </div>
            </div>

            {/* Creator Info */}
            <div className="bg-card rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Game Creator</h3>
              <div className="text-center">
                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {formatAddress(game.creator_address)}
                </code>
                <p className="text-xs text-muted-foreground mt-2">
                  Created {new Date(game.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Join Game */}
            {statusInfo.status === 'open' && user?.loggedIn && (
              <div className="bg-card rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Join Game</h3>
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold text-foreground mb-2">
                    {game.entry_fee} FLOW
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Entry fee required
                  </p>
                </div>

                <TransactionButton
                  label="Join Game"
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
                  transaction={{
                    cadence: JOIN_GAME_TRANSACTION,
                    args: (arg, t) => [
                      arg(parseInt(gameId), t.UInt64),
                      arg(contractAddress, t.Address),
                    ],
                    limit: 999,
                  }}
                  mutation={{
                    onSuccess: (transactionId) => {
                      console.log("Joined game! Transaction ID:", transactionId);
                      alert("Successfully joined the game!");
                    },
                    onError: (error) => {
                      console.error("Failed to join game:", error);
                      alert("Failed to join game. Please make sure you have enough FLOW tokens and try again.");
                    },
                  }}
                />

                <div className="mt-3 text-xs text-muted-foreground text-center">
                  <p>• You need {game.entry_fee} FLOW to join</p>
                  <p>• Once joined, you can vote on the question</p>
                  <p>• Only minority voters advance to next round</p>
                </div>
              </div>
            )}

            {/* Login Required for Join */}
            {statusInfo.status === 'open' && !user?.loggedIn && (
              <div className="bg-card rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Join Game</h3>
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Connect your wallet to join this game
                  </p>
                  <Link
                    href="/"
                    className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium text-center block"
                  >
                    Connect Wallet
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center">
          <Link
            href="/games"
            className="text-primary hover:text-primary/80 text-sm"
          >
            ← Back to All Games
          </Link>
        </div>
      </div>
    </div>
  );
}