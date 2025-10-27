import MinorityRuleGame from "../contracts/MinorityRuleGame.cdc"

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
        // Get and process the round
        let game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        game.processRound()
        
        log("Round processed for game ".concat(gameId.toString()))
    }
}