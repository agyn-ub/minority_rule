import { supabase } from './supabase';

// Handle consolidated prize distribution from GameCompleted event
export async function handleConsolidatedPrizeDistribution(eventData: any, transactionId?: string) {
  try {
    
    const { gameId, winners, prizePerWinner } = eventData;
    
    if (!gameId) {
      throw new Error("Missing gameId in prize distribution data");
    }

    // If no winners, nothing to process
    if (!winners || winners.length === 0) {
      return true;
    }

    if (prizePerWinner === undefined || prizePerWinner === null) {
      throw new Error("Missing prizePerWinner in prize distribution data");
    }


    // Insert prize distribution records for all winners
    const prizeDistributions = winners.map((winner: string) => ({
      game_id: parseInt(gameId),
      winner_address: winner,
      amount: parseFloat(prizePerWinner),
      transaction_id: transactionId
    }));

    const { error: insertError } = await supabase
      .from('prize_distributions')
      .insert(prizeDistributions);

    if (insertError) {
      console.error("❌ Error inserting prize distributions:", insertError);
      throw insertError;
    }

    // Update user profile statistics for all winners
    
    // Get current stats for all winners
    const { data: profiles, error: selectError } = await supabase
      .from('user_profiles')
      .select('player_address, total_wins, total_earnings')
      .in('player_address', winners);

    if (selectError) {
      console.error("❌ Error getting user profiles:", selectError);
      throw selectError;
    }

    // Update each winner's stats individually
    let updatedCount = 0;
    for (const winner of winners) {
      const profile = profiles?.find(p => p.player_address === winner);
      
      if (!profile) {
        console.error(`❌ Profile not found for winner ${winner}`);
        continue; // Skip this winner but don't fail the whole operation
      }

      const newWins = (profile.total_wins || 0) + 1;
      const newEarnings = (profile.total_earnings || 0) + parseFloat(prizePerWinner);


      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          total_wins: newWins,
          total_earnings: newEarnings
        })
        .eq('player_address', winner);

      if (updateError) {
        console.error(`❌ Error updating stats for ${winner}:`, updateError);
        // Don't throw - try to update other winners
      } else {
        updatedCount++;
      }
    }

    return true;

  } catch (error) {
    console.error("❌ Failed to handle prize distribution:", error);
    throw error;
  }
}

// Handle game completion and update user game counts
export async function handleGameCompletion(eventData: any) {
  try {
    
    const { gameId } = eventData;
    
    if (!gameId) {
      throw new Error("Missing gameId in GameCompleted event");
    }

    // Get all players who participated in this game
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

    }

    return true;

  } catch (error) {
    console.error("❌ Failed to handle game completion:", error);
    throw error;
  }
}