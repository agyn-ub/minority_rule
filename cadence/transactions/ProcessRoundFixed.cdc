import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

transaction(gameId: UInt64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Use two-account address where the working contract is deployed
        let contractAddress = Address(0x1aee0aa4d20eac44)
        
        // Borrow the game manager from public capability
        self.gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Get reference to the game
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Could not borrow game")
    }
    
    execute {
        // Process the round
        self.game.processRound()
        
        log("Round processed for game ".concat(self.game.gameId.toString()))
    }
}