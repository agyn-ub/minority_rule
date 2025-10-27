# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Minority Rule Game** implemented on the Flow blockchain using Cadence. Players answer yes/no questions, and only those who vote with the minority advance to the next round. The game continues until 1-2 players remain and split the prize pool.

## Key Architecture Decisions

### Storage Model (Full On-Chain)
The contract stores ALL player data on-chain after careful consideration of tradeoffs:
- **Initial approach**: Event-based (minimal storage, players tracked via events)
- **Security issue**: Players could fake vote history with self-controlled resources
- **Final decision**: Store everything in contract with 3% total fee to cover costs
  - `players: [Address]` - All participants
  - `playerVoteHistory: {Address: [VoteRecord]}` - Complete voting history  
  - `remainingPlayers: [Address]` - Active players each round

### Fee Structure
- **Total: 3%** of prize pool
  - **2%** goes to platform recipient (profit)
  - **1%** stays in contract storage vault (funds future storage needs)
- Storage costs ~50 bytes per address, ~50 FLOW for 1M players
- Platform fee easily covers storage even for massive games

### Scheduling System
Creator funds game operation:
- **Entry fee**: Same as other players (e.g., 10 FLOW)
- **Scheduling fund**: 1 FLOW (funds ~100 rounds at 0.01 FLOW/round)
- Each round automatically schedules the next when processed
- Backup: If scheduling fails, first voter triggers processing

### Game Flow (Simplified)
- **No separate start**: Game begins immediately when created
- **Round 1 = Join window**: New players can only join during Round 1
- **Round 2+**: No new players allowed, only Round 1 participants continue

## Flow CLI Commands

### Start Development Environment
```bash
# Start emulator with 1-second block time
flow emulator --block-time 1s

# Deploy all contracts
flow project deploy --network emulator
```

### Contract Deployment Order
1. Deploy `MinorityRuleGame` first (main contract)
2. Note the deployed address
3. **CRITICAL**: Replace `Address(0x01)` with actual contract address in ALL transactions/scripts

### Testing Transactions
```bash
# Create a game (creator pays entry + 1 FLOW scheduling, game starts immediately)
flow transactions send cadence/transactions/CreateGame.cdc \
  "Is the sky blue?" 10.0 3600.0 \
  --network emulator --signer emulator-account

# Join a game (only allowed during Round 1, players pay entry fee)
flow transactions send cadence/transactions/JoinGame.cdc \
  <gameId> \
  --network emulator --signer player-account

# Submit vote
flow transactions send cadence/transactions/SubmitVote.cdc \
  <gameId> true \
  --network emulator --signer player-account

# Process round (usually automated, can trigger manually)
flow transactions send cadence/transactions/ProcessRound.cdc \
  <gameId> \
  --network emulator --signer emulator-account
```

### Query Scripts
```bash
# Get game info
flow scripts execute cadence/scripts/GetGameInfo.cdc <gameId> --network emulator

# Check player status in game
flow scripts execute cadence/scripts/GetPlayerVotingToken.cdc <playerAddress> <gameId> --network emulator
```

## Contract Architecture

### MinorityRuleGame.cdc (Main Contract)
Core game logic with three main components:

1. **GameManager** resource - Container for all games
   - Singleton stored in contract account
   - Public interface (`GameManagerPublic`) for transactions
   - Creates and manages Game resources

2. **Game** resource - Individual game instance
   - Stores players, votes, scheduling funds
   - Handles voting and round processing
   - Auto-distributes prizes when game ends

3. **Storage paths**:
   - `/storage/MinorityRuleGameManager` - GameManager storage
   - `/public/MinorityRuleGameManager` - Public capability

### Supporting Contracts

**ProcessRoundHandler.cdc**
- Placeholder for Flow scheduled transaction integration
- Will handle automatic round processing when FlowTransactionScheduler available

**MinorityGameTransactionHandler.cdc**  
- Placeholder for Forte network scheduled transactions
- Currently simplified until mainnet support

## Critical Implementation Details

### Contract Address Resolution
All transactions/scripts contain placeholder `Address(0x01)`. Must be replaced with actual deployed contract address:
```cadence
// In every transaction/script:
let contractAddress = Address(0x01) // TODO: Replace with actual contract address
```

### Game States
```cadence
enum GameState {
    case votingOpen      // Active round, accepting votes
    case processingRound // Processing results
    case completed       // Game ended, prizes distributed
}
```

### Round Processing Flow
1. Game created → Immediately in Round 1, voting open, scheduling activated
2. Players join during Round 1 only
3. Round deadline passes → Scheduled transaction executes
4. `processRound()` determines minority, updates `remainingPlayers`
5. If >2 players remain → Schedule next round automatically (Round 2+ no joining)
6. If ≤2 players → `endGame()` distributes prizes

### Vote Submission Protection
- Players must be in `remainingPlayers` to vote
- Can only vote once per round (tracked in `currentRoundVoters`)
- Deadline enforcement with backup trigger in `submitVote()`

## Common Development Patterns

### Creating a Complete Game Flow
1. Creator calls `CreateGame` (pays entry + 1 FLOW scheduling, game starts Round 1)
2. Other players call `JoinGame` during Round 1 only (pay entry fee)
3. Players call `SubmitVote` each round
4. Rounds process automatically via scheduling
5. Winners receive prizes automatically when game ends

### Handling Storage Costs
Contract self-funds through 1% retention:
- Each game contributes 1% to `contractStorageVault`
- Covers all on-chain storage costs
- No manual funding needed

### Testing Round Processing
Since scheduled transactions may not work in all environments:
- Rounds can be manually triggered with `ProcessRound` transaction
- First voter after deadline triggers backup processing
- Check `schedulingVault.balance` to ensure funds available

## Dependencies

The project uses standard Flow contracts:
- `FungibleToken` - Token interface
- `FlowToken` - FLOW token implementation
- `FlowTransactionScheduler` - Future scheduled transactions (testnet only currently)

All imported from Flow testnet/mainnet as configured in `flow.json`.