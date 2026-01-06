const { createClient } = require('@supabase/supabase-js');
const { GAME_STATES, PLAYER_STATUS } = require('./types');

class DatabaseClient {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY // Use new secret key or fallback to legacy
    );
  }

  /**
   * Upsert game record
   * @param {import('./types').Game} gameData 
   * @returns {Promise<{data: any, error: any}>}
   */
  async upsertGame(gameData) {
    return await this.supabase
      .from('games')
      .upsert(gameData, { 
        onConflict: 'game_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();
  }

  /**
   * Upsert game player record - handles duplicate key errors
   * @param {import('./types').GamePlayer} playerData 
   * @returns {Promise<{data: any, error: any}>}
   */
  async upsertGamePlayer(playerData) {
    return await this.supabase
      .from('game_players')
      .upsert(playerData, { 
        onConflict: 'game_id,player_address',
        ignoreDuplicates: false 
      })
      .select()
      .single();
  }

  /**
   * Upsert commit record
   * @param {import('./types').Commit} commitData 
   * @returns {Promise<{data: any, error: any}>}
   */
  async upsertCommit(commitData) {
    return await this.supabase
      .from('commits')
      .upsert(commitData, { 
        onConflict: 'game_id,round_number,player_address',
        ignoreDuplicates: false 
      })
      .select()
      .single();
  }

  /**
   * Upsert reveal record
   * @param {import('./types').Reveal} revealData 
   * @returns {Promise<{data: any, error: any}>}
   */
  async upsertReveal(revealData) {
    return await this.supabase
      .from('reveals')
      .upsert(revealData, { 
        onConflict: 'game_id,round_number,player_address',
        ignoreDuplicates: false 
      })
      .select()
      .single();
  }

  /**
   * Upsert round record
   * @param {import('./types').Round} roundData 
   * @returns {Promise<{data: any, error: any}>}
   */
  async upsertRound(roundData) {
    return await this.supabase
      .from('rounds')
      .upsert(roundData, { 
        onConflict: 'game_id,round_number',
        ignoreDuplicates: false 
      })
      .select()
      .single();
  }

  /**
   * Upsert user profile record
   * @param {import('./types').UserProfile} profileData 
   * @returns {Promise<{data: any, error: any}>}
   */
  async upsertUserProfile(profileData) {
    return await this.supabase
      .from('user_profiles')
      .upsert(profileData, { 
        onConflict: 'player_address',
        ignoreDuplicates: false 
      })
      .select()
      .single();
  }

  /**
   * Insert prize distribution record
   * @param {import('./types').PrizeDistribution} prizeData 
   * @returns {Promise<{data: any, error: any}>}
   */
  async insertPrizeDistribution(prizeData) {
    return await this.supabase
      .from('prize_distributions')
      .insert(prizeData)
      .select()
      .single();
  }

  /**
   * Update player statistics
   * @param {string} playerAddress 
   * @param {Object} updates - Stats to increment/update
   * @returns {Promise<{data: any, error: any}>}
   */
  async updatePlayerStats(playerAddress, updates) {
    // First, ensure the player exists
    const { data: existingPlayer } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('player_address', playerAddress)
      .single();

    const playerData = existingPlayer || {
      player_address: playerAddress,
      display_name: null,
      total_games: 0,
      total_wins: 0,
      total_earnings: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Apply updates
    const updatedData = {
      ...playerData,
      total_games: (playerData.total_games || 0) + (updates.total_games || 0),
      total_wins: (playerData.total_wins || 0) + (updates.total_wins || 0),
      total_earnings: (playerData.total_earnings || 0) + (updates.total_earnings || 0),
      updated_at: new Date().toISOString()
    };

    return await this.upsertUserProfile(updatedData);
  }

  /**
   * Get game by ID
   * @param {number} gameId 
   * @returns {Promise<{data: any, error: any}>}
   */
  async getGame(gameId) {
    return await this.supabase
      .from('games')
      .select('*')
      .eq('game_id', gameId)
      .single();
  }

  /**
   * Health check - test database connection
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const { data, error } = await this.supabase
        .from('games')
        .select('count')
        .limit(1);
      
      return !error;
    } catch (err) {
      return false;
    }
  }
}

module.exports = { DatabaseClient };