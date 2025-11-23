# Minority Rule Game - Complete Testing Guide

This guide provides step-by-step instructions for testing the complete Minority Rule Game flow using pre-generated voting data and Flow CLI commands.

## Table of Contents

1. [Setup](#setup)
2. [Pre-Generated Voting Data](#pre-generated-voting-data)
3. [Complete Game Flow](#complete-game-flow)
4. [Query Commands](#query-commands)
5. [Multi-Player Scenarios](#multi-player-scenarios)
6. [Error Testing](#error-testing)
7. [Troubleshooting](#troubleshooting)

## Setup

### 1. Start Flow Emulator
```bash
# Start emulator with 1-second block time for faster testing
flow emulator --block-time 1s
```

### 2. Deploy Contracts
```bash
# Deploy all contracts to emulator
flow project deploy --network emulator

# Note the deployed contract address (replace Address(0x01) in transactions)
# Example: MinorityRuleGame deployed at 0xf8d6e0586b0a20c7
```

### 3. Replace Contract Address
After deployment, replace `Address(0x01)` with your actual contract address in ALL transaction files.

### 4. Account Setup
Ensure you have multiple accounts configured in `flow.json` for testing:
- `emulator-account` (contract deployer)
- `one-account` (player 1)  
- `two-account` (player 2)
- `three-account` (player 3)

## Pre-Generated Voting Data

The `voting-data/` folder contains pre-computed SHA3-256 hashes and salts for consistent testing:

### Available Accounts
- **one-account**: Salt and hashes for true/false votes
- **two-account**: Salt and hashes for true/false votes  
- **three-account**: Salt and hashes for true/false votes

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
./voting-data/scripts/one-account-commit-true.sh
./voting-data/scripts/two-account-commit-false.sh

# Example reveal scripts  
./voting-data/scripts/one-account-reveal-true.sh
./voting-data/scripts/two-account-reveal-false.sh
```

## Complete Game Flow

### Step 1: Create Game
```bash
# Creator creates a game (replace contract address)
flow transactions send cadence/transactions/CreateGame.cdc \
  "Is the sky blue?" 10.0 0xf8d6e0586b0a20c7 \
  --network emulator --signer emulator-account

# Note the Game ID from logs (e.g., Game ID: 1)
```

### Step 2: Set Commit Deadline
```bash
# Creator sets 60-second commit phase
flow transactions send cadence/transactions/SetCommitDeadline.cdc \
  1 60.0 0xf8d6e0586b0a20c7 \
  --network emulator --signer emulator-account
```

### Step 3: Players Join Game
```bash
# Player 1 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  1 0xf8d6e0586b0a20c7 \
  --network emulator --signer one-account

# Player 2 joins  
flow transactions send cadence/transactions/JoinGame.cdc \
  1 0xf8d6e0586b0a20c7 \
  --network emulator --signer two-account

# Player 3 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  1 0xf8d6e0586b0a20c7 \
  --network emulator --signer three-account
```

### Step 4: Check Game Status
```bash
flow scripts execute cadence/scripts/GetGameInfo.cdc 1 0xf8d6e0586b0a20c7 --network emulator
```

### Step 5: Players Submit Commits
```bash
# Player 1 commits TRUE vote (using pre-generated hash)
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "5e83ea7648f405e55ef88ebd6088ab6c54b20d8b772d7a40c61878be5d4eb2a1" 0xf8d6e0586b0a20c7 \
  --network emulator --signer one-account

# Player 2 commits FALSE vote
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "a7f428d7429c8b5b5b5f0c3e3d3f3b3c3d3f3b3c3d3f3b3c3d3f3b3c3d3f3b3c" 0xf8d6e0586b0a20c7 \
  --network emulator --signer two-account

# Player 3 commits TRUE vote  
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "9c39138507c34db447788a0d9f79548d101dbca48acc0cf45049ab78a8814808" 0xf8d6e0586b0a20c7 \
  --network emulator --signer three-account
```

### Step 6: Set Reveal Deadline
```bash
# Creator sets 60-second reveal phase
flow transactions send cadence/transactions/SetRevealDeadline.cdc \
  1 60.0 0xf8d6e0586b0a20c7 \
  --network emulator --signer emulator-account
```

### Step 7: Players Reveal Votes
```bash
# Player 1 reveals TRUE vote (using matching salt)
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 true "3eff3d8ea9ce45d6fb484503cf9965298536dbc7831de0d75777066a14414b9b" 0xf8d6e0586b0a20c7 \
  --network emulator --signer one-account

# Player 2 reveals FALSE vote
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 false "salt-for-two-account-from-json" 0xf8d6e0586b0a20c7 \
  --network emulator --signer two-account

# Player 3 reveals TRUE vote
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 true "aae6efcd9f30422767e3b3bcb249817a146c37500b3720ffc81f700f694c4afa" 0xf8d6e0586b0a20c7 \
  --network emulator --signer three-account
```

### Step 8: Process Round
```bash
# Process round (can be done by anyone after all reveals or deadline)
flow transactions send cadence/transactions/ProcessRound.cdc \
  1 0xf8d6e0586b0a20c7 \
  --network emulator --signer emulator-account
```

### Step 9: Continue Game or End
If more than 2 players remain, repeat steps 5-8 for next round.
If ≤2 players remain, game ends automatically and distributes prizes.

## Query Commands

### Basic Game Information
```bash
# Get comprehensive game info
flow scripts execute cadence/scripts/GetGameInfo.cdc 1 0xf8d6e0586b0a20c7 --network emulator

# Get current phase info
flow scripts execute cadence/scripts/GetCurrentPhase.cdc 1 0xf8d6e0586b0a20c7 --network emulator

# Get player status
flow scripts execute cadence/scripts/GetPlayerStatus.cdc \
  0x179b6b1cb6755e31 1 0xf8d6e0586b0a20c7 --network emulator
```

### Game State Monitoring
```bash
# Get all game states
flow scripts execute cadence/scripts/GetGameStates.cdc 0xf8d6e0586b0a20c7 --network emulator

# Get round history
flow scripts execute cadence/scripts/GetRoundHistory.cdc 1 0xf8d6e0586b0a20c7 --network emulator

# Get available games
flow scripts execute cadence/scripts/GetGamesPage.cdc 0xf8d6e0586b0a20c7 --network emulator
```

## Multi-Player Scenarios

### 3-Player Game Example
This scenario demonstrates a complete 3-player game with minority elimination:

**Round 1: 3 players vote**
- Player 1: TRUE (using one-account data)
- Player 2: FALSE (using two-account data) 
- Player 3: TRUE (using three-account data)
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
  1 "hash" true "salt" 0xf8d6e0586b0a20c7 --network emulator

# Test contract deployment  
flow scripts execute cadence/scripts/TestContractAccess.cdc 0xf8d6e0586b0a20c7 --network emulator
```

### Quick Reset
```bash
# Restart emulator to reset all state
# Re-deploy contracts
# Start fresh game testing
```

## Using Pre-Generated Voting Data

### Example with JSON Data
```bash
# 1. Check voting data
cat voting-data/one-account-voting-data.json

# 2. Use the ready commands (replace <GAME_ID> with actual ID)
flow transactions send cadence/transactions/SubmitCommit.cdc 1 "5e83ea7648f405e55ef88ebd6088ab6c54b20d8b772d7a40c61878be5d4eb2a1" 0xf8d6e0586b0a20c7 --network emulator --signer one-account

# 3. Then use matching reveal
flow transactions send cadence/transactions/SubmitReveal.cdc 1 true "3eff3d8ea9ce45d6fb484503cf9965298536dbc7831de0d75777066a14414b9b" 0xf8d6e0586b0a20c7 --network emulator --signer one-account
```

### Using Shell Scripts
```bash
# Make scripts executable
chmod +x voting-data/scripts/*.sh

# Run commit (after editing to replace <GAME_ID>)
./voting-data/scripts/one-account-commit-true.sh

# Run reveal (after editing to replace <GAME_ID>)  
./voting-data/scripts/one-account-reveal-true.sh
```

This completes the comprehensive testing guide for the Minority Rule Game. Follow these steps to test all aspects of the game mechanics, from creation to completion.