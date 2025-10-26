import FungibleToken from "FungibleToken"
import FlowToken from "FlowToken"
import MinorityRuleGame from "./MinorityRuleGame.cdc"

// Handler contract for scheduled round processing
access(all) contract ProcessRoundHandler {

    // Events
    access(all) event RoundProcessingScheduled(gameId: UInt64, executeAt: UFix64)
    access(all) event RoundProcessed(gameId: UInt64, round: UInt8)
    access(all) event SchedulingFailed(gameId: UInt64, reason: String)

    // Process a specific game round (called by scheduled transaction)
    access(all) fun processGameRound(gameId: UInt64) {
        // Get the game manager
        let gameManager = MinorityRuleGame.getAccount()
            .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
            ?? panic("Could not borrow game manager")
        
        // Get the game
        let game = gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Process the round
        game.processRound()
        
        emit RoundProcessed(gameId: gameId, round: game.currentRound)
        
        // Note: The processRound function will handle scheduling the next round
        // if the game continues
    }
    
    // Schedule round processing for a game
    access(all) fun scheduleNextRound(game: &MinorityRuleGame.Game): UInt64? {
        // Check if scheduling fund has enough balance
        if game.schedulingVault.balance < game.processingFeePerRound {
            emit SchedulingFailed(gameId: game.gameId, reason: "Insufficient scheduling funds")
            return nil
        }
        
        // Note: In actual implementation, this would interact with FlowTransactionScheduler
        // For now, we'll emit an event to indicate scheduling
        emit RoundProcessingScheduled(
            gameId: game.gameId, 
            executeAt: game.roundDeadline + 60.0  // 1 minute after deadline
        )
        
        // Return a mock transaction ID (in real implementation, this would be from FlowTransactionScheduler)
        return UInt64(getCurrentBlock().height)
    }
}