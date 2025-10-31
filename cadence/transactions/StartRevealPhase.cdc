import MinorityRuleGame from "MinorityRuleGame"

// FORTE CALLBACK TRANSACTION
// This transaction is called by Forte scheduler when commit deadline is reached
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
        
        // Start reveal phase (called by Forte scheduler when commit deadline reached)
        game.startRevealPhase()
        
        log("🔄 FORTE SCHEDULER: Reveal phase started for game ".concat(gameId.toString()))
        log("Players can now reveal their votes")
    }
}