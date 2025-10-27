import ProcessRoundHandler from "../contracts/ProcessRoundHandler.cdc"

// Transaction to manually trigger round processing via ProcessRoundHandler
transaction(gameId: UInt64) {
    
    execute {
        // Call the process function directly
        ProcessRoundHandler.processGameRound(gameId: gameId)
        
        log("Triggered round processing for game ".concat(gameId.toString()))
    }
}