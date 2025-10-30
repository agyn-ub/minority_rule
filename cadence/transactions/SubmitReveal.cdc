import MinorityRuleGame from "MinorityRuleGame"

transaction(gameId: UInt64, vote: Bool, salt: String) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let playerAddress: Address
    
    prepare(signer: &Account) {
        self.playerAddress = signer.address
        
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
        
        // Submit the vote reveal
        game.submitReveal(player: self.playerAddress, vote: vote, salt: salt)
        
        log("Vote revealed for game ".concat(gameId.toString()).concat(": ").concat(vote ? "YES" : "NO"))
    }
}