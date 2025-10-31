# Minority Rule Game Testing Guide

This guide walks you through testing the Minority Rule Game with the **Forte Scheduler Integration** on Flow testnet.

## Prerequisites

- Flow CLI installed and configured
- Test accounts created with sufficient FLOW tokens
- Contract deployed to testnet (six-account: 0x44a19c1836c03e74)

## Game Flow Overview with Forte Integration

The game uses a **creator-controlled timing system** with Forte scheduler:

1. **Game Creation** → `setCommitDeadline` state
2. **Creator Schedules** → Commit deadline with Forte → `setRevealDeadline` state  
3. **Creator Schedules** → Reveal deadline with Forte → `commitPhase` state
4. **Players Join & Commit** → Submit vote commitments
5. **Forte Triggers** → Reveal phase when commit deadline reached
6. **Players Reveal** → Submit actual votes with salt
7. **Forte Triggers** → Round processing when reveal deadline reached
8. **Repeat or End** → Next round or game completion

## Complete Transaction Workflow

### Phase 1: Game Setup (Creator Only)

#### 1. Create New Game
```bash
flow transactions send cadence/transactions/CreateGame.cdc \
  "Is the sky blue?" 10.0 \
  --network testnet --signer six-account
```
**Result:** Game created in `setCommitDeadline` state, ready for scheduling

#### 2. Schedule Commit Deadline
```bash
flow transactions send cadence/transactions/ScheduleCommitDeadline.cdc \
  1 3600.0 \
  --network testnet --signer six-account
```
**Result:** Game moves to `setRevealDeadline` state. Now configure Forte scheduler for commit deadline.

#### 3. Schedule Reveal Deadline  
```bash
flow transactions send cadence/transactions/ScheduleRevealDeadline.cdc \
  1 1800.0 \
  --network testnet --signer six-account
```
**Result:** Game moves to `commitPhase` state. Players can now join and commit! Configure Forte scheduler for reveal deadline.

### Phase 2: Player Participation

#### 4. Players Join Game (Round 1 Only)
```bash
# Creator joins game (after scheduling is complete)
flow transactions send cadence/transactions/JoinGame.cdc \
  1 \
  --network testnet --signer six-account

# Player 2 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  1 \
  --network testnet --signer one-account

# Player 3 joins  
flow transactions send cadence/transactions/JoinGame.cdc \
  1 \
  --network testnet --signer two-account

# Player 4 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  1 \
  --network testnet --signer three-account

# Player 5 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  1 \
  --network testnet --signer four-account
```
**Requirements:** Must join during Round 1 after game reaches `commitPhase`, pay entry fee (10 FLOW each)

#### 5. Players Submit Commit Hashes
First generate commit hashes using your salt generation script, then submit:

```bash
# Creator commits (example hash)
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "77dcfad4d6c49e9e1d65b5b8b767bc9dc608f17b966d45109619d2750b646453" \
  --network testnet --signer six-account

# Player 2 commits 
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "a1b2c3d4e5f6789..." \
  --network testnet --signer one-account

# Player 3 commits
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "b2c3d4e5f6789a..." \
  --network testnet --signer two-account

# Player 4 commits
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "c3d4e5f6789ab..." \
  --network testnet --signer three-account

# Player 5 commits
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "d4e5f6789abc..." \
  --network testnet --signer four-account
```

### Phase 3: Forte Scheduler Callbacks

#### 6. Forte Triggers Reveal Phase (Automatic)
When commit deadline reached, Forte calls:
```bash
flow transactions send cadence/transactions/StartRevealPhase.cdc \
  1 \
  --network testnet --signer forte-scheduler-account
```
**Result:** Game transitions to `revealPhase` state

#### 7. Players Reveal Votes
```bash
# Creator reveals (vote=true, salt from generation)
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 true "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" \
  --network testnet --signer six-account

# Player 2 reveals (vote=false)
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 false "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" \
  --network testnet --signer one-account

# Player 3 reveals (vote=false)
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 false "567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234" \
  --network testnet --signer two-account

# Player 4 reveals (vote=true)  
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 true "cdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab" \
  --network testnet --signer three-account

# Player 5 reveals (vote=false)
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 false "90abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456" \
  --network testnet --signer four-account
```

#### 8. Forte Processes Round (Automatic)
When reveal deadline reached, Forte calls:
```bash
flow transactions send cadence/transactions/ProcessRound.cdc \
  1 \
  --network testnet --signer forte-scheduler-account
```
**Result:** Round processed, minority voters advance to next round OR game ends with prizes distributed

### Phase 4: Next Round (If Game Continues)

If more than 2 players remain, the game starts a new round in `setCommitDeadline` state. Creator must:

1. **Schedule new commit deadline** (repeat step 2)
2. **Schedule new reveal deadline** (repeat step 3)  
3. **Remaining players commit** (repeat step 5)
4. **Forte triggers reveal** (repeat step 6)
5. **Remaining players reveal** (repeat step 7)
6. **Forte processes round** (repeat step 8)

## Monitoring Commands

### Check Game Status
```bash
# Comprehensive game info
flow scripts execute cadence/scripts/GetGameInfo.cdc 1 --network testnet

# Current phase and timing
flow scripts execute cadence/scripts/GetCurrentPhase.cdc 1 --network testnet

# Specific player status
flow scripts execute cadence/scripts/GetPlayerStatus.cdc 1 0x44a19c1836c03e74 --network testnet

# Round history and analytics
flow scripts execute cadence/scripts/GetRoundHistory.cdc 1 --network testnet

# All games overview
flow scripts execute cadence/scripts/GetAllActiveGames.cdc 10 --network testnet

# Detailed game statistics
flow scripts execute cadence/scripts/GetGameStats.cdc 1 --network testnet
```

## Testing Scenarios

### Scenario 1: Complete Game Flow
1. **Creator**: Creates game → schedules commit deadline → schedules reveal deadline
2. **Players**: Join game → submit commits → submit reveals  
3. **Forte**: Triggers reveal phase → processes round
4. **Result**: Minority voters advance, majority eliminated
5. **Repeat**: Until ≤2 players remain, then prizes distributed

### Scenario 2: Elimination Testing
**Setup**: 5 players vote 3 YES, 2 NO
**Result**: 2 NO voters advance (minority), 3 YES voters eliminated
**Prize**: 2 remaining players split ~48.5 FLOW (after 3% fees)

### Scenario 3: Edge Cases
- **Late joining**: Try joining after `commitPhase` starts (should fail)
- **No reveal**: Commit but don't reveal (player eliminated)
- **Wrong salt**: Reveal with wrong salt (transaction fails)
- **Double commit**: Try committing twice (should fail)

## State Machine Reference

| State | Description | Who Can Act | Next State |
|-------|-------------|-------------|------------|
| `setCommitDeadline` | Waiting for creator to schedule commit deadline | Creator only | `setRevealDeadline` |
| `setRevealDeadline` | Waiting for creator to schedule reveal deadline | Creator only | `commitPhase` |
| `commitPhase` | Players can join (Round 1) and submit commits | Players | `revealPhase` (via Forte) |
| `revealPhase` | Players reveal their votes | Players | `processingRound` (via Forte) |
| `processingRound` | Processing round results | Forte only | `setCommitDeadline` OR `completed` |
| `completed` | Game finished, prizes distributed | No one | Final state |

## Expected Output Example

**Round 1 Results:**
- **5 players joined**: 50 FLOW total pool
- **Votes**: 3 YES, 2 NO → NO is minority  
- **Survivors**: 2 players (NO voters)
- **Prize per winner**: ~24.25 FLOW each
- **Fees deducted**: 1.5 FLOW (3% total)

## Fee Structure

- **Total fees**: 3% of prize pool
- **Platform fee**: 2% → Platform recipient  
- **Storage fee**: 1% → Contract storage for future games

## Important Notes

- ✅ **Creator controls timing** - Must manually schedule deadlines
- ✅ **Forte handles transitions** - Automatic phase changes at deadlines
- ✅ **Commit-reveal voting** - Prevents vote manipulation
- ✅ **Only revealed players continue** - Must both commit AND reveal
- ✅ **No scheduling fees** - Pay-per-use Forte integration
- ✅ **Contract address**: 0x44a19c1836c03e74 (six-account)

## Troubleshooting

| Error | Cause | Solution |
|-------|--------|----------|
| "set CommitDeadline" state error | Wrong game state | Check current phase with GetCurrentPhase script |
| "Player not eligible to commit" | Player not joined or eliminated | Check player status with GetPlayerStatus script |
| "Commit deadline already scheduled" | Already called ScheduleCommitDeadline | Game is ready for ScheduleRevealDeadline |
| "Reveal does not match commitment" | Wrong vote or salt | Use exact same vote and salt from commit generation |
| "Game not found" | Wrong game ID | Check existing games with GetAllActiveGames script |