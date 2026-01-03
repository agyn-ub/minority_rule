import { supabase } from './supabase';

// Handle prize distribution event
export async function handlePrizeDistribution(eventData: any, transactionId?: string) {
  try {
    console.log("=== PROCESSING PRIZE DISTRIBUTION ===");
    console.log("Event data:", JSON.stringify(eventData, null, 2));
    
    const { gameId, winner, amount } = eventData;
    
    if (!gameId || !winner || !amount) {
      throw new Error("Missing required prize distribution data");
    }

    // Insert prize distribution record first
    console.log("💰 Inserting prize distribution record...");
    const { error: insertError } = await supabase
      .from('prize_distributions')
      .insert({
        game_id: parseInt(gameId),
        winner_address: winner,
        amount: parseFloat(amount),
        transaction_id: transactionId
      });

    if (insertError) {
      console.error("❌ Error inserting prize distribution:", insertError);
      throw insertError;
    }

    // Update user profile statistics - user should already exist from wallet connection
    console.log("📊 Updating user statistics...");
    
    // Get current user stats
    const { data: profile, error: selectError } = await supabase
      .from('user_profiles')
      .select('total_wins, total_earnings')
      .eq('player_address', winner)
      .single();

    if (selectError) {
      console.error("❌ Error getting user profile:", selectError);
      throw new Error(`User profile not found for ${winner}. User should have been created on wallet connection.`);
    }

    // Update user stats
    const newWins = (profile?.total_wins || 0) + 1;
    const newEarnings = (profile?.total_earnings || 0) + parseFloat(amount);

    console.log(`📈 Updating user: wins ${profile?.total_wins || 0} → ${newWins}, earnings ${profile?.total_earnings || 0} → ${newEarnings}`);

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        total_wins: newWins,
        total_earnings: newEarnings
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
export async function handleGameCompletion(eventData: any) {
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
      
      console.log(`📊 Updating game counts for ${players.length} players...`);
      
      // Get current game counts for all players
      const { data: profiles, error: selectError } = await supabase
        .from('user_profiles')
        .select('player_address, total_games')
        .in('player_address', playerAddresses);

      if (selectError) {
        console.error("❌ Error getting player profiles for game count update:", selectError);
        throw selectError;
      }

      // Update each player's game count individually
      let updatedCount = 0;
      for (const profile of profiles || []) {
        const newGameCount = (profile.total_games || 0) + 1;
        
        console.log(`📈 Player ${profile.player_address}: games ${profile.total_games || 0} → ${newGameCount}`);
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            total_games: newGameCount
          })
          .eq('player_address', profile.player_address);

        if (updateError) {
          console.error(`❌ Error updating game count for ${profile.player_address}:`, updateError);
          throw updateError;
        }
        
        updatedCount++;
      }

      console.log(`✅ Successfully updated game counts for ${updatedCount} players`);
    }

    console.log("✅ Successfully processed game completion");
    return true;

  } catch (error) {
    console.error("❌ Failed to handle game completion:", error);
    throw error;
  }
}