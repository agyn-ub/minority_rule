-- Comprehensive migration: Add rounds table and foreign key structure
-- This migration creates a clean database structure with proper relationships

-- STEP 1: Clean existing data (removing any trash/test data)
TRUNCATE TABLE reveals CASCADE;
TRUNCATE TABLE commits CASCADE; 
TRUNCATE TABLE game_players CASCADE;
TRUNCATE TABLE games CASCADE;

-- STEP 2: Ensure game_state is proper INTEGER type
-- (This combines the functionality from the deleted game_state migration)
ALTER TABLE games DROP COLUMN IF EXISTS game_state;
ALTER TABLE games ADD COLUMN game_state INTEGER NOT NULL DEFAULT 0;

-- Add constraint to ensure only valid enum values are stored
ALTER TABLE games ADD CONSTRAINT chk_game_state_valid 
    CHECK (game_state >= 0 AND game_state <= 4);

-- Add comment explaining the enum mapping
COMMENT ON COLUMN games.game_state IS 'GameState enum from Flow contract: 0=zeroPhase, 1=commitPhase, 2=revealPhase, 3=processingRound, 4=completed';

-- STEP 3: Create rounds table with foreign key to games
CREATE TABLE rounds (
  id SERIAL PRIMARY KEY,
  game_id BIGINT NOT NULL,
  round_number INTEGER NOT NULL,
  yes_count INTEGER NOT NULL,
  no_count INTEGER NOT NULL,
  minority_vote BOOLEAN NOT NULL,
  votes_remaining INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Foreign key constraint to games table
  CONSTRAINT fk_rounds_game_id 
    FOREIGN KEY (game_id) 
    REFERENCES games(game_id) 
    ON DELETE CASCADE,
    
  -- Prevent duplicate rounds for same game
  UNIQUE(game_id, round_number)
);

-- STEP 4: Add round_id columns to existing tables
ALTER TABLE commits ADD COLUMN round_id INTEGER;
ALTER TABLE reveals ADD COLUMN round_id INTEGER;

-- STEP 5: Add foreign key constraints
ALTER TABLE commits 
ADD CONSTRAINT fk_commits_round_id 
FOREIGN KEY (round_id) 
REFERENCES rounds(id) 
ON DELETE CASCADE;

ALTER TABLE reveals 
ADD CONSTRAINT fk_reveals_round_id 
FOREIGN KEY (round_id) 
REFERENCES rounds(id) 
ON DELETE CASCADE;

-- STEP 6: Create indexes for performance
CREATE INDEX idx_rounds_game_id ON rounds(game_id);
CREATE INDEX idx_rounds_game_round ON rounds(game_id, round_number);
CREATE INDEX idx_commits_round_id ON commits(round_id);
CREATE INDEX idx_reveals_round_id ON reveals(round_id);

-- Recreate the games state index (was dropped when column was recreated)
CREATE INDEX idx_games_state ON games(game_state, created_at DESC);

-- STEP 7: Add comments
COMMENT ON TABLE rounds IS 'Round completion data with voting results';
COMMENT ON COLUMN rounds.yes_count IS 'Number of YES votes in this round';
COMMENT ON COLUMN rounds.no_count IS 'Number of NO votes in this round';
COMMENT ON COLUMN rounds.minority_vote IS 'TRUE if YES was minority, FALSE if NO was minority';
COMMENT ON COLUMN rounds.votes_remaining IS 'Number of players advancing to next round';
COMMENT ON COLUMN commits.round_id IS 'Foreign key to rounds table';
COMMENT ON COLUMN reveals.round_id IS 'Foreign key to rounds table';