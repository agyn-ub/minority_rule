import "MinorityRuleGame"

transaction(gameId: UInt64, commitHash: String, vote: Bool, salt: String) {
    
    let gameManager: &{MinorityRuleGame.GameManagerPublic}
    let game: &MinorityRuleGame.Game
    
    prepare(signer: auth(Storage, Capabilities) &Account) {
        // Borrow the game manager from the contract account
        self.gameManager = getAccount(0xf63159eb10f911cd)
            .capabilities.borrow<&{MinorityRuleGame.GameManagerPublic}>(MinorityRuleGame.GamePublicPath)
            ?? panic("Could not borrow game manager from public capability")
        
        // Get the game
        self.game = self.gameManager.borrowGame(gameId: gameId)
            ?? panic("Game not found")
    }
    
    execute {
        // Test the commit-reveal hash calculation
        let result = self.game.testCommitReveal(
            commitHash: commitHash, 
            vote: vote, 
            salt: salt
        )
        
        log("=== COMMIT-REVEAL TEST ===")
        log("Expected Hash:    ".concat(result["expectedHash"]!))
        log("Calculated Hash:  ".concat(result["calculatedHash"]!))
        log("Vote:             ".concat(result["vote"]!))
        log("Salt:             ".concat(result["salt"]!))
        log("Combined String:  ".concat(result["combinedString"]!))
        log("Matches:          ".concat(result["matches"]!))
        log("Algorithm:        ".concat(result["algorithm"]!))
        log("Vote Length:      ".concat(result["voteStringLength"]!))
        log("Salt Length:      ".concat(result["saltLength"]!))
        log("Combined Length:  ".concat(result["combinedLength"]!))
        log("=========================")
        
        if result["matches"]! == "true" {
            log("✅ HASHES MATCH! This vote/salt combination is correct.")
        } else {
            log("❌ HASHES DON'T MATCH! Try different vote or salt.")
        }
    }
}