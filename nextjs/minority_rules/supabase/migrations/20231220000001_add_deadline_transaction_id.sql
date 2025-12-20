-- Add deadline_set_transaction_id field to games table
-- This stores the Flow transaction ID when the commit deadline was set

ALTER TABLE games 
ADD COLUMN deadline_set_transaction_id VARCHAR(100);

-- Add index for faster queries
CREATE INDEX idx_games_deadline_transaction ON games(deadline_set_transaction_id);

-- Add comment
COMMENT ON COLUMN games.deadline_set_transaction_id IS 'Flow transaction ID when commit deadline was set by creator';