# Minority Rule Game - Complete Testing Guide

This guide provides step-by-step instructions for testing the complete Minority Rule Game flow using pre-generated voting data and Flow CLI commands.

## Recent Optimizations

The contract has been optimized to use blockchain events for data tracking instead of on-chain storage:
- ✅ **Event-driven architecture**: All game data tracked via events (`PlayerJoined`, `VoteCommitted`, `VoteRevealed`, etc.)
- ✅ **Reduced storage costs**: Removed `userGameHistory` on-chain storage
- ✅ **Standard DeFi approach**: Events are the industry standard for data tracking
- ✅ **Frontend integration**: React app writes directly to PostgreSQL from event data
- ✅ **Gas optimization**: Lower transaction costs without on-chain user history tracking

## Table of Contents

1. [Setup](#setup)
2. [Pre-Generated Voting Data](#pre-generated-voting-data)
3. [Complete Game Flow](#complete-game-flow)
4. [Query Commands](#query-commands)
5. [Multi-Player Scenarios](#multi-player-scenarios)
6. [Error Testing](#error-testing)
7. [Troubleshooting](#troubleshooting)

## Setup

### 1. Connect to Flow Testnet
```bash
# Ensure you have testnet access configured in flow.json
# No local emulator needed - using Flow testnet
```

### 2. Deploy Contracts
```bash
# Deploy all contracts to testnet
flow project deploy --network testnet

# Note the deployed contract address (replace Address(0x01) in transactions)
# Example: MinorityRuleGame deployed at 0x206a0f93916f5d8f
```

### 3. Replace Contract Address
After deployment, replace `Address(0x01)` with your actual testnet contract address in ALL transaction files.

### 4. Account Setup
Ensure you have multiple testnet accounts configured in `flow.json` for testing:
- `testnet-account` (contract deployer)
- `player-one-account` (player 1)  
- `player-two-account` (player 2)
- `player-three-account` (player 3)

## Pre-Generated Voting Data

The `voting-data/` folder contains pre-computed SHA3-256 hashes and salts for consistent testing:

### Available Accounts
- **player-one-account**: Salt and hashes for true/false votes
- **player-two-account**: Salt and hashes for true/false votes  
- **player-three-account**: Salt and hashes for true/false votes

### Data Structure
Each JSON file contains:
```json
{
  "account": "account-name",
  "salt": "64-character-hex-string",
  "hashes": {
    "voteTrue": "sha3-256-hash-for-true-vote",
    "voteFalse": "sha3-256-hash-for-false-vote"
  },
  "commands": {
    "commitTrue": "ready-to-use-commit-command",
    "commitFalse": "ready-to-use-commit-command",
    "revealTrue": "ready-to-use-reveal-command", 
    "revealFalse": "ready-to-use-reveal-command"
  }
}
```

### Shell Scripts
Use the scripts in `voting-data/scripts/` for easy testing:
```bash
# Example commit scripts
./voting-data/scripts/player-one-account-commit-true.sh
./voting-data/scripts/player-two-account-commit-false.sh

# Example reveal scripts  
./voting-data/scripts/player-one-account-reveal-true.sh
./voting-data/scripts/player-two-account-reveal-false.sh
```

## Complete Game Flow

### Step 1: Create Game
```bash
# Creator creates a game (replace contract address)
flow transactions send cadence/transactions/CreateGame.cdc \
  "Is the sky blue?" 10.0 0x206a0f93916f5d8f \
  --network testnet --signer testnet-account

# Note the Game ID from logs (e.g., Game ID: 1)
```

### Step 2: Set Commit Deadline
```bash
# Creator sets 60-second commit phase
flow transactions send cadence/transactions/SetCommitDeadline.cdc \
  1 60.0 0x206a0f93916f5d8f \
  --network testnet --signer testnet-account
```

### Step 3: Players Join Game
```bash
# Player 1 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  1 0x206a0f93916f5d8f \
  --network testnet --signer player-one-account

# Player 2 joins  
flow transactions send cadence/transactions/JoinGame.cdc \
  1 0x206a0f93916f5d8f \
  --network testnet --signer player-two-account

# Player 3 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  1 0x206a0f93916f5d8f \
  --network testnet --signer player-three-account
```

### Step 4: Check Game Status
```bash
flow scripts execute cadence/scripts/GetGameInfo.cdc 44 0x206a0f93916f5d8f --network testnet
```

### Step 5: Players Submit Commits
```bash
# Player 1 commits TRUE vote (using pre-generated hash)
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "5e83ea7648f405e55ef88ebd6088ab6c54b20d8b772d7a40c61878be5d4eb2a1" 0x206a0f93916f5d8f \
  --network testnet --signer player-one-account

# Player 2 commits FALSE vote
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "a7f428d7429c8b5b5b5f0c3e3d3f3b3c3d3f3b3c3d3f3b3c3d3f3b3c3d3f3b3c" 0x206a0f93916f5d8f \
  --network testnet --signer player-two-account

# Player 3 commits TRUE vote  
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "9c39138507c34db447788a0d9f79548d101dbca48acc0cf45049ab78a8814808" 0x206a0f93916f5d8f \
  --network testnet --signer player-three-account
```

### Step 6: Set Reveal Deadline
```bash
# Creator sets 60-second reveal phase
flow transactions send cadence/transactions/SetRevealDeadline.cdc \
  1 60.0 0x206a0f93916f5d8f \
  --network testnet --signer testnet-account
```

### Step 7: Players Reveal Votes
```bash
# Player 1 reveals TRUE vote (using matching salt)
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 true "3eff3d8ea9ce45d6fb484503cf9965298536dbc7831de0d75777066a14414b9b" 0x206a0f93916f5d8f \
  --network testnet --signer player-one-account

# Player 2 reveals FALSE vote
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 false "salt-for-two-account-from-json" 0x206a0f93916f5d8f \
  --network testnet --signer player-two-account

# Player 3 reveals TRUE vote
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 true "aae6efcd9f30422767e3b3bcb249817a146c37500b3720ffc81f700f694c4afa" 0x206a0f93916f5d8f \
  --network testnet --signer player-three-account
```

### Step 8: Process Round
```bash
# Process round (can be done by anyone after all reveals or deadline)
flow transactions send cadence/transactions/ProcessRound.cdc \
  1 0x206a0f93916f5d8f \
  --network testnet --signer testnet-account
```

### Step 9: Continue Game or End
If more than 2 players remain, repeat steps 5-8 for next round.
If ≤2 players remain, game ends automatically and distributes prizes.

## Query Commands

### Basic Game Information
```bash
# Get comprehensive game info
flow scripts execute cadence/scripts/GetGameInfo.cdc 1 0x206a0f93916f5d8f --network testnet

# Get current phase info
flow scripts execute cadence/scripts/GetCurrentPhase.cdc 1 0x206a0f93916f5d8f --network testnet

# Get player status
flow scripts execute cadence/scripts/GetPlayerStatus.cdc \
  0x179b6b1cb6755e31 1 0x206a0f93916f5d8f --network testnet
```

### Event-Based Data Tracking
Since the contract uses events for data tracking, user game history and detailed analytics should be queried from your PostgreSQL database (populated by listening to blockchain events) rather than on-chain storage. Key events to monitor:
- `PlayerJoined`: Track user participation
- `VoteCommitted`/`VoteRevealed`: Track voting behavior  
- `GameCompleted`: Track game outcomes and winnings

### Game State Monitoring
```bash
# Get all game states
flow scripts execute cadence/scripts/GetGameStates.cdc 0x206a0f93916f5d8f --network testnet

# Get round history
flow scripts execute cadence/scripts/GetRoundHistory.cdc 1 0x206a0f93916f5d8f --network testnet

# Get available games
flow scripts execute cadence/scripts/GetGamesPage.cdc 0x206a0f93916f5d8f --network testnet
```

## Multi-Player Scenarios

### 3-Player Game Example
This scenario demonstrates a complete 3-player game with minority elimination:

**Round 1: 3 players vote**
- Player 1: TRUE (using player-one-account data)
- Player 2: FALSE (using player-two-account data) 
- Player 3: TRUE (using player-three-account data)
- Result: FALSE is minority (1 vote), Player 2 advances alone

**Expected Outcome:** Game ends, Player 2 wins entire prize pool.

### 5-Player Game Setup
For larger games, you can:
1. Create additional accounts in `flow.json`
2. Generate new voting data or reuse existing hashes
3. Follow the same flow with more players

### Testing Different Vote Distributions
- **2 TRUE, 1 FALSE**: FALSE minority, 1 player advances
- **1 TRUE, 2 FALSE**: TRUE minority, 1 player advances  
- **All same vote**: No minority, all players eliminated (edge case)

## Error Testing

### Test Invalid Operations
```bash
# Try to join after Round 1
# Should fail: "Can only join during Round 1"

# Try to commit without deadline set
# Should fail: "Commit phase is not active"

# Try to reveal wrong vote for commit
# Should fail: "Reveal does not match commitment"

# Try to commit after deadline
# Should fail: "Commit deadline has passed"
```

### Test Deadline Violations
```bash
# Wait for commit deadline to pass, then try to commit
# Wait for reveal deadline to pass, then try to reveal
# Test manual round processing after deadlines
```

### Test Insufficient Players
```bash
# Create game with only 1 player
# Try to process round with no commits/reveals
# Test edge cases with equal vote counts
```

## Troubleshooting

### Common Issues

**"Could not borrow game manager"**
- Check contract address is correct in transaction
- Ensure contract is deployed properly

**"Reveal does not match commitment"** 
- Verify you're using matching vote and salt from JSON files
- Check commit hash was submitted correctly

**"Commit deadline has passed"**
- Increase deadline duration or commit faster
- Use manual deadline setting for testing

**"Game not found"**
- Verify game ID exists and is correct
- Check game was created successfully

### Debugging Commands
```bash
# Test commit-reveal mechanism
flow scripts execute cadence/scripts/TestCommitReveal.cdc \
  1 "hash" true "salt" 0x206a0f93916f5d8f --network testnet

# Test contract deployment  
flow scripts execute cadence/scripts/TestContractAccess.cdc 0x206a0f93916f5d8f --network testnet
```

### Quick Reset
```bash
# Deploy fresh contracts to testnet for clean state
# Re-deploy with new contract address
# Start fresh game testing
```

## Using Pre-Generated Voting Data

### Example with JSON Data
```bash
# 1. Check voting data
cat voting-data/player-one-account-voting-data.json

# 2. Use the ready commands (replace <GAME_ID> with actual ID)
flow transactions send cadence/transactions/SubmitCommit.cdc 1 "5e83ea7648f405e55ef88ebd6088ab6c54b20d8b772d7a40c61878be5d4eb2a1" 0x206a0f93916f5d8f --network testnet --signer player-one-account

# 3. Then use matching reveal
flow transactions send cadence/transactions/SubmitReveal.cdc 1 true "3eff3d8ea9ce45d6fb484503cf9965298536dbc7831de0d75777066a14414b9b" 0x206a0f93916f5d8f --network testnet --signer player-one-account
```

### Using Shell Scripts
```bash
# Make scripts executable
chmod +x voting-data/scripts/*.sh

# Run commit (after editing to replace <GAME_ID>)
./voting-data/scripts/player-one-account-commit-true.sh

# Run reveal (after editing to replace <GAME_ID>)  
./voting-data/scripts/player-one-account-reveal-true.sh
```

This completes the comprehensive testing guide for the Minority Rule Game. Follow these steps to test all aspects of the game mechanics, from creation to completion.