import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"
import MinorityRuleGame from "MinorityRuleGame"

// Handler contract for scheduled round processing
access(all) contract ProcessRoundHandler {

    // Events
    access(all) event RoundProcessingScheduled(gameId: UInt64, executeAt: UFix64, txId: UInt64)
    access(all) event RoundProcessed(gameId: UInt64, round: UInt8)
    access(all) event SchedulingFailed(gameId: UInt64, reason: String)

    // Contract storage
    access(all) let contractAddress: Address

    // Process a specific game round (called by scheduled transaction)
    access(all) fun processGameRound(gameId: UInt64) {
        // Get the game manager
        let gameManager = getAccount(self.contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager")
        
        // Get the game
        let game = gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Process the round
        let currentRound = game.currentRound
        game.processRound()
        
        emit RoundProcessed(gameId: gameId, round: currentRound)
    }
    
    // Schedule round processing for a game
    access(all) fun scheduleNextRound(
        gameId: UInt64, 
        executeAt: UFix64,
        paymentVault: @{FungibleToken.Vault}
    ): UInt64 {
        // For testnet scheduled transactions, we would normally call FlowTransactionScheduler
        // For now, destroy the payment vault (in production it would go to scheduler)
        destroy paymentVault
        
        let txId = UInt64(getCurrentBlock().height)
        
        emit RoundProcessingScheduled(
            gameId: gameId, 
            executeAt: executeAt,
            txId: txId
        )
        
        return txId
    }
    
    init() {
        // Store the MinorityRuleGame contract address (same as deployer in this case)
        self.contractAddress = self.account.address
    }
}