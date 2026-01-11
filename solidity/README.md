# Minority Rule Game - Solidity (Base Chain)

A fully on-chain game where players answer yes/no questions, and only those in the minority advance to the next round. The last 1-2 players split the prize pool.

## Features

- **Commit-Reveal Voting**: Prevents front-running using cryptographic commitments
- **Fully On-Chain**: All player data and game state stored on-chain
- **Manual Round Control**: Game creator sets deadlines for each phase
- **2% Platform Fee**: Sustainable fee structure that covers gas costs
- **Native ETH**: Simple prize pool using native currency

## Game Flow

1. **Creator** creates game and sets entry fee (does NOT automatically join)
2. **Round 1 - Join & Commit Phase**:
   - Players (including creator if they want to play) join by paying entry fee (only during Round 1)
   - All players commit vote hashes: `keccak256(vote, salt)`
   - Creator sets commit deadline
3. **Reveal Phase**:
   - Creator sets reveal deadline after commit phase ends
   - Players reveal their votes with original vote + salt
   - Smart contract verifies reveals match commitments
4. **Round Processing**:
   - Minority vote is determined (fewer yes or fewer no)
   - Only minority voters advance to next round
   - Game ends when ≤2 players remain
5. **Prize Distribution**:
   - 2% platform fee deducted
   - Remaining prize split equally among winners

## Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- ETH on Base Sepolia testnet ([faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet))
- Base Sepolia RPC URL (free from [Alchemy](https://www.alchemy.com/) or use public: `https://sepolia.base.org`)

## Installation

```bash
# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test -vv
```

## Configuration

1. Copy environment template:
```bash
cp .env.example .env
```

2. Edit `.env` with your values:
```
PRIVATE_KEY=your_private_key_here
PLATFORM_RECIPIENT=0xYourPlatformFeeAddress  # Optional, defaults to deployer
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key  # For verification
```

## Deployment

### Deploy to Base Sepolia

```bash
# Load environment variables
source .env

# Deploy contract
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url base_sepolia \
  --broadcast \
  --verify

# The deployed contract address will be printed in the output
```

### Deploy to Base Mainnet

Update `.env` with Base mainnet RPC and deploy:

```bash
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url base \
  --broadcast \
  --verify
```

## Usage Examples

### Using Cast (Foundry CLI)

```bash
# Set contract address
CONTRACT=0xYourDeployedContractAddress

# Create a game (set entry fee to 1 ETH)
cast send $CONTRACT \
  "createGame(string,uint256)" \
  "Is the sky blue?" \
  1000000000000000000 \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY

# Join a game (gameId 1, pay 1 ETH entry fee)
cast send $CONTRACT \
  "joinGame(uint256)" \
  1 \
  --value 1ether \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY

# Set commit deadline (3600 seconds = 1 hour)
cast send $CONTRACT \
  "setCommitDeadline(uint256,uint256)" \
  1 3600 \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY

# Generate commit hash (vote=true, salt=random bytes32)
# In your application, generate a random salt and store it!
SALT=0xe6ce4fe93488b043608824fc61a7c8615b0c72e06aad895a5468e3bb51ca1a4f
COMMIT_HASH=$(cast keccak $(cast abi-encode "f(bool,bytes32)" true $SALT))

# Submit commit
cast send $CONTRACT \
  "submitCommit(uint256,bytes32)" \
  1 $COMMIT_HASH \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY

# After commit deadline passes, set reveal deadline
cast send $CONTRACT \
  "setRevealDeadline(uint256,uint256)" \
  1 3600 \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY

# Reveal vote
cast send $CONTRACT \
  "submitReveal(uint256,bool,bytes32)" \
  1 true $SALT \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY

# Process round (after reveal deadline or all reveals submitted)
cast send $CONTRACT \
  "processRound(uint256)" \
  1 \
  --rpc-url base_sepolia \
  --private-key $PRIVATE_KEY

# Get game info
cast call $CONTRACT \
  "getGameInfo(uint256)" \
  1 \
  --rpc-url base_sepolia
```

### Using Ethers.js/Viem (Frontend Integration)

```javascript
// Example with ethers.js v6
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const signer = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(contractAddress, abi, signer);

// Create game (set entry fee to 1 ETH)
const tx = await contract.createGame(
  "Is the sky blue?",
  ethers.parseEther("1")  // 1 ETH entry fee
);
await tx.wait();

// Generate commit hash
const vote = true;
const salt = ethers.randomBytes(32);
const commitHash = ethers.keccak256(
  ethers.AbiCoder.defaultAbiCoder().encode(
    ['bool', 'bytes32'],
    [vote, salt]
  )
);

// Submit commit
await contract.submitCommit(gameId, commitHash);

// Later, reveal
await contract.submitReveal(gameId, vote, salt);
```

## Testing

```bash
# Run all tests
forge test

# Run with verbosity (shows traces)
forge test -vvv

# Run specific test
forge test --match-test test_FullGameFlowWithFivePlayers -vvvv

# Gas report
forge test --gas-report
```

## Contract Architecture

### MinorityRuleGame.sol

Main contract containing:

- **Game struct**: Stores all game state on-chain
- **GameState enum**: `ZeroPhase`, `CommitPhase`, `RevealPhase`, `Completed`
- **Commit-Reveal**: Cryptographic vote hiding using keccak256
- **Round Processing**: Automatic minority determination and player elimination
- **Prize Distribution**: Automatic payouts on game completion
- **Event-based Vote History**: Vote history reconstructed from `VoteRevealed` events via indexer (not stored on-chain for gas efficiency)

### Key Functions

- `createGame()`: Create new game with entry fee
- `joinGame()`: Join during Round 1
- `setCommitDeadline()`: Creator sets commit phase deadline
- `submitCommit()`: Submit vote commitment
- `setRevealDeadline()`: Creator sets reveal phase deadline
- `submitReveal()`: Reveal vote with salt (emits `VoteRevealed` event)
- `processRound()`: Process round and advance game
- `getGameInfo()`: Get all game data

**Note**: Vote history is tracked via `VoteRevealed` events, which contain gameId, round, player, and vote. Use an indexer to reconstruct complete vote history off-chain.

## Gas Costs (Estimated)

| Operation | Gas Cost | ETH Cost (20 gwei) |
|-----------|----------|-------------------|
| Create Game | ~165k | ~$0.10 |
| Join Game | ~70k | ~$0.04 |
| Submit Commit | ~70k | ~$0.04 |
| Submit Reveal | ~140k | ~$0.08 |
| Process Round | ~120k | ~$0.07 |

*Costs on Base are much lower due to low gas prices (~0.1-1 gwei typical)*

## Security Features

- ✅ Commit-reveal prevents front-running
- ✅ Reentrancy protection via checks-effects-interactions pattern
- ✅ No external calls before state updates
- ✅ Integer overflow protection (Solidity 0.8+)
- ✅ Input validation on all functions
- ✅ Custom errors for gas efficiency

## Differences from Flow Version

| Feature | Flow (Cadence) | Base (Solidity) |
|---------|---------------|-----------------|
| Language | Cadence | Solidity ^0.8.23 |
| Token | FLOW | ETH (native) |
| Scheduling | FlowTransactionScheduler | Manual (creator-controlled) |
| Storage Model | Resources | Structs + Mappings |
| Gas Costs | Minimal (~0.001 FLOW) | Higher but manageable |
| Development | Flow CLI | Foundry |

## Future Enhancements

- [ ] Integrate Chainlink Automation for automatic round processing
- [ ] Support ERC20 tokens (USDC, USDT) for stable prize pools
- [ ] Multi-game factory pattern for gas optimization
- [ ] Leaderboard tracking across games
- [ ] Time-weighted entry fees (early birds get discounts)

## Troubleshooting

### "Stack too deep" error
Already configured with `via_ir = true` in foundry.toml. If you modify the contract and get this error, ensure the optimizer is enabled.

### Tests failing
```bash
# Clean and rebuild
forge clean
forge build
forge test
```

### Deployment fails
- Ensure you have enough ETH on Base Sepolia
- Check RPC URL is correct
- Verify PRIVATE_KEY format (no 0x prefix needed)

## Resources

- [Base Docs](https://docs.base.org/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
- [Basescan](https://sepolia.basescan.org/)

## License

MIT
