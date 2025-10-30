import MinorityRuleGame from "MinorityRuleGame"

// Forte callback transaction: Activate commit deadline and start accepting commits
transaction(gameId: UInt64, duration: UFix64) {
    
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
        
        // Activate commit deadline (called by Forte scheduler)
        game.activateCommitDeadline(duration: duration)
        
        log("Commit deadline activated for game "
            .concat(gameId.toString())
            .concat(" - Players can now submit commits"))
    }
}