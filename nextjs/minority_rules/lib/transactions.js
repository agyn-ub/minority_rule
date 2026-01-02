"use client";
import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types";
import { CONTRACT_ADDRESS, DEFAULT_TX_LIMIT } from "./flow-config";

// Transaction states
export const TX_STATES = {
  IDLE: 'idle',
  SUBMITTING: 'submitting', 
  SUBMITTED: 'submitted',
  SEALING: 'sealing',
  SEALED: 'sealed',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Custom transaction executor
export const executeTransaction = async (cadence, args = [], options = {}) => {
  const {
    limit = DEFAULT_TX_LIMIT,
    onStateChange = () => {},
    onSuccess = () => {},
    onError = () => {}
  } = options;

  try {
    // Update state: Submitting
    onStateChange(TX_STATES.SUBMITTING);

    // Submit transaction
    const transactionId = await fcl.mutate({
      cadence,
      args: (arg, t) => args, // Convert pre-built args array to FCL function format
      limit
    });

    console.log("Transaction submitted:", transactionId);

    // Update state: Submitted
    onStateChange(TX_STATES.SUBMITTED, { transactionId });

    // Wait for sealing
    onStateChange(TX_STATES.SEALING, { transactionId });
    
    const sealedTx = await fcl.tx(transactionId).onceSealed();
    
    console.log("Transaction sealed:", sealedTx);

    // Update state: Sealed
    onStateChange(TX_STATES.SEALED, { transactionId, transaction: sealedTx });

    // Check for errors in transaction result
    if (sealedTx.status === 4 && sealedTx.statusCode === 0) {
      // Success
      onStateChange(TX_STATES.SUCCESS, { transactionId, transaction: sealedTx });
      onSuccess(transactionId, sealedTx);
      return { success: true, transactionId, transaction: sealedTx };
    } else {
      // Transaction failed
      const error = new Error(`Transaction failed with status code: ${sealedTx.statusCode}`);
      onStateChange(TX_STATES.ERROR, { error, transactionId, transaction: sealedTx });
      onError(error, transactionId, sealedTx);
      return { success: false, error, transactionId, transaction: sealedTx };
    }

  } catch (error) {
    console.error("Transaction error:", error);
    onStateChange(TX_STATES.ERROR, { error });
    onError(error);
    return { success: false, error };
  }
};

// Specific transaction functions
export const joinGameTransaction = async (gameId, contractAddress, options = {}) => {
  const cadence = `
    import MinorityRuleGame from 0xMinorityRuleGame
    import FungibleToken from 0xFungibleToken
    import FlowToken from 0xFlowToken

    transaction(gameId: UInt64, contractAddress: Address) {
        
        let gameManager: &{MinorityRuleGame.GameManagerPublic}
        let game: &MinorityRuleGame.Game
        let payment: @{FungibleToken.Vault}
        let player: Address
        
        prepare(signer: auth(Storage, Capabilities) &Account) {
            self.player = signer.address
            
            // Borrow the game manager from the contract account
            self.gameManager = getAccount(contractAddress)
                .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
                ?? panic("Could not borrow game manager from public capability")
            
            // Get the game
            self.game = self.gameManager.borrowGame(gameId: gameId)
                ?? panic("Game not found")
            
            // Get player's Flow token vault
            let flowVault = signer.storage.borrow<auth(FungibleToken.Withdraw) &FlowToken.Vault>(from: /storage/flowTokenVault)
                ?? panic("Could not borrow Flow token vault")
            
            // Withdraw entry fee
            self.payment <- flowVault.withdraw(amount: self.game.entryFee)
        }
        
        execute {
            // Join the game (only allowed during Round 1)
            self.game.joinGame(player: self.player, payment: <- self.payment)
            
            log("Player ".concat(self.player.toString()).concat(" joined game ").concat(gameId.toString()))
        }
    }
  `;

  const args = [
    fcl.arg(parseInt(gameId), t.UInt64),
    fcl.arg(contractAddress || CONTRACT_ADDRESS, t.Address)
  ];

  return executeTransaction(cadence, args, options);
};

export const createGameTransaction = async (questionText, entryFee, contractAddress, options = {}) => {
  const cadence = `
    import MinorityRuleGame from 0xMinorityRuleGame
    import FungibleToken from 0xFungibleToken
    import FlowToken from 0xFlowToken

    transaction(questionText: String, entryFee: UFix64, contractAddress: Address) {
        
        let gameManager: &{MinorityRuleGame.GameManagerPublic}
        let gameId: UInt64
        let creator: Address
        
        prepare(signer: auth(Storage, Capabilities) &Account) {
            self.creator = signer.address
            
            // Borrow the game manager from the contract account
            self.gameManager = getAccount(contractAddress)
                .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
                ?? panic("Could not borrow game manager from public capability")
            
            // Create the game
            self.gameId = self.gameManager.createGame(
                questionText: questionText,
                entryFee: entryFee,
                creator: self.creator
            )
        }
        
        execute {
            log("Game created with ID: ".concat(self.gameId.toString()))
            log("Creator: ".concat(self.creator.toString()))
            log("Game is now ready - players can join and vote")
            log("Manual processing: Use EndCommitPhase and ProcessRound transactions when needed")
        }
    }
  `;

  const args = [
    fcl.arg(questionText, t.String),
    fcl.arg(parseFloat(entryFee).toFixed(8), t.UFix64), // Ensure decimal point for UFix64
    fcl.arg(contractAddress || CONTRACT_ADDRESS, t.Address)
  ];

  return executeTransaction(cadence, args, options);
};

export const submitVoteCommitTransaction = async (gameId, commitHash, contractAddress, options = {}) => {
  const cadence = `
    import MinorityRuleGame from 0xMinorityRuleGame

    transaction(gameId: UInt64, commitHash: String, contractAddress: Address) {
        
        let gameManager: &{MinorityRuleGame.GameManagerPublic}
        let game: &MinorityRuleGame.Game
        let player: Address
        
        prepare(signer: auth(Storage, Capabilities) &Account) {
            self.player = signer.address
            
            // Borrow the game manager from the contract account
            self.gameManager = getAccount(contractAddress)
                .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
                ?? panic("Could not borrow game manager from public capability")
            
            // Get the game
            self.game = self.gameManager.borrowGame(gameId: gameId)
                ?? panic("Game not found")
        }
        
        execute {
            // Submit vote commitment (hash of vote + salt)
            self.game.submitCommit(player: self.player, commitHash: commitHash)
            
            log("Player ".concat(self.player.toString())
                .concat(" submitted commit for game ").concat(gameId.toString())
                .concat(" with hash: ").concat(commitHash))
        }
    }
  `;

  const args = [
    fcl.arg(parseInt(gameId), t.UInt64),
    fcl.arg(commitHash, t.String),
    fcl.arg(contractAddress || CONTRACT_ADDRESS, t.Address)
  ];

  return executeTransaction(cadence, args, options);
};

export const submitVoteRevealTransaction = async (gameId, vote, salt, contractAddress, options = {}) => {
  const cadence = `
    import MinorityRuleGame from 0xMinorityRuleGame

    transaction(gameId: UInt64, vote: Bool, salt: String, contractAddress: Address) {
        
        let gameManager: &{MinorityRuleGame.GameManagerPublic}
        let game: &MinorityRuleGame.Game
        let player: Address
        
        prepare(signer: auth(Storage, Capabilities) &Account) {
            self.player = signer.address
            
            // Borrow the game manager from the contract account
            self.gameManager = getAccount(contractAddress)
                .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
                ?? panic("Could not borrow game manager from public capability")
            
            // Get the game
            self.game = self.gameManager.borrowGame(gameId: gameId)
                ?? panic("Game not found")
        }
        
        execute {
            // Submit vote reveal (actual vote + salt for verification)
            self.game.submitReveal(player: self.player, vote: vote, salt: salt)
            
            let voteText = vote ? "YES" : "NO"
            log("Player ".concat(self.player.toString())
                .concat(" revealed vote ").concat(voteText)
                .concat(" for game ").concat(gameId.toString())
                .concat(" with salt: ").concat(salt))
        }
    }
  `;

  const args = [
    fcl.arg(parseInt(gameId), t.UInt64),
    fcl.arg(vote, t.Bool),
    fcl.arg(salt, t.String),
    fcl.arg(contractAddress || CONTRACT_ADDRESS, t.Address)
  ];

  return executeTransaction(cadence, args, options);
};

export const setCommitDeadlineTransaction = async (gameId, durationSeconds, contractAddress, options = {}) => {
  const cadence = `
    import MinorityRuleGame from 0xMinorityRuleGame

    transaction(gameId: UInt64, durationSeconds: UFix64, contractAddress: Address) {
        
        let gameManager: &{MinorityRuleGame.GameManagerPublic}
        let game: &MinorityRuleGame.Game
        
        prepare(signer: auth(Storage, Capabilities) &Account) {
            self.gameManager = getAccount(contractAddress)
                .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
                ?? panic("Could not borrow game manager from public capability")
            
            self.game = self.gameManager.borrowGame(gameId: gameId)
                ?? panic("Game not found")
        }
        
        execute {
            self.game.setCommitDeadline(durationSeconds: durationSeconds)
            
            log("Commit deadline set for game ".concat(gameId.toString())
                .concat(" to ").concat(durationSeconds.toString()).concat(" seconds from now"))
        }
    }
  `;

  const args = [
    fcl.arg(parseInt(gameId), t.UInt64),
    fcl.arg(parseFloat(durationSeconds).toFixed(8), t.UFix64), // Ensure decimal point for UFix64
    fcl.arg(contractAddress || CONTRACT_ADDRESS, t.Address)
  ];

  return executeTransaction(cadence, args, options);
};

export const setRevealDeadlineTransaction = async (gameId, durationSeconds, contractAddress, options = {}) => {
  const cadence = `
    import MinorityRuleGame from 0xMinorityRuleGame

    transaction(gameId: UInt64, durationSeconds: UFix64, contractAddress: Address) {
        
        let gameManager: &{MinorityRuleGame.GameManagerPublic}
        let game: &MinorityRuleGame.Game
        
        prepare(signer: auth(Storage, Capabilities) &Account) {
            self.gameManager = getAccount(contractAddress)
                .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
                ?? panic("Could not borrow game manager from public capability")
            
            self.game = self.gameManager.borrowGame(gameId: gameId)
                ?? panic("Game not found")
        }
        
        execute {
            self.game.setRevealDeadline(durationSeconds: durationSeconds)
            
            log("Reveal deadline set for game ".concat(gameId.toString())
                .concat(" to ").concat(durationSeconds.toString()).concat(" seconds from now"))
        }
    }
  `;

  const args = [
    fcl.arg(parseInt(gameId), t.UInt64),
    fcl.arg(parseFloat(durationSeconds).toFixed(8), t.UFix64), // Ensure decimal point for UFix64
    fcl.arg(contractAddress || CONTRACT_ADDRESS, t.Address)
  ];

  return executeTransaction(cadence, args, options);
};

export const processRoundTransaction = async (gameId, contractAddress, options = {}) => {
  const cadence = `
    import MinorityRuleGame from 0xMinorityRuleGame

    transaction(gameId: UInt64, contractAddress: Address) {
        
        let gameManager: &{MinorityRuleGame.GameManagerPublic}
        
        prepare(signer: auth(Storage, Capabilities) &Account) {
            self.gameManager = getAccount(contractAddress)
                .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
                ?? panic("Could not borrow game manager from public capability")
            
            let game = self.gameManager.borrowGame(gameId: gameId)
                ?? panic("Game not found")
                
            game.processRound()
        }
        
        execute {
            log("Round processed for game ".concat(gameId.toString()))
        }
    }
  `;

  const args = [
    fcl.arg(parseInt(gameId), t.UInt64),
    fcl.arg(contractAddress || CONTRACT_ADDRESS, t.Address)
  ];

  return executeTransaction(cadence, args, options);
};