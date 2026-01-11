-- Minority Rule Game Indexer Schema
-- This schema stores all game events from the smart contract

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Games table: stores game metadata
CREATE TABLE games (
    id BIGINT PRIMARY KEY,
    creator_address TEXT NOT NULL,
    question_text TEXT NOT NULL,
    entry_fee NUMERIC(78, 0) NOT NULL, -- Wei amount
    state TEXT NOT NULL, -- ZeroPhase, CommitPhase, RevealPhase, Completed
    current_round INTEGER NOT NULL DEFAULT 1,
    total_players INTEGER NOT NULL DEFAULT 0,
    commit_deadline BIGINT,
    reveal_deadline BIGINT,
    final_prize NUMERIC(78, 0),
    platform_fee NUMERIC(78, 0),
    prize_per_winner NUMERIC(78, 0),
    total_rounds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    block_number BIGINT NOT NULL,
    transaction_hash TEXT NOT NULL
);

CREATE INDEX idx_games_creator ON games(creator_address);
CREATE INDEX idx_games_state ON games(state);
CREATE INDEX idx_games_created_at ON games(created_at DESC);

-- Players table: stores player participation in games
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    player_address TEXT NOT NULL,
    amount_paid NUMERIC(78, 0) NOT NULL,
    is_winner BOOLEAN DEFAULT FALSE,
    prize_amount NUMERIC(78, 0),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    block_number BIGINT NOT NULL,
    transaction_hash TEXT NOT NULL,
    UNIQUE(game_id, player_address)
);

CREATE INDEX idx_players_game_id ON players(game_id);
CREATE INDEX idx_players_address ON players(player_address);
CREATE INDEX idx_players_winner ON players(is_winner) WHERE is_winner = TRUE;

-- Votes table: stores vote commits and reveals
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    player_address TEXT NOT NULL,
    commit_hash TEXT,
    vote BOOLEAN, -- NULL until revealed, TRUE = yes, FALSE = no
    committed_at TIMESTAMP WITH TIME ZONE,
    revealed_at TIMESTAMP WITH TIME ZONE,
    commit_block_number BIGINT,
    reveal_block_number BIGINT,
    commit_tx_hash TEXT,
    reveal_tx_hash TEXT,
    UNIQUE(game_id, round, player_address)
);

CREATE INDEX idx_votes_game_round ON votes(game_id, round);
CREATE INDEX idx_votes_player ON votes(player_address);
CREATE INDEX idx_votes_revealed ON votes(game_id, round, revealed_at) WHERE revealed_at IS NOT NULL;

-- Rounds table: stores round completion data
CREATE TABLE rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    yes_count INTEGER NOT NULL,
    no_count INTEGER NOT NULL,
    minority_vote BOOLEAN NOT NULL, -- TRUE if yes was minority, FALSE if no was minority
    votes_remaining INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    block_number BIGINT NOT NULL,
    transaction_hash TEXT NOT NULL,
    UNIQUE(game_id, round_number)
);

CREATE INDEX idx_rounds_game_id ON rounds(game_id);
CREATE INDEX idx_rounds_completed ON rounds(completed_at DESC);

-- Raw events table: stores all contract events for debugging/reprocessing
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name TEXT NOT NULL,
    game_id BIGINT,
    block_number BIGINT NOT NULL,
    transaction_hash TEXT NOT NULL,
    log_index INTEGER NOT NULL,
    data JSONB NOT NULL,
    indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(transaction_hash, log_index)
);

CREATE INDEX idx_events_game_id ON events(game_id);
CREATE INDEX idx_events_block ON events(block_number);
CREATE INDEX idx_events_name ON events(event_name);
CREATE INDEX idx_events_indexed_at ON events(indexed_at DESC);

-- Indexer state: tracks sync progress
CREATE TABLE indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_synced_block BIGINT NOT NULL DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    contract_address TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    is_syncing BOOLEAN DEFAULT FALSE,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial state
INSERT INTO indexer_state (id, last_synced_block, contract_address, chain_id)
VALUES (1, 0, '0x5FbDB2315678afecb367f032d93F642f64180aa3', 31337)
ON CONFLICT (id) DO NOTHING;

-- Views for easier querying

-- Active games view
CREATE VIEW active_games AS
SELECT
    g.*,
    COUNT(DISTINCT p.player_address) as player_count,
    COUNT(DISTINCT CASE WHEN v.round = g.current_round AND v.vote IS NOT NULL THEN v.player_address END) as reveals_count
FROM games g
LEFT JOIN players p ON g.id = p.game_id
LEFT JOIN votes v ON g.id = v.game_id
WHERE g.state != 'Completed'
GROUP BY g.id;

-- Game details view with all related data
CREATE VIEW game_details AS
SELECT
    g.*,
    json_agg(DISTINCT jsonb_build_object(
        'address', p.player_address,
        'amountPaid', p.amount_paid,
        'isWinner', p.is_winner,
        'prizeAmount', p.prize_amount
    )) FILTER (WHERE p.player_address IS NOT NULL) as players,
    json_agg(DISTINCT jsonb_build_object(
        'round', r.round_number,
        'yesCount', r.yes_count,
        'noCount', r.no_count,
        'minorityVote', r.minority_vote,
        'votesRemaining', r.votes_remaining
    )) FILTER (WHERE r.round_number IS NOT NULL) as rounds
FROM games g
LEFT JOIN players p ON g.id = p.game_id
LEFT JOIN rounds r ON g.id = r.game_id
GROUP BY g.id;

-- Player statistics view
CREATE VIEW player_stats AS
SELECT
    player_address,
    COUNT(*) as games_played,
    SUM(CASE WHEN is_winner THEN 1 ELSE 0 END) as games_won,
    SUM(amount_paid) as total_spent,
    COALESCE(SUM(prize_amount), 0) as total_won,
    COALESCE(SUM(prize_amount), 0) - SUM(amount_paid) as net_profit
FROM players
GROUP BY player_address;

-- Function to update game state timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Comments for documentation
COMMENT ON TABLE games IS 'Stores game metadata from GameCreated events';
COMMENT ON TABLE players IS 'Stores player participation from PlayerJoined events';
COMMENT ON TABLE votes IS 'Stores vote commits and reveals from VoteCommitted/VoteRevealed events';
COMMENT ON TABLE rounds IS 'Stores round completion data from RoundCompleted events';
COMMENT ON TABLE events IS 'Raw event log for debugging and reprocessing';
COMMENT ON TABLE indexer_state IS 'Tracks blockchain sync progress';
