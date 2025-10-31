import MinorityRuleGame from "MinorityRuleGame"

// Forte callback transaction: Process round results and advance to next round or end game
transaction(gameId: UInt64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    
    prepare(signer: &Account) {
        // Get the contract account
        let contractAccount = getAccount(0x0cba6f974b0aa625)
        
        // Borrow the game manager from public path
        self.gameManager = contractAccount
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public path")
    }
    
    execute {
        // Get the game
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Process round and advance (called by Forte scheduler when reveal deadline reached)
        game.processRound()
        
        log("Round processed for game "
            .concat(gameId.toString())
            .concat(" - Check game state for next steps"))
    }
}