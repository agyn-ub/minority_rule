import { supabase } from './supabase';

// Ensure user profile exists for prize winner
async function ensureUserProfileExists(address: string) {
  try {
    console.log("👤 Ensuring user profile exists for winner:", address);
    
    const { data: existingProfile, error: selectError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('player_address', address)
      .single();
      
    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 is "not found" - anything else is a real error
      console.error("❌ Error checking user profile:", selectError);
      throw selectError;
    }
    
    if (!existingProfile) {
      // Create new user profile for the winner
      console.log("➕ Creating new user profile for winner:", address);
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          player_address: address,
          display_name: null,
          total_games: 0,
          total_wins: 0,
          total_earnings: 0
        });
        
      if (insertError) {
        console.error("❌ Error creating user profile:", insertError);
        throw insertError;
      } else {
        console.log("✅ User profile created successfully for:", address);
      }
    } else {
      console.log("✅ User profile already exists for:", address);
    }
  } catch (error) {
    console.error("❌ Error in ensureUserProfileExists:", error);
    throw error;
  }
}

// Handle prize distribution event
export async function handlePrizeDistribution(eventData: any, transactionId?: string) {
  try {
    console.log("=== PROCESSING PRIZE DISTRIBUTION ===");
    console.log("Event data:", JSON.stringify(eventData, null, 2));
    
    const { gameId, winner, amount } = eventData;
    
    if (!gameId || !winner || !amount) {
      throw new Error("Missing required prize distribution data");
    }

    // Ensure winner has a user profile
    await ensureUserProfileExists(winner);
    
    // Insert prize distribution record
    console.log("💰 Inserting prize distribution record...");
    const { error: insertError } = await supabase
      .from('prize_distributions')
      .insert({
        game_id: parseInt(gameId),
        winner_address: winner,
        amount: parseFloat(amount),
        transaction_id: transactionId || null
      });

    if (insertError) {
      console.error("❌ Error inserting prize distribution:", insertError);
      throw insertError;
    }

    // Update user profile statistics using direct Supabase update
    console.log("📊 Updating user statistics...");
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        total_wins: supabase.sql`total_wins + 1`,
        total_earnings: supabase.sql`total_earnings + ${parseFloat(amount)}`
      })
      .eq('player_address', winner);

    if (updateError) {
      console.error("❌ Error updating user stats:", updateError);
      throw updateError;
    }

    console.log(`✅ Successfully processed prize distribution: ${amount} FLOW to ${winner}`);
    return true;

  } catch (error) {
    console.error("❌ Failed to handle prize distribution:", error);
    throw error;
  }
}

// Handle game completion and update user game counts
export async function handleGameCompletion(eventData: any, transactionId?: string) {
  try {
    console.log("=== PROCESSING GAME COMPLETION ===");
    console.log("Event data:", JSON.stringify(eventData, null, 2));
    
    const { gameId } = eventData;
    
    if (!gameId) {
      throw new Error("Missing gameId in GameCompleted event");
    }

    // Get all players who participated in this game
    console.log("👥 Getting game participants...");
    const { data: players, error: playersError } = await supabase
      .from('game_players')
      .select('player_address')
      .eq('game_id', parseInt(gameId));

    if (playersError) {
      console.error("❌ Error getting game players:", playersError);
      throw playersError;
    }

    if (players && players.length > 0) {
      const playerAddresses = players.map(p => p.player_address);
      
      // Update total_games for all players using direct Supabase update
      console.log(`📊 Updating game counts for ${players.length} players...`);
      const { error: updatePlayersError } = await supabase
        .from('user_profiles')
        .update({
          total_games: supabase.sql`total_games + 1`
        })
        .in('player_address', playerAddresses);

      if (updatePlayersError) {
        console.error("❌ Error updating player game counts:", updatePlayersError);
        throw updatePlayersError;
      }

      console.log(`✅ Successfully updated game counts for ${players.length} players`);
    }

    console.log("✅ Successfully processed game completion");
    return true;

  } catch (error) {
    console.error("❌ Failed to handle game completion:", error);
    throw error;
  }
}