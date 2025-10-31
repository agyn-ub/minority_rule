import MinorityRuleGame from "MinorityRuleGame"

transaction(gameId: UInt64, vote: Bool, salt: String) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let playerAddress: Address
    
    prepare(signer: &Account) {
        self.playerAddress = signer.address
        
        // Get the contract account
        let contractAccount = getAccount(0x44a19c1836c03e74)
        
        // Borrow the game manager from public path
        self.gameManager = contractAccount
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public path")
    }
    
    execute {
        // Get the game
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Submit the vote reveal (only works in revealPhase)
        game.submitReveal(player: self.playerAddress, vote: vote, salt: salt)
        
        log("Vote revealed for game ".concat(gameId.toString()))
        log("Player: ".concat(self.playerAddress.toString()))
        log("Vote: ".concat(vote ? "YES" : "NO"))
    }
}