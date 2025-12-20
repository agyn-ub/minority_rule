-- Minority Rule Game Database Schema
-- Initial migration to create all necessary tables

-- Games table - core game information
CREATE TABLE games (
    game_id BIGINT PRIMARY KEY,
    question_text TEXT NOT NULL,
    entry_fee DECIMAL(10,4) NOT NULL,
    creator_address VARCHAR(18) NOT NULL,
    current_round INT DEFAULT 1,
    game_state VARCHAR(20) NOT NULL DEFAULT 'commit_phase',
    commit_deadline TIMESTAMPTZ,
    reveal_deadline TIMESTAMPTZ,
    total_players INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game players table - tracks who joined each game
CREATE TABLE game_players (
    game_id BIGINT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    player_address VARCHAR(18) NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'eliminated', 'winner'
    UNIQUE(game_id, player_address)
);

-- Commits table - tracks player commit hashes
CREATE TABLE commits (
    game_id BIGINT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    player_address VARCHAR(18) NOT NULL,
    commit_hash VARCHAR(64) NOT NULL, -- SHA3-256 hash
    committed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, round_number, player_address)
);

-- Reveals table - tracks revealed votes and salts
CREATE TABLE reveals (
    game_id BIGINT NOT NULL REFERENCES games(game_id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    player_address VARCHAR(18) NOT NULL,
    vote_value BOOLEAN NOT NULL, -- true = YES, false = NO
    salt VARCHAR(64) NOT NULL,   -- 64-character salt used
    revealed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, round_number, player_address)
);

-- User profiles table - basic player statistics
CREATE TABLE user_profiles (
    player_address VARCHAR(18) PRIMARY KEY,
    display_name VARCHAR(50),
    total_games INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_games_state ON games(game_state, created_at DESC);
CREATE INDEX idx_games_creator ON games(creator_address);
CREATE INDEX idx_game_players_address ON game_players(player_address);
CREATE INDEX idx_commits_game_round ON commits(game_id, round_number);
CREATE INDEX idx_commits_player ON commits(player_address);
CREATE INDEX idx_reveals_game_round ON reveals(game_id, round_number);
CREATE INDEX idx_reveals_player ON reveals(player_address);
CREATE INDEX idx_user_profiles_stats ON user_profiles(total_wins DESC, total_games DESC);

-- Comments
COMMENT ON TABLE games IS 'Core game information and state';
COMMENT ON TABLE game_players IS 'Players who joined each game';
COMMENT ON TABLE commits IS 'Player vote commitments (hashes only)';
COMMENT ON TABLE reveals IS 'Revealed votes with salts for verification';
COMMENT ON TABLE user_profiles IS 'Basic player statistics and profiles';