# Minority Rule Game Testing Scripts

These scripts help you quickly test your Minority Rule Game with multiple players.

## Quick Start

1. **Set the Game ID** you want to test:
   ```bash
   ./set-game-id.sh 5
   ```

2. **Make all players join** the game:
   ```bash
   ./join-all-players.sh
   ```

3. **Run a voting scenario**:
   ```bash
   ./vote-scenario-1.sh    # 4 YES vs 3 NO (NO wins)
   ./vote-scenario-2.sh    # 3 YES vs 4 NO (YES wins)  
   ./vote-tie.sh           # 3 YES vs 3 NO (tie)
   ```

4. **Or run a complete test**:
   ```bash
   ./full-game-test.sh
   ```

## Scripts Overview

### Configuration
- `test-config.sh` - Contains game ID and settings
- `set-game-id.sh [id]` - Quick way to change game ID

### Main Scripts
- `join-all-players.sh` - All 7 players join in parallel
- `vote-scenario-1.sh` - Players 1,2,3,4 vote YES; 5,6,7 vote NO
- `vote-scenario-2.sh` - Players 1,2,3 vote YES; 4,5,6,7 vote NO
- `vote-tie.sh` - Creates 3v3 tie (player 7 doesn't vote)
- `full-game-test.sh` - Complete workflow test

## Player Mapping
- Player 1: one-account
- Player 2: two-account  
- Player 3: three-account
- Player 4: four-account
- Player 5: five-account
- Player 6: six-account
- Player 7: seven-account

## Usage Tips

1. **Create a game first** using your web app
2. **Note the Game ID** from the web interface
3. **Set the Game ID**: `./set-game-id.sh [gameId]`
4. **Run join script**: `./join-all-players.sh`
5. **Run voting script**: Choose your scenario
6. **Check results** in your web app

## Expected Results

- **Scenario 1**: 4 YES vs 3 NO → NO voters (players 5,6,7) advance
- **Scenario 2**: 3 YES vs 4 NO → YES voters (players 1,2,3) advance  
- **Tie**: Contract handles tie logic (check your implementation)

All scripts run players in parallel for faster testing!