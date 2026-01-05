/**
 * Database type definitions based on Supabase schema
 * These match the SQL migrations exactly
 */

/**
 * @typedef {Object} Game
 * @property {number} game_id - Primary key
 * @property {string} question_text - Game question
 * @property {number} entry_fee - Entry fee in FLOW
 * @property {string} creator_address - Game creator address
 * @property {number|null} current_round - Current round number
 * @property {number} game_state - GameState enum (0-4)
 * @property {string|null} commit_deadline - ISO timestamp
 * @property {string|null} reveal_deadline - ISO timestamp
 * @property {number|null} total_players - Total player count
 * @property {string|null} created_at - ISO timestamp
 */

/**
 * @typedef {Object} GamePlayer
 * @property {number} game_id - Foreign key to games
 * @property {string} player_address - Player address
 * @property {string|null} joined_at - ISO timestamp
 * @property {string} status - 'active', 'eliminated', 'winner'
 */

/**
 * @typedef {Object} Commit
 * @property {number} game_id - Foreign key to games
 * @property {number} round_number - Round number
 * @property {string} player_address - Player address
 * @property {string} commit_hash - SHA3-256 hash
 * @property {string|null} committed_at - ISO timestamp
 * @property {number|null} round_id - Foreign key to rounds
 */

/**
 * @typedef {Object} Reveal
 * @property {number} game_id - Foreign key to games
 * @property {number} round_number - Round number
 * @property {string} player_address - Player address
 * @property {boolean} vote_value - true = YES, false = NO
 * @property {string} salt - 64-character salt
 * @property {string|null} revealed_at - ISO timestamp
 * @property {number|null} round_id - Foreign key to rounds
 */

/**
 * @typedef {Object} Round
 * @property {number} id - Primary key
 * @property {number} game_id - Foreign key to games
 * @property {number} round_number - Round number
 * @property {number} yes_count - Number of YES votes
 * @property {number} no_count - Number of NO votes
 * @property {boolean} minority_vote - TRUE if YES was minority
 * @property {number} votes_remaining - Players advancing to next round
 * @property {string|null} completed_at - ISO timestamp
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} player_address - Primary key
 * @property {string|null} display_name - Display name
 * @property {number} total_games - Total games played
 * @property {number} total_wins - Total wins
 * @property {number} total_earnings - Total earnings in FLOW
 * @property {string|null} created_at - ISO timestamp
 * @property {string|null} updated_at - ISO timestamp
 */

/**
 * @typedef {Object} PrizeDistribution
 * @property {number} id - Primary key
 * @property {number} game_id - Foreign key to games
 * @property {string} winner_address - Winner address
 * @property {number} amount - Prize amount in FLOW
 * @property {string|null} distributed_at - ISO timestamp
 */

/**
 * Game State Enum Values - Must match Flow contract exactly
 * From MinorityRuleGame.cdc: zeroPhase(0), commitPhase(1), revealPhase(2), completed(3)
 */
const GAME_STATES = {
  ZERO_PHASE: 0,
  COMMIT_PHASE: 1,
  REVEAL_PHASE: 2,
  COMPLETED: 3
};

/**
 * Player Status Values
 */
const PLAYER_STATUS = {
  ACTIVE: 'active',
  ELIMINATED: 'eliminated',
  WINNER: 'winner'
};

module.exports = {
  GAME_STATES,
  PLAYER_STATUS
};