import MinorityRuleGame from "MinorityRuleGame"

transaction(gameId: UInt64, durationSeconds: UFix64) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Borrow the game manager from the contract account
        self.gameManager = getAccount(0xb69240f6be3e34ca)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Get the game
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
    }
    
    execute {
        // Set commit deadline for the game (duration in seconds from now)
        self.game.setCommitDeadline(durationSeconds: durationSeconds)
        
        log("Commit deadline set for game ".concat(gameId.toString())
            .concat(" to ").concat(durationSeconds.toString()).concat(" seconds from now"))
    }
}