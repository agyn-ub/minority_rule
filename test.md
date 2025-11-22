# Minority Rule Game Testing Guide

This guide walks you through testing the Minority Rule Game with **manual control** on Flow blockchain.

## Prerequisites

- Flow CLI installed and configured
- Test accounts created with sufficient FLOW tokens
- Contract deployed to emulator/testnet

## Game Flow Overview with Manual Control

The game uses **manual phase transitions** for full control and easy testing:

1. **Game Creation** → `commitPhase` state (starts immediately)
2. **Set Deadlines** → Creator sets commit and reveal deadlines
3. **Players Join & Commit** → Submit vote commitments before deadline
4. **Manual Transition** → Anyone calls `EndCommitPhase` → transitions to `revealPhase`
5. **Players Reveal** → Submit actual votes with salt before deadline
6. **Manual Processing** → Anyone calls `ProcessRound` → determines winners
7. **Repeat or End** → Next round or game completion with prize distribution

## Complete Transaction Workflow

### Phase 1: Game Setup

#### 1. Start Flow Emulator
```bash
flow testnet --block-time 1s
```

#### 2. Deploy Contracts
```bash
flow project deploy --network testnet
```
**Note:** Replace `Address(0x01)` with actual deployed contract address in all transactions

#### 3. Create New Game
```bash
flow transactions send cadence/transactions/CreateGame.cdc \
  "Is the sky blue?" 10.0 0x206a0f93916f5d8f \
  --network testnet --signer nine-account
```
**Result:** Game created and starts immediately in `commitPhase` state
**Cost:** Creator pays entry fee (10 FLOW) but doesn't join automatically

#### 4. Set Commit Deadline (Creator Only)
```bash
# Set commit deadline to 15 minutes (900 seconds) from now
flow transactions send cadence/transactions/SetCommitDeadline.cdc \
  1 900.0 0x206a0f93916f5d8f \
  --network testnet --signer nine-account
```
**Result:** Players see countdown timer and deadline enforcement
**Authorization:** Only the game creator can set deadlines

#### 5. Set Reveal Deadline (Creator Only)
```bash
# Set reveal deadline to 10 minutes (600 seconds) from now
flow transactions send cadence/transactions/SetRevealDeadline.cdc \
  1 600.0 0x206a0f93916f5d8f \
  --network testnet --signer nine-account
```
**Result:** Reveal phase will have 10-minute deadline when active

### Phase 2: Player Participation

#### 6. Players Join Game (Round 1 Only)
```bash
# Player 1 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  1 0x206a0f93916f5d8f \
  --network testnet --signer one-account

# Player 2 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  1 0x206a0f93916f5d8f \
  --network testnet --signer two-account

# Player 3 joins  
flow transactions send cadence/transactions/JoinGame.cdc \
  1 0x206a0f93916f5d8f \
  --network testnet --signer three-account

# Player 4 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  1 0x206a0f93916f5d8f \
  --network testnet --signer four-account

# Player 5 joins
flow transactions send cadence/transactions/JoinGame.cdc \
  1 0x206a0f93916f5d8f \
  --network testnet --signer five-account
```
**Requirements:** Must join during Round 1 while in `commitPhase`, pay entry fee (10 FLOW each)

#### 7. Players Submit Commit Hashes
Generate commit hashes using salt generation, then submit:

```bash
# Player 1 commits (example hash for vote=true, salt="mysalt123")
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "77dcfad4d6c49e9e1d65b5b8b767bc9dc608f17b966d45109619d2750b646453" 0x206a0f93916f5d8f \
  --network testnet --signer one-account

# Player 2 commits (vote=false)
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567" 0x206a0f93916f5d8f \
  --network testnet --signer two-account

# Player 3 commits (vote=false)
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "b2c3d4e5f67890123456789012345678901234567890123456789012345678" 0x206a0f93916f5d8f \
  --network testnet --signer three-account

# Player 4 commits (vote=true)
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "c3d4e5f678901234567890123456789012345678901234567890123456789" 0x206a0f93916f5d8f \
  --network testnet --signer four-account

# Player 5 commits (vote=false)
flow transactions send cadence/transactions/SubmitCommit.cdc \
  1 "d4e5f67890123456789012345678901234567890123456789012345678901" 0x206a0f93916f5d8f \
  --network testnet --signer five-account
```
**Requirements:** Must commit before deadline, hash must be 64 characters (SHA3-256)

### Phase 3: Manual Phase Transitions

#### 8. Manual Transition to Reveal Phase
Anyone can trigger the phase transition:
```bash
flow transactions send cadence/transactions/EndCommitPhase.cdc \
  1 0x206a0f93916f5d8f \
  --network testnet --signer nine-account
```
**Result:** Game immediately transitions to `revealPhase` state
**Authorization:** Anyone can call this (not just creator)

#### 9. Players Reveal Votes
```bash
# Player 1 reveals (vote=true, salt="mysalt123")
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 true "mysalt123" 0x206a0f93916f5d8f \
  --network testnet --signer one-account

# Player 2 reveals (vote=false, salt="salt456")
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 false "salt456" 0x206a0f93916f5d8f \
  --network testnet --signer two-account

# Player 3 reveals (vote=false, salt="salt789")
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 false "salt789" 0x206a0f93916f5d8f \
  --network testnet --signer three-account

# Player 4 reveals (vote=true, salt="saltabc")  
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 true "saltabc" 0x206a0f93916f5d8f \
  --network testnet --signer four-account

# Player 5 reveals (vote=false, salt="saltdef")
flow transactions send cadence/transactions/SubmitReveal.cdc \
  1 false "saltdef" 0x206a0f93916f5d8f \
  --network testnet --signer five-account
```
**Requirements:** Vote and salt must match original commitment

#### 10. Manual Round Processing
Anyone can process the round when ready:
```bash
flow transactions send cadence/transactions/ProcessRound.cdc \
  1 0x206a0f93916f5d8f \
  --network testnet --signer nine-account
```
**Result:** Round processed, minority voters advance OR game ends with prize distribution
**Authorization:** Anyone can call this

### Phase 4: Next Round (If Game Continues)

If more than 2 players remain, the game automatically starts a new round in `commitPhase` state. Repeat steps 4-10:

1. **Set new deadlines** (creator only)
2. **Remaining players commit** (no new joining allowed)
3. **Manual transition to reveal**
4. **Remaining players reveal**  
5. **Manual round processing**

## Monitoring Commands

### Check Game Status
```bash
# Comprehensive game info with human-readable times
flow scripts execute cadence/scripts/GetGameInfo.cdc 1 0x206a0f93916f5d8f --network testnet

# Current phase and timing
flow scripts execute cadence/scripts/GetCurrentPhase.cdc 1 0x206a0f93916f5d8f --network testnet 

# Specific player status
flow scripts execute cadence/scripts/GetPlayerStatus.cdc 1 0x206a0f93916f5d8f 0x73c003cd6de60fd4 --network testnet

# Round history and analytics
flow scripts execute cadence/scripts/GetRoundHistory.cdc 1 --network testnet

# Game statistics
flow scripts execute cadence/scripts/GetGameStats.cdc 1 --network testnet
```

### Human-Readable Time Display
The game shows exact dates and times:

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

## Testing Scenarios

### Scenario 1: Complete Game Flow with Manual Control
1. **Creator**: Creates game → sets deadlines
2. **Players**: Join game → submit commits
3. **Manual Control**: Anyone calls EndCommitPhase → transitions to reveal
4. **Players**: Submit reveals
5. **Manual Control**: Anyone calls ProcessRound → determines winners
6. **Result**: Minority voters advance, majority eliminated
7. **Repeat**: Until ≤2 players remain, then prizes distributed

### Scenario 2: Elimination Testing
**Setup**: 5 players vote 3 YES, 2 NO
**Result**: 2 NO voters advance (minority), 3 YES voters eliminated
**Prize**: 2 remaining players split ~49 FLOW (after 2% platform fee)

### Scenario 3: Edge Cases
- **Late joining**: Try joining after Round 1 (should fail)
- **No reveal**: Commit but don't reveal (player eliminated)
- **Wrong salt**: Reveal with wrong salt (transaction fails)
- **Double commit**: Try committing twice (should fail)
- **Early transition**: Try EndCommitPhase before commits (works - testing flexibility)

### Scenario 4: Manual Control Testing
**Test immediate transitions**:
```bash
# End commit phase immediately after creation (testing)
flow transactions send cadence/transactions/EndCommitPhase.cdc 1 0x206a0f93916f5d8f --network testnet

# Process round immediately after reveals
flow transactions send cadence/transactions/ProcessRound.cdc 1 0x206a0f93916f5d8f --network testnet
```
**Result**: Full control over timing - perfect for testing scenarios

## State Machine Reference

| State | Description | Who Can Act | Manual Trigger |
|-------|-------------|-------------|----------------|
| `commitPhase` | Players can join (Round 1) and submit commits | Players | `EndCommitPhase.cdc` |
| `revealPhase` | Players reveal their votes | Players | `ProcessRound.cdc` |
| `processingRound` | Processing round results | Contract | Automatic → `commitPhase` OR `completed` |
| `completed` | Game finished, prizes distributed | No one | Final state |

## Expected Output Example

**Round 1 Results:**
- **5 players joined**: 50 FLOW total pool
- **Votes**: 3 YES, 2 NO → NO is minority  
- **Survivors**: 2 players (NO voters)
- **Platform fee**: 1 FLOW (2% total)
- **Prize per winner**: ~24.5 FLOW each

## Fee Structure (Updated)

- **Total fees**: 2% of prize pool (reduced from 3%!)
- **Platform fee**: 2% → Platform recipient  
- **Storage costs**: Covered by platform fee (negligible)

## Manual Control Benefits

- ✅ **Full Control**: Trigger transitions exactly when needed
- ✅ **Perfect for Testing**: No waiting for timers
- ✅ **Flexible Timing**: Test edge cases easily
- ✅ **Lower Fees**: 2% instead of 3%
- ✅ **Simpler System**: No scheduling complexity
- ✅ **Anyone Can Trigger**: Not just creator (democratized)

## Important Notes

- ✅ **Creator sets deadlines** - Only creators can set commit/reveal deadlines
- ✅ **Anyone triggers transitions** - Any account can call EndCommitPhase/ProcessRound
- ✅ **Commit-reveal voting** - Prevents vote manipulation
- ✅ **Deadline enforcement** - Votes rejected after deadlines automatically
- ✅ **Manual control** - Perfect for prototyping and testing
- ✅ **Contract address**: Replace Address(0x01) with deployed address

## Troubleshooting

| Error | Cause | Solution |
|-------|--------|----------|
| "Game must be in commit phase" | Wrong game state | Check current phase with GetCurrentPhase script |
| "Player not eligible to commit" | Player not joined or eliminated | Check player status with GetPlayerStatus script |
| "Commit deadline has passed" | Submitted after deadline | Check deadlines with GetGameInfo script |
| "Reveal does not match commitment" | Wrong vote or salt | Use exact same vote and salt from commit generation |
| "Game not found" | Wrong game ID | Check existing games with GetGamesPage script |
| "Could not borrow game manager" | Wrong contract address | Update Address(0x01) with deployed address |

## Contract Redeployment Note

Since we removed scheduled transactions and storage fees, you must **redeploy the contract** with:
- 2% fee structure (instead of 3%)
- Manual control transactions (EndCommitPhase, ProcessRound)
- Simplified fee logic

This provides a much cleaner, more controllable testing environment!