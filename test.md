# Minority Rule Game Testing Guide

This guide walks you through testing the Minority Rule Game with the **Forte Scheduler Integration** on Flow testnet.

## Prerequisites

- Flow CLI installed and configured
- Test accounts created with sufficient FLOW tokens
- Contract deployed to testnet (seven-account: 0xb69240f6be3e34ca)

## Game Flow Overview with Flow Scheduled Transactions

The game uses **automated phase transitions** with Flow's scheduled transaction system:

1. **Game Creation** → `commitPhase` state (starts immediately)
2. **Players Join & Commit** → Submit vote commitments
3. **Scheduled EndCommitHandler** → Automatically transitions to `revealPhase`
4. **Players Reveal** → Submit actual votes with salt
5. **Scheduled EndRevealHandler** → Automatically processes round (`processingRound` → `commitPhase` or `completed`)
6. **Repeat or End** → Next round or game completion

## Complete Transaction Workflow

### Phase 1: Game Setup

#### 1. Create New Game
```bash
flow transactions send cadence/transactions/CreateGame.cdc \
  "Is the sky blue?" 10.0 \
  --network testnet --signer seven-account
```
**Result:** Game created and starts immediately in `commitPhase` state

#### 2. Schedule Commit Deadline (Creator Only)
```bash
# Schedule automatic end of commit phase in 1 hour (3600 seconds)
flow transactions send cadence/transactions/ScheduleCommitDeadline.cdc \
  8 60.0 \
  --network testnet --signer seven-account

  flow scripts execute cadence/scripts/GetScheduledTransactionStatus.cdc \
  35232 \
  --network testnet
```
**Result:** EndCommitHandler scheduled to automatically transition to `revealPhase` after delay
**Authorization:** Only the game creator (seven-account in this example) can schedule deadlines

#### 3. Schedule Reveal Deadline (Creator Only)
```bash


  # just for users to inform
   flow transactions send cadence/transactions/SetCommitDeadline.cdc \
    8 60.0 \
    --network testnet --signer seven-account

 # just for users to inform
flow transactions send cadence/transactions/SetRevealDeadline.cdc \
    8 60.0 \
    --network testnet --signer seven-account




# Schedule automatic end of reveal phase in 30 minutes (1800 seconds) after reveal phase starts
flow transactions send cadence/transactions/ScheduleRevealDeadline.cdc \
  8 60.0 \
  --network testnet --signer seven-account
```
**Result:** EndRevealHandler scheduled to automatically process round after reveal phase delay
**Authorization:** Only the game creator can schedule deadlines

### Phase 2: Player Participation

#### 4. Players Join Game (Round 1 Only)
```bash
# Creator joins game (game starts immediately, no scheduling delay)
flow transactions send cadence/transactions/JoinGame.cdc \
  8 \
  --network testnet --signer one-account

# Player 2 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  2 \
  --network testnet --signer one-account

# Player 3 joins  
flow transactions send cadence/transactions/JoinGame.cdc \
  2 \
  --network testnet --signer two-account

# Player 4 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  2 \
  --network testnet --signer three-account

# Player 5 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  2 \
  --network testnet --signer four-account
```
**Requirements:** Must join during Round 1 while in `commitPhase`, pay entry fee (10 FLOW each)

#### 5. Players Submit Commit Hashes
First generate commit hashes using your salt generation script, then submit:

```bash
# Creator commits (example hash)
flow transactions send cadence/transactions/SubmitCommit.cdc \
  2 "77dcfad4d6c49e9e1d65b5b8b767bc9dc608f17b966d45109619d2750b646453" \
  --network testnet --signer seven-account

# Player 2 commits 
flow transactions send cadence/transactions/SubmitCommit.cdc \
  2 "a1b2c3d4e5f6789..." \
  --network testnet --signer one-account

# Player 3 commits
flow transactions send cadence/transactions/SubmitCommit.cdc \
  2 "b2c3d4e5f6789a..." \
  --network testnet --signer two-account

# Player 4 commits
flow transactions send cadence/transactions/SubmitCommit.cdc \
  2 "c3d4e5f6789ab..." \
  --network testnet --signer three-account

# Player 5 commits
flow transactions send cadence/transactions/SubmitCommit.cdc \
  2 "d4e5f6789abc..." \
  --network testnet --signer four-account
```

### Phase 3: Automatic Phase Transitions

#### 6. Scheduled Transition to Reveal Phase (Automatic)
When commit deadline reached, EndCommitHandler automatically executes:
- **No manual intervention needed**
- **Flow's scheduled transaction system handles it**
- **Game transitions to `revealPhase` state**

To check scheduled transaction status:
```bash
# Check status of scheduled transaction (use transaction ID from scheduling)
cd scripts && ./check-transaction-status.sh <transaction_id>
```

#### 7. Players Reveal Votes
```bash
# Creator reveals (vote=true, salt from generation)
flow transactions send cadence/transactions/SubmitReveal.cdc \
  2 true "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" \
  --network testnet --signer seven-account

# Player 2 reveals (vote=false)
flow transactions send cadence/transactions/SubmitReveal.cdc \
  2 false "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" \
  --network testnet --signer one-account

# Player 3 reveals (vote=false)
flow transactions send cadence/transactions/SubmitReveal.cdc \
  2 false "567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234" \
  --network testnet --signer two-account

# Player 4 reveals (vote=true)  
flow transactions send cadence/transactions/SubmitReveal.cdc \
  2 true "cdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab" \
  --network testnet --signer three-account

# Player 5 reveals (vote=false)
flow transactions send cadence/transactions/SubmitReveal.cdc \
  2 false "90abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456" \
  --network testnet --signer four-account
```

#### 8. Scheduled Round Processing (Automatic)
When reveal deadline reached, EndRevealHandler automatically executes:
- **No manual intervention needed**
- **Flow's scheduled transaction system handles it**
- **Round processed, minority voters advance to next round OR game ends with prizes distributed**

To check scheduled transaction status:
```bash
# Check status of scheduled transaction (use transaction ID from scheduling)
cd scripts && ./check-transaction-status.sh <transaction_id>
```

### Phase 4: Next Round (If Game Continues)

If more than 2 players remain, the game automatically starts a new round in `commitPhase` state. The creator must:

1. **Schedule new commit deadline** (repeat step 2) - Creator only
2. **Schedule new reveal deadline** (repeat step 3) - Creator only  
3. **Remaining players commit** (repeat step 5)
4. **Scheduled handler triggers reveal** (automatic)
5. **Remaining players reveal** (repeat step 7)
6. **Scheduled handler processes round** (automatic)

## Monitoring Commands

### Check Game Status with Human-Readable Times
```bash
# Comprehensive game info
flow scripts execute cadence/scripts/GetGameInfo.cdc 8 --network testnet

# Current phase and timing
flow scripts execute cadence/scripts/GetCurrentPhase.cdc 8 --network testnet

# Specific player status
flow scripts execute cadence/scripts/GetPlayerStatus.cdc 8 0x73c003cd6de60fd4 --network testnet

# Round history and analytics
flow scripts execute cadence/scripts/GetRoundHistory.cdc 2 --network testnet

# All games overview
flow scripts execute cadence/scripts/GetAllActiveGames.cdc 10 --network testnet

# Detailed game statistics
flow scripts execute cadence/scripts/GetGameStats.cdc 2 --network testnet



# Check scheduled transaction status
cd scripts && ./check-transaction-status.sh <transaction_id>
```

**New Feature: Human-Readable Time Display**

The game now shows exact dates and times instead of Unix timestamps:

**Example Output:**
```json
{
  "commitDeadline": 1698765432.0,
  "commitDeadlineFormatted": "2024/11/1 15:30:32 UTC",
  "revealDeadline": 1698767232.0, 
  "revealDeadlineFormatted": "2024/11/1 16:00:32 UTC",
  "timeRemaining": "2h 15m 30s remaining"
}
```

**Benefits:**
- ✅ **Clear deadlines**: See exact date/time when phases end
- ✅ **Countdown timers**: Know how much time is left
- ✅ **Better UX**: No more confusing Unix timestamps
- ✅ **Multiple formats**: Both raw and formatted times available

## Testing Scenarios

### Scenario 1: Complete Game Flow
1. **Creator**: Creates game (starts immediately) → schedules commit deadline → schedules reveal deadline
2. **Players**: Join game → submit commits → submit reveals  
3. **Flow Scheduled Transactions**: Automatically trigger reveal phase → automatically process round
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

### Scenario 4: Authorization Testing
**Setup**: Game created by seven-account, other players try to schedule deadlines
**Test unauthorized scheduling**:
```bash
# This will FAIL - only creator can schedule deadlines
flow transactions send cadence/transactions/ScheduleCommitDeadline.cdc \
  2 3600.0 \
  --network testnet --signer one-account
```
**Expected Error**: "Access denied: Only the game creator (0xb69240f6be3e34ca) can perform this action. Caller: 0x73c003cd6de60fd4"

**Result**: Authorization working correctly, game creator maintains control

## State Machine Reference

| State | Description | Who Can Act | Next State |
|-------|-------------|-------------|------------|
| `commitPhase` | Players can join (Round 1) and submit commits | Players | `revealPhase` (via scheduled handler) |
| `revealPhase` | Players reveal their votes | Players | `processingRound` (via scheduled handler) |
| `processingRound` | Processing round results | Scheduled handler only | `commitPhase` OR `completed` |
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

- ✅ **Creator controls scheduling** - Only game creators can schedule deadlines
- ✅ **Flow handles transitions** - Automatic phase changes via scheduled transactions
- ✅ **Commit-reveal voting** - Prevents vote manipulation
- ✅ **Only revealed players continue** - Must both commit AND reveal
- ✅ **Scheduling fees** - Pay FLOW for scheduled transaction execution
- ✅ **Contract address**: 0xb69240f6be3e34ca (seven-account)
- ✅ **Check transaction status** - Use `./scripts/check-transaction-status.sh` to monitor scheduled transactions

## Troubleshooting

| Error | Cause | Solution |
|-------|--------|----------|
| "set CommitDeadline" state error | Wrong game state | Check current phase with GetCurrentPhase script |
| "Player not eligible to commit" | Player not joined or eliminated | Check player status with GetPlayerStatus script |
| "Commit deadline already scheduled" | Already called ScheduleCommitDeadline | Game is ready for ScheduleRevealDeadline |
| "Reveal does not match commitment" | Wrong vote or salt | Use exact same vote and salt from commit generation |
| "Game not found" | Wrong game ID | Check existing games with GetAllActiveGames script |
| "Access denied: Only the game creator can perform this action" | Non-creator trying to schedule deadlines | Only the game creator can call ScheduleCommitDeadline/ScheduleRevealDeadline |

#transaction info
flow scripts execute cadence/scripts/GetScheduledTransactionStatus.cdc \
  35236 \
  --network testnet