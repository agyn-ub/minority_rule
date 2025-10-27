# Minority Rule Game Testing Guide

This guide walks you through testing the Minority Rule Game on Flow testnet.

## Prerequisites

- Flow CLI installed and configured
- Test accounts created with sufficient FLOW tokens
- Contract deployed to testnet (see README for deployment)

## Game Flow Overview

1. **Round 1**: Game creation and player joining phase
2. **Round 2+**: Voting rounds (no new players allowed)
3. **Game End**: When 1-2 players remain, prizes distributed automatically

## Step-by-Step Testing

### 1. Create a New Game

The game creator starts a new game by providing:
- A yes/no question
- Entry fee amount (in FLOW)
- Round duration (in seconds)

```bash
flow transactions send cadence/transactions/CreateGame.cdc \
  "Is the sky blue?" 10.0 600.0 \
  --network testnet --signer one-account
```

**Costs for creator:**
- Entry fee: 10 FLOW (same as other players)
- Scheduling fund: 1 FLOW (funds automatic round processing)

**Note:** Save the `gameId` from the transaction event - you'll need it for all subsequent operations.

### 2. Join the Game (Round 1 Only)

Other players can join ONLY during Round 1:

```bash
flow transactions send cadence/transactions/JoinGame.cdc \
  1 \
  --network testnet --signer two-account
```

**Requirements:**
- Must join during Round 1
- Must pay the entry fee (10 FLOW in this example)
- Cannot join after Round 1 ends

### 3. Submit Votes

All players (including creator) submit their vote for the current round:

```bash
# Vote YES
flow transactions send cadence/transactions/SubmitVote.cdc \
  2 true \
  --network testnet --signer one-account

flow transactions send cadence/transactions/SubmitVote.cdc \
  2 false \
  --network testnet --signer two-account

flow transactions send cadence/transactions/SubmitVote.cdc \
  2 false \
  --network testnet --signer three-account

flow transactions send cadence/transactions/SubmitVote.cdc \
  2 false \
  --network testnet --signer four-account

flow transactions send cadence/transactions/SubmitVote.cdc \
  2 false \
  --network testnet --signer five-account



# Vote NO
flow transactions send cadence/transactions/SubmitVote.cdc \
  <gameId> false \
  --network testnet --signer <player-account>
```

**Rules:**
- Can only vote once per round
- Must be an active player (not eliminated)
- Vote before round deadline

### 4. Process Round

Rounds are processed automatically via scheduled transactions, but can also be triggered manually:

```bash
flow transactions send cadence/transactions/ProcessRound.cdc \
  <gameId> \
  --network testnet --signer <any-account>
```

**What happens:**
- Counts yes/no votes
- Determines minority vote
- Eliminates majority voters
- Schedules next round (if >2 players remain)
- Distributes prizes (if ≤2 players remain)

### 5. Query Game Status

Check the current state of any game:

```bash
# Get complete game information
flow scripts execute cadence/scripts/GetGameInfo.cdc 2 0x73c003cd6de60fd4 --network testnet

# Check if a player can vote in current round
flow scripts execute cadence/scripts/GetPlayerVotingToken.cdc \
  <playerAddress> <gameId> \
  --network testnet
```

## Testing Scenarios

### Scenario 1: Basic Game Flow

1. **Account Setup**: Create 5 test accounts with 15+ FLOW each
2. **Create Game**: Account 1 creates game with 10 FLOW entry, 60 second rounds
3. **Join Phase**: Accounts 2-5 join during Round 1
4. **First Vote**: All players vote (aim for uneven split)
5. **Process**: Wait 60 seconds, process round
6. **Continue**: Remaining players vote in Round 2
7. **Winner**: Continue until 1-2 players remain

### Scenario 2: Edge Cases

- **Late Joining**: Try joining after Round 1 ends (should fail)
- **Double Voting**: Try voting twice in same round (should fail)
- **No Votes**: Process round with no votes (all eliminated)
- **Tie Votes**: Equal yes/no votes (both groups eliminated)

### Scenario 3: Scheduling Test

1. Create game with 120 second rounds
2. Monitor automatic processing (should trigger after deadline)
3. Check scheduling vault balance decreases with each round

## Fee Structure

Total fees: **3% of prize pool**
- **2%** → Platform recipient (profit)
- **1%** → Contract storage vault (funds future games)

Example with 5 players × 10 FLOW = 50 FLOW pool:
- Platform fee: 1 FLOW (2%)
- Storage fee: 0.5 FLOW (1%)
- Prize pool: 48.5 FLOW

## Common Commands Reference

```bash
# Create game (replace values)
flow transactions send cadence/transactions/CreateGame.cdc \
  "<question>" <entryFee> <roundDuration> \
  --network testnet --signer <account>

# Join game
flow transactions send cadence/transactions/JoinGame.cdc \
  <gameId> \
  --network testnet --signer <account>

# Submit vote (true/false)
flow transactions send cadence/transactions/SubmitVote.cdc \
  <gameId> <vote> \
  --network testnet --signer <account>

# Process round manually
flow transactions send cadence/transactions/ProcessRound.cdc \
  <gameId> \
  --network testnet --signer <account>

# Query game info
flow scripts execute cadence/scripts/GetGameInfo.cdc \
  <gameId> \
  --network testnet

# Check player status
flow scripts execute cadence/scripts/GetPlayerVotingToken.cdc \
  <address> <gameId> \
  --network testnet
```

## Troubleshooting

### Transaction Fails: "Player not in remaining players"
- Player was eliminated in previous round
- Check player status with GetPlayerVotingToken script

### Transaction Fails: "Can only join during round 1"
- Game has progressed past joining phase
- Create a new game to test joining

### Round Not Processing
- Check if round deadline has passed
- Verify scheduling vault has funds
- Manually trigger with ProcessRound transaction

### Contract Address Issues
- Ensure you've replaced `Address(0x01)` placeholder in all transactions/scripts
- Use the actual deployed contract address

## Expected Game Flow

1. **5 players join** → Prize pool: 50 FLOW
2. **Round 1 votes**: 3 YES, 2 NO → NO is minority
3. **2 players remain** → Each wins ~24.25 FLOW
4. **Fees deducted**: 1.5 FLOW total (3%)

## Notes

- Games start immediately upon creation (no separate start phase)
- Round 1 is special: allows joining AND voting
- Automatic scheduling requires testnet FlowTransactionScheduler
- Manual processing always available as backup