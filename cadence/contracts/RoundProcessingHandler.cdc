import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"
import MinorityRuleGame from "MinorityRuleGame"
import FlowTransactionScheduler from "FlowTransactionScheduler"
import FlowTransactionSchedulerUtils from "FlowTransactionSchedulerUtils"

// Handler contract for scheduled round processing using Flow's scheduled transactions
access(all) contract RoundProcessingHandler {

    // Events
    access(all) event RoundScheduled(gameId: UInt64, executeAt: UFix64, scheduledId: UInt64)
    access(all) event RoundProcessed(gameId: UInt64, round: UInt8)
    
    // Storage paths for handler
    access(all) let HandlerStoragePath: StoragePath
    access(all) let HandlerPublicPath: PublicPath
    
    // Handler resource that implements scheduled transaction execution
    access(all) resource Handler {
        access(all) let gameId: UInt64
        access(all) let contractAddress: Address
        
        // Function called by scheduled transaction system
        access(FlowTransactionScheduler.Execute) fun execute() {
            // Get the game manager
            let gameManager = getAccount(self.contractAddress)
                .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
                ?? panic("Could not borrow game manager")
            
            // Get the game
            let game = gameManager.borrowGame(gameId: self.gameId)
                ?? panic("Game not found")
            
            // Process the round
            let currentRound = game.currentRound
            game.processRound()
            
            emit RoundProcessed(gameId: self.gameId, round: currentRound)
            
            // Schedule next round if game continues
            if game.state == MinorityRuleGame.GameState.votingOpen && game.schedulingVault.balance >= 0.01 {
                // Extract fee for next scheduling
                let fee <- game.schedulingVault.withdraw(amount: 0.01)
                
                // Schedule next round
                RoundProcessingHandler.scheduleRound(
                    gameId: self.gameId,
                    executeAt: game.roundDeadline,
                    paymentVault: <- fee,
                    contractAddress: self.contractAddress
                )
            }
        }
        
        init(gameId: UInt64, contractAddress: Address) {
            self.gameId = gameId
            self.contractAddress = contractAddress
        }
    }
    
    // Schedule a round processing
    access(all) fun scheduleRound(
        gameId: UInt64, 
        executeAt: UFix64,
        paymentVault: @{FungibleToken.Vault},
        contractAddress: Address
    ): UInt64 {
        // Create handler for this scheduled transaction
        let handler <- create Handler(gameId: gameId, contractAddress: contractAddress)
        
        // Calculate fees (simplified - in production use estimate functions)
        let effort: UInt64 = 1000
        let priority: UInt8 = 1
        
        // Schedule the transaction
        let scheduledId = FlowTransactionScheduler.scheduleTransaction(
            timestamp: executeAt,
            handler: <- handler,
            feePaymentVault: <- paymentVault,
            effort: effort,
            priority: priority,
            test: nil
        )
        
        emit RoundScheduled(gameId: gameId, executeAt: executeAt, scheduledId: scheduledId)
        
        return scheduledId
    }
    
    init() {
        self.HandlerStoragePath = /storage/RoundProcessingHandler
        self.HandlerPublicPath = /public/RoundProcessingHandler
    }
}