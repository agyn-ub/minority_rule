import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

transaction(gameId: UInt64) {
    
    let gameManager: &MinorityRuleGame.GameManager
    
    prepare(signer: auth(Storage) &Account) {
        // Borrow the game manager
        self.gameManager = MinorityRuleGame.getAccount()
            .storage.borrow<&MinorityRuleGame.GameManager>(from: MinorityRuleGame.GameStoragePath)
            ?? panic("Could not borrow game manager")
    }
    
    execute {
        // Get and process the round
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        game.processRound()
        
        log("Round processed for game ".concat(gameId.toString()))
    }
}