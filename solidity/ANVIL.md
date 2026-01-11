# Anvil Local Development Guide

This guide covers local development using Anvil (Foundry's local Ethereum testnet).

## Quick Start

### 1. Start Anvil

```bash
anvil
```

This will:
- Start a local Ethereum node at `http://localhost:8545`
- Chain ID: `31337`
- Create 10 test accounts with 10,000 ETH each
- Show private keys for testing
- Process transactions instantly

### 2. Deploy Contract

```bash
# Deploy to Anvil using test account
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url http://localhost:8545 \
  --broadcast
```

**Deployed Contract Address:** `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### 3. Anvil Test Accounts

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

## Testing Game Flow

### Complete Game Example

```bash
# Set variables
CONTRACT=0x5FbDB2315678afecb367f032d93F642f64180aa3
PLAYER1_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
PLAYER2_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

# 1. Create a game
cast send $CONTRACT \
  "createGame(string,uint256)" \
  "Will it rain tomorrow?" \
  1000000000000000000 \
  --rpc-url http://localhost:8545 \
  --private-key $PLAYER1_KEY

# 2. Set commit deadline (1 hour)
cast send $CONTRACT \
  "setCommitDeadline(uint256,uint256)" \
  1 3600 \
  --rpc-url http://localhost:8545 \
  --private-key $PLAYER1_KEY

# 3. Players join
cast send $CONTRACT \
  "joinGame(uint256)" \
  1 \
  --value 1ether \
  --rpc-url http://localhost:8545 \
  --private-key $PLAYER1_KEY

cast send $CONTRACT \
  "joinGame(uint256)" \
  1 \
  --value 1ether \
  --rpc-url http://localhost:8545 \
  --private-key $PLAYER2_KEY

# 4. Generate commit hashes
SALT1=0xe6ce4fe93488b043608824fc61a7c8615b0c72e06aad895a5468e3bb51ca1a4f
SALT2=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef

# For true vote: concatenate 0x01 + salt (without 0x prefix)
DATA1=0x01$(echo $SALT1 | cut -c3-)
COMMIT1=$(cast keccak $DATA1)

# For false vote: concatenate 0x00 + salt (without 0x prefix)
DATA2=0x00$(echo $SALT2 | cut -c3-)
COMMIT2=$(cast keccak $DATA2)

# 5. Submit commits
cast send $CONTRACT \
  "submitCommit(uint256,bytes32)" \
  1 $COMMIT1 \
  --rpc-url http://localhost:8545 \
  --private-key $PLAYER1_KEY

cast send $CONTRACT \
  "submitCommit(uint256,bytes32)" \
  1 $COMMIT2 \
  --rpc-url http://localhost:8545 \
  --private-key $PLAYER2_KEY

# 6. Fast-forward time past commit deadline
cast rpc anvil_increaseTime 3700 --rpc-url http://localhost:8545
cast rpc anvil_mine 1 --rpc-url http://localhost:8545

# 7. Set reveal deadline
cast send $CONTRACT \
  "setRevealDeadline(uint256,uint256)" \
  1 3600 \
  --rpc-url http://localhost:8545 \
  --private-key $PLAYER1_KEY

# 8. Reveal votes
cast send $CONTRACT \
  "submitReveal(uint256,bool,bytes32)" \
  1 true $SALT1 \
  --rpc-url http://localhost:8545 \
  --private-key $PLAYER1_KEY

cast send $CONTRACT \
  "submitReveal(uint256,bool,bytes32)" \
  1 false $SALT2 \
  --rpc-url http://localhost:8545 \
  --private-key $PLAYER2_KEY

# 9. Process round (completes game with 2 players)
cast send $CONTRACT \
  "processRound(uint256)" \
  1 \
  --rpc-url http://localhost:8545 \
  --private-key $PLAYER1_KEY

# 10. Get game info
cast call $CONTRACT \
  "getGameInfo(uint256)" \
  1 \
  --rpc-url http://localhost:8545
```

## Anvil Time Manipulation

```bash
# Increase time by N seconds
cast rpc anvil_increaseTime <seconds> --rpc-url http://localhost:8545

# Mine N blocks
cast rpc anvil_mine <blocks> --rpc-url http://localhost:8545

# Set next block timestamp
cast rpc anvil_setNextBlockTimestamp <timestamp> --rpc-url http://localhost:8545

# Reset fork to latest block (if using fork mode)
cast rpc anvil_reset --rpc-url http://localhost:8545
```

## Connect MetaMask to Anvil

1. Open MetaMask
2. Add Network:
   - Network Name: `Localhost`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency: `ETH`
3. Import test account using private key from Anvil output
4. You'll have 10,000 ETH instantly!

## Benefits vs Testnet

| Feature | Anvil | Base Sepolia Testnet |
|---------|-------|---------------------|
| Cost | FREE | FREE (but need faucet) |
| Speed | Instant | ~2 seconds |
| Faucet needed | No | Yes |
| Internet required | No | Yes |
| Redeploy speed | Instant | ~2 seconds |
| State reset | Easy | Impossible |
| Test accounts | 10 with 10k ETH | Need to fund |

## Common Commands

```bash
# Check balance
cast balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --rpc-url http://localhost:8545

# Get current block number
cast block-number --rpc-url http://localhost:8545

# Get transaction receipt
cast receipt <tx_hash> --rpc-url http://localhost:8545

# Call view function
cast call $CONTRACT "getGameInfo(uint256)" 1 --rpc-url http://localhost:8545

# Send transaction
cast send $CONTRACT "functionName(args)" args --rpc-url http://localhost:8545 --private-key $KEY
```

## Next Steps

After testing locally on Anvil:

1. **Build Indexer** - Point to `http://localhost:8545`
2. **Build Frontend** - Use Chain ID `31337`
3. **Integration Testing** - Test full flow
4. **Deploy to Base Sepolia** - Once everything works locally
5. **Deploy to Base Mainnet** - After testnet validation

## Troubleshooting

**Anvil not starting?**
- Make sure no other process is using port 8545
- Kill existing Anvil: `pkill anvil`

**Transaction failing?**
- Check you're using correct private key
- Verify contract address
- Make sure Anvil is running

**Need to reset?**
- Stop Anvil (Ctrl+C)
- Restart it - state resets automatically
- Redeploy contract
