-- Change game_state from VARCHAR to INTEGER to match Flow blockchain enum values
-- This migration converts game state from string values to integer enum values

-- Drop the existing index first
DROP INDEX IF EXISTS idx_games_state;

-- Drop the existing game_state column (this will lose any existing data)
ALTER TABLE games DROP COLUMN IF EXISTS game_state;

-- Add new game_state column as INTEGER
-- Default to 0 which represents 'zeroPhase' in the Flow contract GameState enum
ALTER TABLE games ADD COLUMN game_state INTEGER NOT NULL DEFAULT 0;

-- Recreate the index on the new integer column
CREATE INDEX idx_games_state ON games(game_state, created_at DESC);

-- Add comment explaining the enum mapping
COMMENT ON COLUMN games.game_state IS 'GameState enum from Flow contract: 0=zeroPhase, 1=commitPhase, 2=revealPhase, 3=processingRound, 4=completed';

-- Add constraint to ensure only valid enum values are stored
ALTER TABLE games ADD CONSTRAINT chk_game_state_valid 
    CHECK (game_state >= 0 AND game_state <= 4);