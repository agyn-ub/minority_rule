import "MinorityRuleGame"

transaction(gameId: UInt64, contractAddress: Address) {
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Get the game manager
        let gameManager = getAccount(contractAddress)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Get the game
        let game = gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
        
        // Process the round
        game.processRound()
    }
    
    execute {
        log("Round processed for game ".concat(gameId.toString()))
        log("Check game state to see if game ended or next round started")
    }
}