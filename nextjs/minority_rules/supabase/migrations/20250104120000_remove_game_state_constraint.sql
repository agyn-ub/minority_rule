-- Remove game_state constraint check for flexibility
-- Keep things simple without strict enum validation in database

-- Drop the constraint
ALTER TABLE games DROP CONSTRAINT IF EXISTS chk_game_state_valid;

-- Update comment to reflect current enum mapping (without constraint)
COMMENT ON COLUMN games.game_state IS 'GameState enum from Flow contract: 0=zeroPhase, 1=commitPhase, 2=revealPhase, 3=completed';