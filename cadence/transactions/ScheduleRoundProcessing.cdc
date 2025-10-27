import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"
// ProcessRoundHandler would be imported when using FlowTransactionScheduler
// import ProcessRoundHandler from "../contracts/ProcessRoundHandler.cdc"

// This transaction manually triggers scheduling of round processing
// Note: In production, this would use FlowTransactionScheduler
transaction(gameId: UInt64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    
    prepare(signer: auth(Storage) &Account) {
        // Get the contract address (replace with actual deployed address)
        let contractAddress = Address(0x01) // TODO: Replace with actual contract address
        
        // Borrow the game manager from public capability
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
    }
    
    execute {
        // Get the game
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Get game info to check state
        let gameInfo = game.getGameInfo()
        let state = gameInfo["state"] as! UInt8? ?? 0
        
        // Only schedule if game is in voting state (1)
        if state == 1 { // GameState.votingOpen
            // In production, this would use FlowTransactionScheduler
            // For now, just log the scheduling intent
            
            log("Would schedule round processing for game "
                .concat(gameId.toString())
                .concat(" at deadline"))
            
            // Note: Actual scheduling is handled automatically by the game
            // when rounds are started or processed
        } else {
            log("Game is not in voting state, scheduling skipped")
        }
    }
}