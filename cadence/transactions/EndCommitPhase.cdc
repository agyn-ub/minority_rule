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
        
        // End commit phase and start reveal phase
        game.endCommitPhase()
    }
    
    execute {
        log("Commit phase ended for game ".concat(gameId.toString()))
        log("Reveal phase started - players can now reveal their votes")
    }
}