-- Add prize distributions table to track PrizeDistributed events
-- Links prizes to user profiles via foreign key on winner_address

-- Create prize distributions table
CREATE TABLE prize_distributions (
  id SERIAL PRIMARY KEY,
  game_id BIGINT NOT NULL,
  winner_address VARCHAR(18) NOT NULL,
  amount DECIMAL(10,4) NOT NULL,
  distributed_at TIMESTAMPTZ DEFAULT NOW(),
  transaction_id VARCHAR(64),
  block_height BIGINT,
  
  -- Foreign key constraints
  CONSTRAINT fk_prize_game_id 
    FOREIGN KEY (game_id) 
    REFERENCES games(game_id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_prize_winner 
    FOREIGN KEY (winner_address) 
    REFERENCES user_profiles(player_address) 
    ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_prize_distributions_game_id ON prize_distributions(game_id);
CREATE INDEX idx_prize_distributions_winner ON prize_distributions(winner_address);
CREATE INDEX idx_prize_distributions_distributed_at ON prize_distributions(distributed_at DESC);

-- Add comments
COMMENT ON TABLE prize_distributions IS 'Tracks individual prize distributions from PrizeDistributed events';
COMMENT ON COLUMN prize_distributions.winner_address IS 'Flow wallet address of prize winner - foreign key to user_profiles';
COMMENT ON COLUMN prize_distributions.amount IS 'Prize amount in FLOW tokens';
COMMENT ON COLUMN prize_distributions.transaction_id IS 'Flow transaction hash where prize was distributed';
COMMENT ON COLUMN prize_distributions.block_height IS 'Flow block height where event occurred';